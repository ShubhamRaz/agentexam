import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.chat import ChatRole

class ChatSessionCreate(BaseModel):
    title: Optional[str] = None

class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ChatMessageCreate(BaseModel):
    content: str
    subject_id: Optional[uuid.UUID] = None  # Optional context filtering

class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: ChatRole
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
