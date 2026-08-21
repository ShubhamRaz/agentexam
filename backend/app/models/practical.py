import uuid
from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, Numeric, DateTime, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

mock_test_experiment = Table(
    "mock_test_experiment",
    Base.metadata,
    Column("test_id", ForeignKey("mock_test.id"), primary_key=True),
    Column("experiment_id", ForeignKey("experiment.id"), primary_key=True)
)

class Experiment(Base):
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subject.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    objective: Mapped[str] = mapped_column(Text, nullable=True)
    instructions: Mapped[str] = mapped_column(Text, nullable=True)
    expected_output: Mapped[str] = mapped_column(Text, nullable=True)
    marks: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    
    tests = relationship("MockTest", secondary=mock_test_experiment, back_populates="experiments")
    submissions = relationship("PracticalSubmission", back_populates="experiment")
    subject = relationship("Subject")

class PracticalSubmission(Base):
    __tablename__ = "practical_submission"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    test_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("mock_test.id"), nullable=False)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("student.id"), nullable=False)
    experiment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("experiment.id"), nullable=False)
    
    answer_text: Mapped[str] = mapped_column(Text, nullable=True)
    file_reference: Mapped[str] = mapped_column(String(1024), nullable=True)
    
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    experiment = relationship("Experiment", back_populates="submissions")
    test = relationship("MockTest")
    
    evaluation = relationship("PracticalEvaluation", back_populates="submission", uselist=False)

class PracticalEvaluation(Base):
    __tablename__ = "practical_evaluation"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("practical_submission.id"), nullable=False, unique=True)
    marks_obtained: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    feedback: Mapped[str] = mapped_column(Text, nullable=True)
    
    submission = relationship("PracticalSubmission", back_populates="evaluation")
