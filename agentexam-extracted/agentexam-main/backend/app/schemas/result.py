import uuid
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.question import OptionAdmin

class EvaluationResponse(BaseModel):
    id: uuid.UUID
    answer_id: uuid.UUID
    marks_obtained: float
    feedback: Optional[str] = None
    
    class Config:
        from_attributes = True

class QuestionResultResponse(BaseModel):
    """ Question, Student Answer, and Evaluation packed together. """
    question_id: uuid.UUID
    question_text: str
    marks: float
    options: Optional[List[OptionAdmin]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    
    # Student's answer
    student_selected_option_id: Optional[str] = None
    student_answer_text: Optional[str] = None
    
    evaluation: Optional[EvaluationResponse] = None

class ResultResponse(BaseModel):
    id: uuid.UUID
    test_id: uuid.UUID
    student_id: uuid.UUID
    total_marks: float
    obtained_marks: float
    percentage: float
    grade: Optional[str] = None
    pass_status: bool
    
    class Config:
        from_attributes = True

class ResultDetailResponse(ResultResponse):
    question_results: List[QuestionResultResponse]

class PaginatedResultResponse(BaseModel):
    items: List[ResultResponse]
    total: int
    page: int
    size: int
