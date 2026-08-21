import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, Numeric, Integer, DateTime, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_class import Base

class TestType(str, enum.Enum):
    THEORY = "THEORY"
    PRACTICAL = "PRACTICAL"
    ADAPTIVE = "ADAPTIVE"

class ExamStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    EVALUATED = "EVALUATED"
    EXPIRED = "EXPIRED"

class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class QuestionType(str, enum.Enum):
    MCQ = "MCQ"
    SHORT_ANSWER = "SHORT_ANSWER"
    LONG_ANSWER = "LONG_ANSWER"
    CODING = "CODING"
    VIVA = "VIVA"

class QuestionSource(str, enum.Enum):
    PYQ = "PYQ"
    MANUAL = "MANUAL"
    AI = "AI"
    IMPORTED = "IMPORTED"
    OTHER = "OTHER"

class QuestionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"

# Association table for MockTest -> Question (Many-to-Many)
mock_test_question = Table(
    "mock_test_question",
    Base.metadata,
    Column("test_id", ForeignKey("mock_test.id"), primary_key=True),
    Column("question_id", ForeignKey("question.id"), primary_key=True),
    Column("order", Integer, nullable=True) # Optional ordering
)

class MockTest(Base):
    __tablename__ = "mock_test"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("student.id"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id"), nullable=False)
    test_type: Mapped[TestType] = mapped_column(String(50), nullable=False)
    difficulty_level: Mapped[DifficultyLevel] = mapped_column(String(50), nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    status: Mapped[ExamStatus] = mapped_column(String(50), default=ExamStatus.DRAFT, nullable=False)
    
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    questions = relationship("Question", secondary=mock_test_question, back_populates="tests")
    result = relationship("Result", back_populates="test", uselist=False)

class Question(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id"), nullable=False)
    chapter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chapter.id"), nullable=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("topic.id"), nullable=True)
    
    question_type: Mapped[QuestionType] = mapped_column(String(50), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=True)
    
    marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    difficulty_level: Mapped[DifficultyLevel] = mapped_column(String(50), nullable=False)
    
    source: Mapped[QuestionSource] = mapped_column(String(50), default="MANUAL", nullable=False)
    source_reference: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[QuestionStatus] = mapped_column(String(50), default="ACTIVE", nullable=False)
    
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    tests = relationship("MockTest", secondary=mock_test_question, back_populates="questions")
    answers = relationship("Answer", back_populates="question")
    subject = relationship("Subject")
    chapter = relationship("Chapter")
    topic = relationship("Topic")
    creator = relationship("User")

class Answer(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("question.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("student.id"), nullable=False)
    test_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mock_test.id"), nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=True)
    selected_option_id: Mapped[str] = mapped_column(String(255), nullable=True)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    question = relationship("Question", back_populates="answers")
    evaluation = relationship("Evaluation", back_populates="answer", uselist=False)

class Evaluation(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    answer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("answer.id"), nullable=False)
    evaluated_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), nullable=True)  # Null if AI evaluated
    marks_obtained: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=True)
    rubric_scores: Mapped[dict] = mapped_column(JSONB, nullable=True)
    
    answer = relationship("Answer", back_populates="evaluation")

class Result(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    test_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mock_test.id"), nullable=False, unique=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("student.id"), nullable=False)
    total_marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    obtained_marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    grade: Mapped[str] = mapped_column(String(20), nullable=True)
    readiness_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    
    test = relationship("MockTest", back_populates="result")
    analytics = relationship("ResultAnalytics", back_populates="result", uselist=False)

class ResultAnalytics(Base):
    __tablename__ = "result_analytics"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    result_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("result.id"), nullable=False)
    topic_strength: Mapped[dict] = mapped_column(JSONB, nullable=True)
    weak_areas: Mapped[dict] = mapped_column(JSONB, nullable=True)
    improvement_suggestions: Mapped[str] = mapped_column(Text, nullable=True)
    recommended_topics: Mapped[dict] = mapped_column(JSONB, nullable=True)
    
    result = relationship("Result", back_populates="analytics")
