import uuid
import random
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.models.exam import MockTest, ExamStatus, TestType
from app.models.practical import Experiment, PracticalSubmission, PracticalEvaluation
from app.schemas.practical import PracticalSessionCreate, PracticalSubmissionCreate

class PracticalService:
    async def create_practical_session(self, db: AsyncSession, student_id: uuid.UUID, obj_in: PracticalSessionCreate) -> MockTest:
        """ Generate a new practical session (MockTest with type PRACTICAL) by pulling random experiments. """
        
        # 1. Fetch available experiments for the subject
        stmt = select(Experiment).where(
            Experiment.subject_id == obj_in.subject_id
        )
        
        result = await db.execute(stmt)
        available_experiments = result.scalars().all()
        
        if not available_experiments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Not enough experiments available for this subject."
            )
            
        # 2. Randomly select 1 experiment for the session (can be configured for more)
        selected_experiments = random.sample(
            available_experiments, 
            min(1, len(available_experiments))
        )
        
        total_marks = sum([float(e.marks) for e in selected_experiments])
        
        # 3. Create MockTest as the Practical Session
        exam = MockTest(
            student_id=student_id,
            subject_id=obj_in.subject_id,
            test_type=TestType.PRACTICAL,
            difficulty_level=obj_in.difficulty_level,
            duration_minutes=obj_in.duration_minutes,
            total_marks=total_marks,
            status=ExamStatus.DRAFT
        )
        
        exam.experiments = selected_experiments
        
        db.add(exam)
        await db.commit()
        await db.refresh(exam)
        
        return exam

    async def get_multi(self, db: AsyncSession, student_id: uuid.UUID, skip: int = 0, limit: int = 100) -> Tuple[List[MockTest], int]:
        stmt = select(MockTest).where(
            MockTest.student_id == student_id,
            MockTest.test_type == TestType.PRACTICAL
        )
        
        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0
        
        # Paginate
        stmt = stmt.offset(skip).limit(limit)
        items = (await db.execute(stmt)).scalars().all()
        
        return items, total

    async def get_session(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        """ Load the practical session with experiments. """
        stmt = select(MockTest).where(
            MockTest.id == session_id,
            MockTest.student_id == student_id,
            MockTest.test_type == TestType.PRACTICAL
        ).options(
            selectinload(MockTest.experiments)
        )
        
        result = await db.execute(stmt)
        session = result.scalars().first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Practical session not found")
            
        return session

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

    async def get_submissions(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID) -> List[PracticalSubmission]:
        stmt = select(PracticalSubmission).where(
            PracticalSubmission.test_id == session_id,
            PracticalSubmission.student_id == student_id
        ).options(
            selectinload(PracticalSubmission.evaluation)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def save_submission(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID, obj_in: PracticalSubmissionCreate) -> PracticalSubmission:
        # Validate session
        session = await self.get_session(db, session_id, student_id)
        
        if session.status != ExamStatus.IN_PROGRESS:
            raise HTTPException(status_code=400, detail="Practical session is not currently in progress")
            
        # Verify timer
        if datetime.utcnow() > session.expires_at:
            # Auto-submit if expired
            session.status = ExamStatus.EXPIRED
            session.submitted_at = datetime.utcnow()
            await db.commit()
            raise HTTPException(status_code=403, detail="Practical session time has expired")
            
        # Verify experiment belongs to session
        if not any(e.id == obj_in.experiment_id for e in session.experiments):
            raise HTTPException(status_code=400, detail="Experiment is not part of this practical session")
            
        # Upsert submission
        stmt = select(PracticalSubmission).where(
            PracticalSubmission.test_id == session_id,
            PracticalSubmission.experiment_id == obj_in.experiment_id,
            PracticalSubmission.student_id == student_id
        )
        result = await db.execute(stmt)
        submission = result.scalars().first()
        
        if submission:
            submission.answer_text = obj_in.answer_text
            submission.file_reference = obj_in.file_reference
            submission.submitted_at = datetime.utcnow()
        else:
            submission = PracticalSubmission(
                student_id=student_id,
                test_id=session_id,
                experiment_id=obj_in.experiment_id,
                answer_text=obj_in.answer_text,
                file_reference=obj_in.file_reference
            )
            db.add(submission)
            
        await db.commit()
        await db.refresh(submission)
        return submission

    async def submit_session(self, db: AsyncSession, session_id: uuid.UUID, student_id: uuid.UUID) -> MockTest:
        session = await self.get_session(db, session_id, student_id)
        
        if session.status not in [ExamStatus.IN_PROGRESS, ExamStatus.EXPIRED]:
            raise HTTPException(status_code=400, detail="Practical session cannot be submitted in its current state")
            
        session.status = ExamStatus.SUBMITTED
        session.submitted_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(session)
        return session

practical_service = PracticalService()
