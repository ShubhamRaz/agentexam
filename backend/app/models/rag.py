import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.db.base_class import Base

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("study_material.id", ondelete="CASCADE"), nullable=False)
    
    # 1536 is standard for text-embedding-3-small and text-embedding-ada-002
    embedding = Column(Vector(1536), nullable=False)
    content = Column(Text, nullable=False)
    
    chunk_index = Column(Integer, nullable=False)
    
    # academic context filters
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subject.id", ondelete="CASCADE"), nullable=False)
    
    metadata_ = Column("metadata", JSONB, nullable=True)  # Using metadata_ to avoid conflict with SQLAlchemy's metadata
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("StudyMaterial", foreign_keys=[document_id])
    subject = relationship("Subject", foreign_keys=[subject_id])
