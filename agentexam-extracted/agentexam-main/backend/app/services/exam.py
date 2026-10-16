import uuid
import random
from typing import List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.models.exam import MockTest, Question, Answer, ExamStatus, QuestionStatus, DifficultyLevel
from app.schemas.exam import MockTestCreate, AnswerCreate

class ExamEngineService:
    async def create_mock_test(self, db: AsyncSession, student_id: uuid.UUID, obj_in: MockTestCreate) -> MockTest:
        """ Generate a new mock test by pulling random questions. """
        
        # 1. Fetch available active questions
        stmt = select(Question).where(
            Question.subject_id == obj_in.subject_id,
            Question.status == QuestionStatus.ACTIVE
        )
        
        if obj_in.difficulty_level != DifficultyLevel.MIXED:
            stmt = stmt.where(Question.difficulty_level == obj_in.difficulty_level)
            
        result = await db.execute(stmt)
        available_questions = result.scalars().all()
        
        if not available_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Not enough active questions in the bank for this configuration."
            )
            
        # 2. Randomly select up to question_count
        selected_questions = random.sample(
            available_questions, 
            min(obj_in.question_count, len(available_questions))
        )
        
        total_marks = sum([int(q.marks) for q in selected_questions])
        
        # 3. Create MockTest
        exam = MockTest(
            student_id=student_id,
            subject_id=obj_in.subject_id,
            test_type=obj_in.test_type,
            difficulty_level=obj_in.difficulty_level,
            duration_minutes=obj_in.duration_minutes,
            total_marks=total_marks,
            status=ExamStatus.DRAFT
        )
        
        exam.questions = selected_questions
        
        db.add(exam)
        await db.commit()
        await db.refresh(exam)
        
        return exam

    async def get_multi(self, db: AsyncSession, student_id: uuid.UUID, skip: int = 0, limit: int = 100) -> Tuple[List[MockTest], int]:
        stmt = select(MockTest).where(MockTest.student_id == student_id)
        
        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0
        
        # Paginate
        stmt = stmt.offset(skip).limit(limit)
        items = (await db.execute(stmt)).scalars().all()
        
        return items, total

    async def get_attempt(self, db: AsyncSession, exam_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        """ Load the attempt with questions and saved answers. """
        stmt = select(MockTest).where(
            MockTest.id == exam_id,
            MockTest.student_id == student_id
        ).options(
            selectinload(MockTest.questions),
        )
        
        result = await db.execute(stmt)
        exam = result.scalars().first()
        
        if not exam:
            raise HTTPException(status_code=404, detail="Exam attempt not found")
            
        return exam

    async def start_exam(self, db: AsyncSession, exam_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        exam = await self.get_attempt(db, exam_id, student_id)
        
        if exam.status != ExamStatus.DRAFT:
            raise HTTPException(status_code=400, detail=f"Exam is already {exam.status}")
            
        # Start server-side timer
        exam.status = ExamStatus.IN_PROGRESS
        exam.started_at = datetime.now(timezone.utc)
        exam.expires_at = exam.started_at + timedelta(minutes=exam.duration_minutes)
        
        await db.commit()
        await db.refresh(exam)
        
        return exam
        
    async def get_saved_answers(self, db: AsyncSession, exam_id: uuid.UUID, student_id: uuid.UUID) -> List[Answer]:
        stmt = select(Answer).where(
            Answer.test_id == exam_id,
            Answer.student_id == student_id
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def save_answer(self, db: AsyncSession, exam_id: uuid.UUID, question_id: uuid.UUID, student_id: uuid.UUID, obj_in: AnswerCreate) -> Answer:
        # Validate exam
        exam = await self.get_attempt(db, exam_id, student_id)
        
        if exam.status != ExamStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Exam is not currently in progress")
            
        # Verify timer
        if datetime.now(timezone.utc) > exam.expires_at:
            # Auto-submit if expired
            exam.status = ExamStatus.EXPIRED
            exam.submitted_at = datetime.now(timezone.utc)
            await db.commit()
            raise HTTPException(status_code=403, detail="Exam time has expired")
            
        # Verify question belongs to exam
        if not any(q.id == question_id for q in exam.questions):
            raise HTTPException(status_code=400, detail="Question is not part of this exam attempt")
            
        # Upsert answer
        stmt = select(Answer).where(
            Answer.test_id == exam_id,
            Answer.question_id == question_id,
            Answer.student_id == student_id
        )
        result = await db.execute(stmt)
        answer = result.scalars().first()
        
        if answer:
            answer.selected_option_id = obj_in.selected_option_id
            answer.answer_text = obj_in.answer_text
            answer.answered_at = datetime.now(timezone.utc)
        else:
            answer = Answer(
                student_id=student_id,
                test_id=exam_id,
                question_id=question_id,
                selected_option_id=obj_in.selected_option_id,
                answer_text=obj_in.answer_text
            )
            db.add(answer)
            
        await db.commit()
        await db.refresh(answer)
        return answer

    async def submit_exam(self, db: AsyncSession, exam_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        exam = await self.get_attempt(db, exam_id, student_id)
        
        if exam.status not in [ExamStatus.IN_PROGRESS, ExamStatus.EXPIRED]:
            raise HTTPException(status_code=400, detail="Exam cannot be submitted in its current state")
            
        exam.status = ExamStatus.SUBMITTED
        exam.submitted_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(exam)
        return exam

exam_engine = ExamEngineService()
