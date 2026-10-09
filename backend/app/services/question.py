import uuid
from typing import List, Optional, Tuple, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from app.models.exam import Question, QuestionStatus, QuestionSource, QuestionType, DifficultyLevel
from app.schemas.question import QuestionCreate, QuestionUpdate

class QuestionService:
    async def create(self, db: AsyncSession, obj_in: QuestionCreate, user_id: uuid.UUID) -> Question:
        # Convert Pydantic options (List of OptionAdmin) to raw dicts for JSONB
        options_dict = None
        if obj_in.options:
            options_dict = [opt.dict() for opt in obj_in.options]
            
        db_obj = Question(
            subject_id=obj_in.subject_id,
            chapter_id=obj_in.chapter_id,
            topic_id=obj_in.topic_id,
            question_type=obj_in.question_type,
            question_text=obj_in.question_text,
            marks=obj_in.marks,
            difficulty_level=obj_in.difficulty_level,
            source=obj_in.source,
            source_reference=obj_in.source_reference,
            status=obj_in.status,
            options=options_dict,
            correct_answer=obj_in.correct_answer,
            explanation=obj_in.explanation,
            created_by=user_id
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get(self, db: AsyncSession, id: uuid.UUID) -> Optional[Question]:
        stmt = select(Question).where(Question.id == id)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_multi(
        self, 
        db: AsyncSession, 
        *, 
        skip: int = 0, 
        limit: int = 100,
        subject_id: Optional[uuid.UUID] = None,
        chapter_id: Optional[uuid.UUID] = None,
        topic_id: Optional[uuid.UUID] = None,
        difficulty_level: Optional[DifficultyLevel] = None,
        question_type: Optional[QuestionType] = None,
        source: Optional[QuestionSource] = None,
        status: Optional[QuestionStatus] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Question], int]:
        from sqlalchemy.orm import selectinload
        stmt = select(Question).options(selectinload(Question.subject), selectinload(Question.topic))
        
        # Apply filters
        if subject_id:
            stmt = stmt.where(Question.subject_id == subject_id)
        if chapter_id:
            stmt = stmt.where(Question.chapter_id == chapter_id)
        if topic_id:
            stmt = stmt.where(Question.topic_id == topic_id)
        if difficulty_level:
            stmt = stmt.where(Question.difficulty_level == difficulty_level)
        if question_type:
            stmt = stmt.where(Question.question_type == question_type)
        if source:
            stmt = stmt.where(Question.source == source)
        if status:
            stmt = stmt.where(Question.status == status)
            
        if search:
            stmt = stmt.where(Question.question_text.ilike(f"%{search}%"))
            
        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await db.execute(count_stmt)
        total = count_result.scalar() or 0
        
        # Apply pagination
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        items = result.scalars().all()
        
        return items, total

    async def update(self, db: AsyncSession, db_obj: Question, obj_in: QuestionUpdate) -> Question:
        update_data = obj_in.dict(exclude_unset=True)
        
        if "options" in update_data and update_data["options"] is not None:
            update_data["options"] = [opt.dict() for opt in obj_in.options]
            
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def archive(self, db: AsyncSession, id: uuid.UUID) -> bool:
        obj = await self.get(db, id)
        if not obj:
            return False
        
        obj.status = QuestionStatus.ARCHIVED
        await db.commit()
        return True

    async def ingest_pyq(self, db: AsyncSession, extracted_data: Dict[str, Any], subject_id: uuid.UUID, source_ref: str) -> None:
        """
        Ingest PYQs from DocumentProcessing (Task 10).
        """
        questions = extracted_data.get("questions", [])
        
        for q_data in questions:
            q_text = q_data.get("text")
            if not q_text:
                continue
                
            # Duplicate detection (basic exact match + subject)
            stmt = select(Question).where(
                Question.subject_id == subject_id,
                Question.question_text == q_text
            )
            result = await db.execute(stmt)
            existing = result.scalars().first()
            
            if existing:
                continue # Skip exact duplicate
                
            marks = float(q_data.get("marks") or 1.0)
            
            # Simple heuristic for type
            q_type = QuestionType.SHORT_ANSWER if marks <= 5 else QuestionType.LONG_ANSWER
            
            db_obj = Question(
                subject_id=subject_id,
                question_type=q_type,
                question_text=q_text,
                marks=marks,
                difficulty_level=DifficultyLevel.MEDIUM, # Default
                source=QuestionSource.PYQ,
                source_reference=source_ref,
                status=QuestionStatus.REVIEW_REQUIRED # Requires teacher review
            )
            db.add(db_obj)
            
        await db.commit()

question_service = QuestionService()
