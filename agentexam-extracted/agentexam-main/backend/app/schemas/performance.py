import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.exam import DifficultyLevel

class WeakTopicResponse(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    subject_id: uuid.UUID
    accuracy: float
    attempts: int
    
    model_config = ConfigDict(from_attributes=True)

class RecommendedDifficultyResponse(BaseModel):
    topic_id: uuid.UUID
    recommended_difficulty: DifficultyLevel
    accuracy: float
    attempts: int
    
    model_config = ConfigDict(from_attributes=True)

class TopicPerformanceResponse(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    subject_id: uuid.UUID
    accuracy: float
    attempts: int
    
    model_config = ConfigDict(from_attributes=True)

class PerformanceOverviewResponse(BaseModel):
    overall_accuracy: float
    strong_topics: List[TopicPerformanceResponse]
    weak_topics: List[TopicPerformanceResponse]
    insufficient_data_topics: List[TopicPerformanceResponse]
    
    model_config = ConfigDict(from_attributes=True)
