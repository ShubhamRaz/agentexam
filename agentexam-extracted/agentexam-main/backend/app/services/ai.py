import logging
import uuid
import asyncio
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.ai import AIGenerationJob, JobStatus
from app.models.academic import Subject, Topic
from app.models.exam import QuestionStatus, QuestionSource, Question
from app.schemas.ai import AIGenerationRequest
from app.schemas.question import QuestionCreate, OptionAdmin
from app.services.ai_provider import get_ai_provider
from app.services.question import question_service

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.provider = get_ai_provider(
            provider_type=settings.AI_PROVIDER,
            model_name=settings.AI_MODEL,
            api_key=settings.get_ai_api_key,
            base_url=settings.AI_BASE_URL
        )

    async def create_generation_job(
        self, 
        db: AsyncSession, 
        request: AIGenerationRequest, 
        user_id: uuid.UUID
    ) -> AIGenerationJob:
        
        job = AIGenerationJob(
            subject_id=request.subject_id,
            topic_id=request.topic_id,
            question_type=request.question_type,
            difficulty=request.difficulty,
            marks=request.marks,
            count=request.count,
            created_by=user_id,
            status=JobStatus.PENDING
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        return job

    async def get_job(self, db: AsyncSession, job_id: uuid.UUID) -> Optional[AIGenerationJob]:
        stmt = select(AIGenerationJob).where(AIGenerationJob.id == job_id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def run_generation_task(self, job_id: uuid.UUID):
        """ Run the generation job in the background """
        async with AsyncSessionLocal() as db:
            job = await self.get_job(db, job_id)
            if not job:
                logger.error(f"AI generation job {job_id} not found.")
                return

            job.status = JobStatus.RUNNING
            await db.commit()

            try:
                # 1. Fetch academic context
                subject = await db.get(Subject, job.subject_id)
                topic = None
                if job.topic_id:
                    topic = await db.get(Topic, job.topic_id)

                if not subject:
                    raise ValueError(f"Subject {job.subject_id} not found")

                context = f"Subject: {subject.subject_name} ({subject.subject_code})\n"
                if topic:
                    context += f"Topic: {topic.chapter_name}\n"
                
                # We could fetch MaterialAnalysis here to feed PYQ trends, but sticking to basic context for now.
                
                # Fetch RAG context scoped to user's materials
                from app.services.rag import rag_service
                retrieved_chunks = await rag_service.search(
                    db=db, 
                    query=f"Generate {job.question_type.value} questions on {topic.name if topic else subject.name}", 
                    subject_id=job.subject_id, 
                    top_k=5,
                    uploader_id=job.created_by
                )
                rag_context = rag_service.build_context(retrieved_chunks)
                
                # 2. Build prompt
                prompt = (
                    f"Academic Context:\n{context}\n\n"
                    f"{rag_context}\n\n"
                    f"Please generate {job.count} questions of type {job.question_type.value}, "
                    f"difficulty level {job.difficulty.value}, for {job.marks} marks each."
                )

                # 3. Call AI Provider
                ai_output = await self.provider.generate_questions(
                    prompt=prompt,
                    count=job.count,
                    question_type=job.question_type,
                    marks=float(job.marks)
                )

                # 4. Process and Insert Questions
                for q in ai_output.questions:
                    # Very basic duplicate detection via question_service (similar to PYQ ingest)
                    stmt = select(Question).where(
                        Question.subject_id == job.subject_id,
                        Question.question_text == q.question_text
                    )
                    existing = (await db.execute(stmt)).scalars().first()
                    
                    if existing:
                        logger.info(f"Skipping duplicate AI generated question: {q.question_text[:30]}")
                        continue
                        
                    question_in = QuestionCreate(
                        subject_id=job.subject_id,
                        chapter_id=topic.chapter_id if topic else None,
                        topic_id=job.topic_id,
                        question_type=job.question_type,
                        difficulty_level=job.difficulty,
                        marks=float(job.marks),
                        question_text=q.question_text,
                        options=q.options,
                        correct_answer=q.correct_answer,
                        explanation=q.explanation,
                        source=QuestionSource.AI,
                        status=QuestionStatus.REVIEW_REQUIRED
                    )
                    
                    await question_service.create(db=db, obj_in=question_in, user_id=job.created_by)

                job.status = JobStatus.COMPLETED
                await db.commit()

            except Exception as e:
                logger.exception(f"Error in AI generation job {job_id}")
                job.status = JobStatus.FAILED
                job.error_message = str(e)
                await db.commit()


ai_service = AIService()
