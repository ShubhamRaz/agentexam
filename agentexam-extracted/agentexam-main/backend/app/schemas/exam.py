import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.exam import TestType, DifficultyLevel, ExamStatus
from app.schemas.question import QuestionResponseStudent

# --- Exams (MockTests) ---

class MockTestCreate(BaseModel):
    subject_id: uuid.UUID
    test_type: TestType = TestType.THEORY
    difficulty_level: DifficultyLevel = DifficultyLevel.MEDIUM
    question_count: int = 10
    duration_minutes: int = 60

class MockTestResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    test_type: TestType
    difficulty_level: DifficultyLevel
    total_marks: int
    duration_minutes: int
    status: ExamStatus
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PaginatedMockTestResponse(BaseModel):
    items: List[MockTestResponse]
    total: int
    page: int
    size: int

# --- Answers ---

class AnswerCreate(BaseModel):
    question_id: uuid.UUID
    selected_option_id: Optional[str] = None
    answer_text: Optional[str] = None

class AnswerResponse(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    selected_option_id: Optional[str] = None
    answer_text: Optional[str] = None
    answered_at: datetime
    
    class Config:
        from_attributes = True

# --- Complete Attempt Response ---

class ExamAttemptResponse(MockTestResponse):
    """
    The full payload for a student currently taking an exam.
    Includes the test metadata, safe questions, and their currently saved answers.
    """
    questions: List[QuestionResponseStudent]
    saved_answers: List[AnswerResponse]
