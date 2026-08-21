import uuid
from typing import Optional, List
from pydantic import BaseModel

# ----------------- Base schemas -----------------
class ProgramBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class SemesterBase(BaseModel):
    semester_number: int
    name: Optional[str] = None

class SubjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class UnitBase(BaseModel):
    name: str
    chapter_no: int
    description: Optional[str] = None

class TopicBase(BaseModel):
    name: str
    description: Optional[str] = None

# ----------------- Create schemas -----------------
class ProgramCreate(ProgramBase):
    pass

class SemesterCreate(SemesterBase):
    course_id: uuid.UUID

class SubjectCreate(SubjectBase):
    semester_id: uuid.UUID

class UnitCreate(UnitBase):
    subject_id: uuid.UUID

class TopicCreate(TopicBase):
    chapter_id: uuid.UUID

# ----------------- Response schemas -----------------
class TopicResponse(TopicBase):
    id: uuid.UUID
    chapter_id: uuid.UUID
    model_config = {"from_attributes": True}

class UnitResponse(UnitBase):
    id: uuid.UUID
    subject_id: uuid.UUID
    topics: List[TopicResponse] = []
    model_config = {"from_attributes": True}

class SubjectResponse(SubjectBase):
    id: uuid.UUID
    semester_id: uuid.UUID
    model_config = {"from_attributes": True}

class SemesterResponse(SemesterBase):
    id: uuid.UUID
    course_id: uuid.UUID
    model_config = {"from_attributes": True}

class ProgramResponse(ProgramBase):
    id: uuid.UUID
    model_config = {"from_attributes": True}

# ----------------- PYQ & Syllabus -----------------
class MaterialResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    material_type: str
    title: str
    file_url: str
    model_config = {"from_attributes": True}

# ----------------- Student Profile -----------------
class StudentProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    enrollment_no: Optional[str] = None
    semester: Optional[str] = None
    department: Optional[str] = None
    model_config = {"from_attributes": True}
