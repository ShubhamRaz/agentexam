import uuid
from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from app.models.exam import QuestionType, DifficultyLevel, QuestionSource, QuestionStatus

class OptionAdmin(BaseModel):
    id: str
    text: str
    is_correct: bool

class OptionStudent(BaseModel):
    id: str
    text: str

class QuestionBase(BaseModel):
    subject_id: uuid.UUID
    chapter_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None
    question_type: QuestionType
    question_text: str
    marks: float
    difficulty_level: DifficultyLevel
    source: QuestionSource = QuestionSource.MANUAL
    source_reference: Optional[str] = None
    status: QuestionStatus = QuestionStatus.ACTIVE

class QuestionCreate(QuestionBase):
    options: Optional[List[OptionAdmin]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None

class QuestionUpdate(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    chapter_id: Optional[uuid.UUID] = None
    topic_id: Optional[uuid.UUID] = None
    question_type: Optional[QuestionType] = None
    question_text: Optional[str] = None
    marks: Optional[float] = None
    difficulty_level: Optional[DifficultyLevel] = None
    source: Optional[QuestionSource] = None
    source_reference: Optional[str] = None
    status: Optional[QuestionStatus] = None
    options: Optional[List[OptionAdmin]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None

class QuestionResponseAdmin(QuestionBase):
    id: uuid.UUID
    options: Optional[List[OptionAdmin]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class QuestionResponseStudent(QuestionBase):
    """
    Student-safe response schema that strips correct answers, 
    explanations, and internal evaluation flags.
    """
    id: uuid.UUID
    options: Optional[List[OptionStudent]] = None
    
    # Intentionally hiding correct_answer, explanation, created_by
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaginatedQuestionResponseAdmin(BaseModel):
    items: List[QuestionResponseAdmin]
    total: int
    page: int
    size: int

class PaginatedQuestionResponseStudent(BaseModel):
    items: List[QuestionResponseStudent]
    total: int
    page: int
    size: int
