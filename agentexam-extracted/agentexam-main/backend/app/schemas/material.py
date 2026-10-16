import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.academic import MaterialType

class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    material_type: Optional[MaterialType] = None
    subject_id: Optional[uuid.UUID] = None

class MaterialResponse(BaseModel):
    id: uuid.UUID
    title: str
    material_type: MaterialType
    subject_id: uuid.UUID
    file_name: str
    file_type: str
    mime_type: str
    file_size: int
    processing_status: str
    uploaded_by: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
