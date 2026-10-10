import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import RoleType

# Shared properties
class UserBase(BaseModel):
    email: EmailStr
    name: str

# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str
    role: RoleType = RoleType.STUDENT

# Properties to return to client (does NOT include password)
class UserResponse(UserBase):
    id: uuid.UUID
    role: RoleType
    is_active: bool

    model_config = {"from_attributes": True}
