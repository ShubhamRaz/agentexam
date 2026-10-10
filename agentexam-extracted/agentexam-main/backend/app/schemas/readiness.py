import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from enum import Enum

class ReadinessStatus(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"

class RiskLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class RiskArea(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    risk_level: RiskLevel
    reason: str
    
    model_config = ConfigDict(from_attributes=True)

class Recommendation(BaseModel):
    priority: RiskLevel
    message: str
    topic_id: Optional[uuid.UUID] = None
    
    model_config = ConfigDict(from_attributes=True)

class ReadinessFactor(BaseModel):
    name: str
    value: float
    
    model_config = ConfigDict(from_attributes=True)

class ReadinessResponse(BaseModel):
    readiness_score: Optional[float]
    status: ReadinessStatus
    factors: List[ReadinessFactor]
    risk_areas: List[RiskArea]
    recommendations: List[Recommendation]
    
    model_config = ConfigDict(from_attributes=True)
