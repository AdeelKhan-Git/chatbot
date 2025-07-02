
import time
import threading
from django.db import connections
from .embedding import embeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from chatapi.models import KnowledgeBase

CHROMA_DB_DIR = "./chroma_langchain_db"
COLLECTION_NAME = "knowledgebase_qna"

# Initialize models
llm = OllamaLLM(model="phi", model_kwargs={"num_predict": 150})


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
You are an expert answering questions based ONLY on the provided context.
If the answer cannot be found in the context, say "I don't know".

Context:
{context}

Question: {question}
Answer:"""

prompt = ChatPromptTemplate.from_template(template)
chain = prompt | llm

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
        except:
            existing_ids = set()
        
        new_docs = []
        new_ids = []
        
        # Access models only when needed
        for entry in KnowledgeBase.objects.all().iterator():
            entry_id = str(entry.id)
            if entry_id not in existing_ids:
                new_docs.append(Document(
                    page_content=f"{entry.question} {entry.answer}",
                    metadata={"source": "kb"},
                    id=entry_id
                ))
                new_ids.append(entry_id)
        
        if new_docs:
            vector_store.add_documents(documents=new_docs, ids=new_ids)
        
        vector_store_initialized = True
        return True
    
    except Exception as e:
        print(f"[VECTOR SYNC ERROR] {str(e)}")
        return False

def initialize_vector_store():
    """Thread-safe vector store initialization"""
    global vector_store_initialized
    if not vector_store_initialized:
        with vector_store_lock:
            if not vector_store_initialized:
                sync_new_entries_to_vector_store()

def chatbot_response(question):
    print("[START] Processing prompt:", question)
    try:
        # Ensure vector store is initialized
        initialize_vector_store()
        
        start_time = time.time()
        
        # Use synchronous search method
        docs_with_scores = vector_store.similarity_search_with_score(question, k=10)
        retrieval_time = time.time() - start_time
        
        # Filter documents
        filtered_docs = []
        for doc, score in docs_with_scores:
            similarity = 1.0 - score
            if similarity >= 0.3:
                filtered_docs.append(doc)
        
        print(f"[RETRIEVER] Took {retrieval_time:.2f} seconds, found {len(filtered_docs)} docs")
        
        # Handle no docs case
        if not filtered_docs:
            return "I don't have information about that topic in my knowledge base."
        
        # Truncate context to 2000 characters
        context = "\n\n".join(doc.page_content for doc in filtered_docs)
  
        
        # Generate response
        start_gen = time.time()
        result = chain.invoke({"context": context, "question": question})
        generation_time = time.time() - start_gen
        print(f"[GENERATION] Took {generation_time:.2f} seconds")
        
            
        return result
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return "I encountered an error processing your request."
