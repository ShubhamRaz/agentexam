# Import all models here so Alembic can discover them
from app.db.base_class import Base
from app.models.user import User, Student, Teacher, Admin
from app.models.academic import Course, Semester, Subject, Chapter, Topic, StudyMaterial, MaterialAnalysis
from app.models.exam import MockTest, Question, Answer, Evaluation, Result, ResultAnalytics
from app.models.plan import StudyPlan, Recommendation
from app.models.practical import Experiment, PracticalSubmission, PracticalEvaluation
from app.models.ai import AIGenerationJob, JobStatus
from app.models.rag import DocumentChunk
from app.models.chat import ChatSession, ChatMessage
