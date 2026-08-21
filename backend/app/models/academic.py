import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_class import Base


class MaterialType(str, enum.Enum):
    SYLLABUS = "SYLLABUS"
    NOTES = "NOTES"
    PYQ = "PYQ"
    LAB_MANUAL = "LAB_MANUAL"
    OTHER = "OTHER"


class Course(Base):
    """ Represents a Program (e.g., B.Tech CSE) """
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    semesters = relationship("Semester", back_populates="course")


class Semester(Base):
    """ Represents a Semester under a Program """
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("course.id"), nullable=False)
    semester_number: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=True)  # e.g. "Fall 2024" or "Semester 3"
    
    course = relationship("Course", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester")


class Subject(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    semester_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("semester.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    semester = relationship("Semester", back_populates="subjects")
    chapters = relationship("Chapter", back_populates="subject")
    materials = relationship("StudyMaterial", back_populates="subject")


class Chapter(Base):
    """ Represents a Unit """
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    chapter_no: Mapped[int] = mapped_column(nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    subject = relationship("Subject", back_populates="chapters")
    topics = relationship("Topic", back_populates="chapter")


class Topic(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    chapter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chapter.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    chapter = relationship("Chapter", back_populates="topics")


class StudyMaterial(Base):
    __tablename__ = "study_material"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id"), nullable=False)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), nullable=False)
    material_type: Mapped[MaterialType] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    processing_status: Mapped[str] = mapped_column(String(50), default="UPLOADED", nullable=False)
    
    subject = relationship("Subject", back_populates="materials")
    analysis = relationship("MaterialAnalysis", back_populates="material", uselist=False)


class MaterialAnalysis(Base):
    __tablename__ = "material_analysis"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    material_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("study_material.id"), nullable=False)
    topics_extracted: Mapped[dict] = mapped_column(JSONB, nullable=True)
    key_concepts: Mapped[dict] = mapped_column(JSONB, nullable=True)
    topic_weightage: Mapped[dict] = mapped_column(JSONB, nullable=True)
    high_prob_topics: Mapped[dict] = mapped_column(JSONB, nullable=True)
    
    material = relationship("StudyMaterial", back_populates="analysis")
