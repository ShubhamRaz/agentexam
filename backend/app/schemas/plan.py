import uuid
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from app.models.plan import PlanStatus, RecommendationPriority, RecommendationType

class StudyTaskSchema(BaseModel):
    id: str
    title: str
    topic_id: Optional[uuid.UUID]
    topic_name: Optional[str]
    subject_name: Optional[str]
    priority: RecommendationPriority
    task_type: RecommendationType
    duration_minutes: int
    status: str
    date: date

class StudyPlanResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    start_date: date
    end_date: date
    status: PlanStatus
    tasks: List[StudyTaskSchema]

    class Config:
        orm_mode = True

class RecommendationResponse(BaseModel):
    id: uuid.UUID
    plan_id: uuid.UUID
    topic_id: Optional[uuid.UUID]
    recommendation_type: RecommendationType
    priority: RecommendationPriority
    message: str
    is_done: bool

    class Config:
        orm_mode = True
