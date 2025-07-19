
import time
import threading
from django.db import connections
from .embedding import embeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama.llms import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from chatapi.models import KnowledgeBase
import logging


logger = logging.getLogger(__name__)

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

def chatbot_response(question):
    logger.info(f"[START] Processing prompt: {question}")
    try:
        
        initialize_vector_store()
        
        start_time = time.time()
        
        docs_with_scores = vector_store.similarity_search_with_score(question, k=10)
        retrieval_time = time.time() - start_time
        
        logger.info(f"[RETRIEVER] Took {retrieval_time:.2f} seconds, found {len(docs_with_scores)} docs")
        
        
        for i, (doc, score) in enumerate(docs_with_scores):
            similarity = 1.0 - score
            logger.info(f"  Candidate {i+1}: similarity={similarity:.2f}, content={doc.page_content[:50]}...")
        
        
        best_match = None
        best_similarity = 0
        for doc, score in docs_with_scores:
            similarity = 1.0 - score
            if similarity > best_similarity:
                best_match = doc
                best_similarity = similarity

      
        if not best_match or best_similarity < 0.5:
            logger.info(f"[RETRIEVER] No good match found (best similarity: {best_similarity:.2f})")
            return "I don't have information about that topic in my knowledge base."
        
        logger.info(f"[RETRIEVER] Best match similarity: {best_similarity:.2f}")
        
        if best_similarity >= 0.85: 
            logger.info("[RETRIEVER] Using direct answer from knowledge base")
            return best_match.metadata["answer"]
        
        logger.info("[RETRIEVER] Using LLM generation with context")
        context = best_match.page_content
        if "answer" in best_match.metadata:
            context += f"\nAnswer: {best_match.metadata['answer']}"
  
        
        # Generate response
        start_gen = time.time()
        result = chain.invoke({"context": context, "question": question})
        generation_time = time.time() - start_gen
        logger.info(f"[GENERATION] Took {generation_time:.2f} seconds")
        
            
        return result
        
    except Exception as e:
        logger.info(f"[ERROR] {str(e)}")
        return "I encountered an error processing your request."
