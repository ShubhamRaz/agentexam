import uuid
import random
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.models.exam import MockTest, Question, Answer, Evaluation, ExamStatus, TestType, QuestionStatus, QuestionType
from app.schemas.viva import VivaSessionCreate, VivaAnswerCreate, VivaEvaluationUpdate

class VivaService:
    async def create_viva_session(self, db: AsyncSession, student_id: uuid.UUID, obj_in: VivaSessionCreate) -> MockTest:
        """ Generate a new Viva session by pulling random VIVA questions. """
        
        # Fetch available active VIVA questions
        stmt = select(Question).where(
            Question.subject_id == obj_in.subject_id,
            Question.status == QuestionStatus.ACTIVE,
            Question.question_type == QuestionType.VIVA,
            Question.difficulty_level == obj_in.difficulty_level
        )
        
        result = await db.execute(stmt)
        available_questions = result.scalars().all()
        
        if not available_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Not enough active VIVA questions in the bank for this configuration."
            )
            
        selected_questions = random.sample(
            available_questions, 
            min(obj_in.question_count, len(available_questions))
        )
        
        total_marks = sum([float(q.marks) for q in selected_questions])
        
        exam = MockTest(
            student_id=student_id,
            subject_id=obj_in.subject_id,
            test_type=TestType.VIVA,
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
        stmt = select(MockTest).where(
            MockTest.student_id == student_id,
            MockTest.test_type == TestType.VIVA
        )
        
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0
        
        stmt = stmt.offset(skip).limit(limit)
        items = (await db.execute(stmt)).scalars().all()
        
        return items, total

    async def get_session(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        """ Load the viva attempt with questions. """
        stmt = select(MockTest).where(
            MockTest.id == session_id,
            MockTest.student_id == student_id,
            MockTest.test_type == TestType.VIVA
        ).options(
            selectinload(MockTest.questions),
        )
        
        result = await db.execute(stmt)
        exam = result.scalars().first()
        
        if not exam:
            raise HTTPException(status_code=404, detail="Viva session not found")
            
        return exam

    async def start_session(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        session = await self.get_session(db, session_id, student_id)
        
        if session.status != ExamStatus.DRAFT:
            raise HTTPException(status_code=400, detail=f"Session is already {session.status}")
            
        # Start server-side timer
        session.status = ExamStatus.IN_PROGRESS
        session.started_at = datetime.utcnow()
        session.expires_at = session.started_at + timedelta(minutes=session.duration_minutes)
        
        await db.commit()
        await db.refresh(session)
        
        return session
        
    async def get_saved_answers(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID) -> List[Answer]:
        stmt = select(Answer).where(
            Answer.test_id == session_id,
            Answer.student_id == student_id
        ).options(
            selectinload(Answer.evaluation)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def save_answer(self, db: AsyncSession, session_id: uuid.UUID, question_id: uuid.UUID, student_id: uuid.UUID, obj_in: VivaAnswerCreate) -> Answer:
        session = await self.get_session(db, session_id, student_id)
        
        if session.status != ExamStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Session is not currently in progress")
            
        if datetime.utcnow() > session.expires_at:
            session.status = ExamStatus.EXPIRED
            session.submitted_at = datetime.utcnow()
            await db.commit()
            raise HTTPException(status_code=403, detail="Session time has expired")
            
        if not any(q.id == question_id for q in session.questions):
            raise HTTPException(status_code=400, detail="Question is not part of this viva session")
            
        stmt = select(Answer).where(
            Answer.test_id == session_id,
            Answer.question_id == question_id,
            Answer.student_id == student_id
        )
        result = await db.execute(stmt)
        answer = result.scalars().first()
        
        if answer:
            answer.answer_text = obj_in.answer_text
            answer.answered_at = datetime.utcnow()
        else:
            answer = Answer(
                student_id=student_id,
                test_id=session_id,
                question_id=question_id,
                answer_text=obj_in.answer_text
            )
            db.add(answer)
            
        await db.commit()
        await db.refresh(answer)
        return answer

    async def submit_session(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        session = await self.get_session(db, session_id, student_id)
        
        if session.status not in [ExamStatus.IN_PROGRESS, ExamStatus.EXPIRED]:
            raise HTTPException(status_code=400, detail="Session cannot be submitted in its current state")
            
        session.status = ExamStatus.SUBMITTED
        session.submitted_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(session)
        return session
        
    async def evaluate_answer(
        self, 
        db: AsyncSession, 
        session_id: uuid.UUID, 
        question_id: uuid.UUID, 
        student_id: uuid.UUID,
        evaluator_id: uuid.UUID, 
        obj_in: VivaEvaluationUpdate
    ) -> Evaluation:
        session = await self.get_session(db, session_id, student_id)
        
        if session.status != ExamStatus.SUBMITTED and session.status != ExamStatus.EVALUATED:
            raise HTTPException(status_code=400, detail="Session must be submitted before evaluation")
            
        stmt = select(Answer).where(
            Answer.test_id == session_id,
            Answer.question_id == question_id,
            Answer.student_id == student_id
        ).options(selectinload(Answer.evaluation))
        result = await db.execute(stmt)
        answer = result.scalars().first()
        
        if not answer:
            raise HTTPException(status_code=404, detail="Answer not found")
            
        if answer.evaluation:
            answer.evaluation.marks_obtained = obj_in.marks_obtained
            answer.evaluation.feedback = obj_in.feedback
            answer.evaluation.evaluated_by = evaluator_id
            evaluation = answer.evaluation
        else:
            evaluation = Evaluation(
                answer_id=answer.id,
                evaluated_by=evaluator_id,
                marks_obtained=obj_in.marks_obtained,
                feedback=obj_in.feedback
            )
            db.add(evaluation)
            
        session.status = ExamStatus.EVALUATED
            
        await db.commit()
        await db.refresh(evaluation)
        return evaluation

viva_service = VivaService()
