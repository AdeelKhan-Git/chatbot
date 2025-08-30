
import time,re
import threading
from django.db import connections
from .embedding import embeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from chatapi.models import KnowledgeBase,ChatMessage
import logging
from langchain.memory import ConversationBufferMemory
from langchain.schema import HumanMessage, AIMessage



logger = logging.getLogger(__name__)

CHROMA_DB_DIR = "./chroma_langchain_db"
COLLECTION_NAME = "knowledgebase_qna"

# Initialize models
llm = OllamaLLM(model="mistral", model_kwargs={"num_predict": 150})


# Initialize Chroma vector store
vector_store = Chroma(
    collection_name=COLLECTION_NAME,
    persist_directory=CHROMA_DB_DIR,
    embedding_function=embeddings
)

# Thread-safe initialization
vector_store_initialized = False
vector_store_lock = threading.Lock()

template = """
You are the KU AI Assistant, a helpful information resource for Karachi University.
Provide direct, informative answers based on the context provided.
Do not introduce yourself as an AI or mention that you're an assistant.
If you don't know the answer based on the context, say so.
Keep your responses focused on Karachi University information.

Context:
{context}

Chat History:
{chat_history}

Question: {question}
Answer:"""

prompt = ChatPromptTemplate.from_template(template)
# chain = prompt | llm

def ensure_database_connection():
    """Ensure database connection is active"""
    for conn in connections.all():
        if not conn.is_usable():
            conn.connect()

def sync_new_entries_to_vector_store():
    """Sync only new entries to vector store with proper DB connection handling"""
    global vector_store_initialized
    try:
        ensure_database_connection()
        
        # Handle empty vector store case
        try:
            existing_ids = set(vector_store.get()['ids'])
            logger.info(f"[VECTOR SYNC] Existing IDs: {existing_ids}")
        except:
            existing_ids = set()
        
        new_docs = []
        new_ids = []
        
        # Access models only when needed
        for entry in KnowledgeBase.objects.all().iterator():
            entry_id = str(entry.id)
            if entry_id not in existing_ids:
                new_docs.append(Document(
                    page_content=entry.question,
                    metadata={"source": "kb",
                              "answer":entry.answer,
                              "id":entry_id},
                    id=entry_id
                ))
                new_ids.append(entry_id)
        
        if new_docs:
            logger.info(f"[VECTOR SYNC] Adding {len(new_docs)} new documents to vector store")
            vector_store.add_documents(documents=new_docs, ids=new_ids)
        else:
            logger.info("[VECTOR SYNC] No new documents to add")
        vector_store_initialized = True
        return True
    
    except Exception as e:
        logger.warning(f"[VECTOR SYNC ERROR] {str(e)}")
        return False

def initialize_vector_store():
    """Thread-safe vector store initialization"""
    global vector_store_initialized
    if not vector_store_initialized:
        with vector_store_lock:
            if not vector_store_initialized:
                sync_new_entries_to_vector_store()

def get_user_memory(user):
    memory = ConversationBufferMemory(
        memory_key= 'chat_history',
        return_messages = True
    )
    
    messages = ChatMessage.objects.filter(user=user).order_by('timestemp')

    for msg in messages:
        if msg.role =='user':
            memory.chat_memory.add_user_message(msg.content)
        else:
            memory.chat_memory.add_ai_message(msg.content)

    return memory


def chatbot_response(user,question):
    logger.info(f"[START] Processing prompt: {question}")
    try:
        
        initialize_vector_store()
        
        memory = get_user_memory(user)

        chain = (
            {
                "context": lambda x: get_context(x["question"]),
                "question": lambda x: x["question"],
                "chat_history": lambda x: memory.load_memory_variables({})["chat_history"]
            }
            | prompt
            | llm
        )
        # chat_history = memory.load_memory_variables({})['chat_history']

        
        # docs = vector_store.similarity_search_with_score(question, k=10)

        
        
        # relevant_docs = []
        # for doc, score in docs:
        #     similarity = 1.0 - score
        #     if similarity > 0.6:  # Adjust threshold as needed
        #         relevant_docs.append((doc, similarity))
        #         logger.info(f"Relevant doc: similarity={similarity:.2f},content={doc.page_content[:50]}...")

      
        # context = ""
        # if relevant_docs:
        #     context = "\n".join([f"Content: {doc.page_content}\nAnswer: {doc.metadata.get('answer', '')}" 
        #     for doc, similarity in relevant_docs])
        # else:
        #     logger.info("[RETRIEVER] No relevant documents found")
        #     return "I don't have enough information about that topic in my knowledge base."

        # system_prompt = """
        # You are the KU AI Assistant, a helpful information resource for Karachi University.
        # Provide direct, informative answers based on the context provided.
        # Do not introduce yourself as an AI or mention that you're an assistant.
        # If you don't know the answer based on the context, say so.
        # Keep your responses focused on Karachi University information.
        # """
        
        # Generate response
        start_gen = time.time()
        # result = chain.invoke({
        #     "context": context,
        #     "question": question,
        #     "chat_history":chat_history,
        #     "system_prompt":system_prompt
            
        # })
        result = chain.invoke({"question": question})
        generation_time = time.time() - start_gen
        
        logger.info(f"[GENERATION] Took {generation_time:.2f} seconds")
        reply = result.content if hasattr(result, 'content') else str(result)

        reply = clean_response(reply)   
        memory.save_context({'input':question},{'output':reply})
        
        ChatMessage.objects.create(user=user, role="user", content=question)
        ChatMessage.objects.create(user=user, role="assistant", content=reply)
            
        return reply
        
    except Exception as e:
        logger.info(f"[ERROR] {str(e)}")
        return "I encountered an error processing your request."


def clean_response(response):
    """
    Remove unwanted AI self-introductions from responses
    """
    # Patterns to remove from responses
    unwanted_patterns = [
        r"Hello! My name is Anna\. I am an AI assistant.*",
        r"I am an artificial intelligence assistant.*",
        r"As an AI.*",
    ]
    
    for pattern in unwanted_patterns:
        response = re.sub(pattern, "", response).strip()
    
    # If the response is empty after cleaning, provide a default response
    if not response:
        response = "How can I help you with information about Karachi University?"
    
    return response

def get_context(question):
    """Retrieve relevant context from vector store"""
    docs = vector_store.similarity_search_with_score(question, k=10)
    
    relevant_docs = []
    for doc, score in docs:
        similarity = 1.0 - score
        if similarity > 0.6:  # Adjust threshold as needed
            relevant_docs.append((doc, similarity))
            logger.info(f"Relevant doc: similarity={similarity:.2f}, content={doc.page_content[:50]}...")
    
    context = ""
    if relevant_docs:
        context = "\n".join([f"Content: {doc.page_content}\nAnswer: {doc.metadata.get('answer', '')}" 
                             for doc, similarity in relevant_docs])
    else:
        logger.info("[RETRIEVER] No relevant documents found")
    
    return context
