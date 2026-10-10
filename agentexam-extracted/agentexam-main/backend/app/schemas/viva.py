import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models.exam import ExamStatus, TestType, DifficultyLevel
from app.schemas.question import QuestionResponseStudent

class VivaSessionCreate(BaseModel):
    subject_id: uuid.UUID
    duration_minutes: int = 30
    difficulty_level: DifficultyLevel = DifficultyLevel.MEDIUM
    question_count: int = 5

class VivaAnswerCreate(BaseModel):
    answer_text: str

class VivaAnswerResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    answer_text: Optional[str] = None
    answered_at: datetime
    
    class Config:
        from_attributes = True

class VivaEvaluationUpdate(BaseModel):
    marks_obtained: float
    feedback: Optional[str] = None

class VivaEvaluationResponse(BaseModel):
    id: uuid.UUID
    marks_obtained: float
    feedback: Optional[str] = None

    class Config:
        from_attributes = True

class VivaAnswerDetailResponse(VivaAnswerResponse):
    evaluation: Optional[VivaEvaluationResponse] = None

class VivaSessionResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    test_type: TestType
    difficulty_level: DifficultyLevel
    total_marks: float
    duration_minutes: int
    status: ExamStatus
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class VivaSessionDetailResponse(VivaSessionResponse):
    questions: List[QuestionResponseStudent] = []
    saved_answers: List[VivaAnswerDetailResponse] = []
