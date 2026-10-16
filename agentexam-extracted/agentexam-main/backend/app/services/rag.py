import logging
import uuid
from typing import List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.core.config import settings
from app.models.academic import StudyMaterial
from app.models.rag import DocumentChunk
from app.services.embedding_provider import get_embedding_provider

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.embedding_provider = get_embedding_provider(
            provider_type=settings.EMBEDDING_PROVIDER,
            model_name=settings.EMBEDDING_MODEL,
            api_key=settings.get_ai_api_key,
            base_url=settings.AI_BASE_URL
        )
        self.chunk_size = settings.CHUNK_SIZE
        self.chunk_overlap = settings.CHUNK_OVERLAP

    def chunk_text(self, text: str) -> List[str]:
        """
        Simple sliding window chunking by characters.
        """
        if not text:
            return []
            
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + self.chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start += self.chunk_size - self.chunk_overlap
            
        return chunks

    async def index_document(self, db: AsyncSession, material: StudyMaterial, text: str) -> None:
        """
        Chunks the extracted text, embeds it, and stores it in vector DB.
        """
        logger.info(f"RAG: Indexing document {material.id} ({material.title})")
        
        # 1. Clean existing chunks for this document
        await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == material.id))
        await db.flush()
        
        # 2. Chunk text
        chunks_text = self.chunk_text(text)
        if not chunks_text:
            logger.warning(f"RAG: No text to index for document {material.id}")
            return
            
        # 3. Generate embeddings
        try:
            embeddings = await self.embedding_provider.embed_texts(chunks_text)
        except Exception as e:
            logger.error(f"RAG: Failed to generate embeddings for {material.id}: {str(e)}")
            raise
            
        # 4. Store in DB
        chunks = []
        for i, (chunk_text, embedding) in enumerate(zip(chunks_text, embeddings)):
            chunk = DocumentChunk(
                document_id=material.id,
                subject_id=material.subject_id,
                uploaded_by=material.uploaded_by,  # per-student scope (SRS §5.3)
                content=chunk_text,
                embedding=embedding,
                chunk_index=i,
                metadata_={
                    "source_type": getattr(material.material_type, "value", str(material.material_type)),
                    "title": material.title
                }
            )
            chunks.append(chunk)
            
        db.add_all(chunks)
        await db.flush()
        logger.info(f"RAG: Indexed {len(chunks)} chunks for document {material.id}")

    async def search(
        self,
        db: AsyncSession,
        query: str,
        subject_id: uuid.UUID,
        top_k: int = 5,
        threshold: float = 0.7,
        uploader_id: Optional[uuid.UUID] = None,
    ) -> List[DocumentChunk]:
        """
        Perform semantic search using pgvector's cosine distance.
        When uploader_id is provided only chunks from that student's materials are returned.
        """
        query_embedding = await self.embedding_provider.embed_query(query)
        
        stmt = (
            select(DocumentChunk)
            .where(DocumentChunk.subject_id == subject_id)
            .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )

        if uploader_id is not None:
            stmt = stmt.where(DocumentChunk.uploaded_by == uploader_id)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())

    def build_context(self, chunks: List[DocumentChunk]) -> str:
        """
        Builds a context string from retrieved chunks to feed into the AI prompt.
        """
        if not chunks:
            return "No additional context available."
            
        context_parts = ["--- RETRIEVED ACADEMIC CONTEXT ---"]
        
        for i, chunk in enumerate(chunks):
            source = chunk.metadata_.get("title", "Unknown Source")
            chunk_type = chunk.metadata_.get("source_type", "Unknown Type")
            context_parts.append(f"\n[Source {i+1}: {source} ({chunk_type})]")
            context_parts.append(chunk.content.strip())
            
        context_parts.append("\n--- END OF CONTEXT ---")
        return "\n".join(context_parts)

rag_service = RAGService()
