import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.exam import QuestionType, DifficultyLevel
from app.models.ai import JobStatus
from app.schemas.question import OptionAdmin


class AIGenerationRequest(BaseModel):
    subject_id: uuid.UUID
    topic_id: Optional[uuid.UUID] = None
    question_type: QuestionType
    difficulty: DifficultyLevel
    marks: float = Field(..., gt=0)
    count: int = Field(default=1, ge=1, le=20)


class AIGenerationJobResponse(BaseModel):
    id: uuid.UUID
    status: JobStatus
    subject_id: uuid.UUID
    topic_id: Optional[uuid.UUID] = None
    question_type: QuestionType
    difficulty: DifficultyLevel
    count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIQuestionSchema(BaseModel):
    """ Structured output format expected from the AI provider """
    question_text: str
    options: Optional[List[OptionAdmin]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class AIQuestionListSchema(BaseModel):
    """ Root schema for list of questions expected from the AI provider """
    questions: List[AIQuestionSchema]


class AIEvaluationSchema(BaseModel):
    """ Structured evaluation output from AI """
    score: float
    max_score: float
    feedback: str
    evaluation_status: str = "COMPLETED"
