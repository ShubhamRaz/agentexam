import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_class import Base
from datetime import date


class PlanStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class RecommendationPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RecommendationType(str, enum.Enum):
    STUDY = "STUDY"
    REVISION = "REVISION"
    PRACTICE = "PRACTICE"
    CONCEPT = "CONCEPT"


class StudyPlan(Base):
    __tablename__ = "study_plan"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("student.id"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    plan_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[PlanStatus] = mapped_column(String(50), default=PlanStatus.ACTIVE, nullable=False)
    
    recommendations = relationship("Recommendation", back_populates="plan")


class Recommendation(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("study_plan.id"), nullable=False)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chapter.id"), nullable=True)
    recommendation_type: Mapped[RecommendationType] = mapped_column(String(50), nullable=False)
    priority: Mapped[RecommendationPriority] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False)
    
    plan = relationship("StudyPlan", back_populates="recommendations")
