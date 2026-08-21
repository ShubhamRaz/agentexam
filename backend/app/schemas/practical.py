import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.models.exam import ExamStatus, TestType, DifficultyLevel

# --- Experiment Schemas ---

class ExperimentBase(BaseModel):
    title: str
    description: Optional[str] = None
    objective: Optional[str] = None
    instructions: Optional[str] = None
    expected_output: Optional[str] = None
    marks: float

class ExperimentResponse(ExperimentBase):
    id: uuid.UUID
    subject_id: uuid.UUID

    class Config:
        from_attributes = True

# --- Practical Session (MockTest) Schemas ---

class PracticalSessionCreate(BaseModel):
    subject_id: uuid.UUID
    duration_minutes: int = 120
    difficulty_level: DifficultyLevel = DifficultyLevel.MEDIUM

class PracticalSessionResponse(BaseModel):
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
    
    assigned_experiments: List[ExperimentResponse] = []
    
    class Config:
        from_attributes = True

# --- Practical Submission Schemas ---

class PracticalSubmissionCreate(BaseModel):
    experiment_id: uuid.UUID
    answer_text: Optional[str] = None
    file_reference: Optional[str] = None

class PracticalEvaluationResponse(BaseModel):
    id: uuid.UUID
    marks_obtained: float
    feedback: Optional[str] = None

    class Config:
        from_attributes = True

class PracticalSubmissionResponse(BaseModel):
    id: uuid.UUID
    experiment_id: uuid.UUID
    answer_text: Optional[str] = None
    file_reference: Optional[str] = None
    submitted_at: datetime
    evaluation: Optional[PracticalEvaluationResponse] = None

    class Config:
        from_attributes = True

class PracticalSessionDetailResponse(PracticalSessionResponse):
    submissions: List[PracticalSubmissionResponse] = []
