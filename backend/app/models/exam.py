import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base_class import Base


class TestType(str, enum.Enum):
    THEORY = "THEORY"
    PRACTICAL = "PRACTICAL"
    ADAPTIVE = "ADAPTIVE"


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


class MockTest(Base):
    __tablename__ = "mock_test"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("student.id"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id"), nullable=False)
    test_type: Mapped[TestType] = mapped_column(String(50), nullable=False)
    difficulty_level: Mapped[DifficultyLevel] = mapped_column(String(50), nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="STARTED")
    
    questions = relationship("Question", back_populates="test")
    result = relationship("Result", back_populates="test", uselist=False)


class Question(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    test_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mock_test.id"), nullable=False)
    chapter_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("chapter.id"), nullable=True)
    question_type: Mapped[QuestionType] = mapped_column(String(50), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict] = mapped_column(JSONB, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=True)
    marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    difficulty_level: Mapped[DifficultyLevel] = mapped_column(String(50), nullable=False)
    
    test = relationship("MockTest", back_populates="questions")
    answers = relationship("Answer", back_populates="question")


class Answer(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("question.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("student.id"), nullable=False)
    test_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mock_test.id"), nullable=False)
    answer_text: Mapped[str] = mapped_column(Text, nullable=False)
    
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
