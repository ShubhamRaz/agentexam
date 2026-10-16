import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base
from app.models.exam import QuestionType, DifficultyLevel


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AIGenerationJob(Base):
    __tablename__ = "ai_generation_job"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subject.id"), nullable=False)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topic.id"), nullable=True)
    question_type = Column(Enum(QuestionType), nullable=False)
    difficulty = Column(Enum(DifficultyLevel), nullable=False)
    marks = Column(Numeric(5, 2), nullable=False)
    count = Column(Integer, nullable=False, default=1)
    
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    error_message = Column(String, nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    subject = relationship("Subject", foreign_keys=[subject_id])
    topic = relationship("Topic", foreign_keys=[topic_id])
    creator = relationship("User", foreign_keys=[created_by])
