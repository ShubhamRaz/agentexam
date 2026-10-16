import uuid
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from app.models.academic import Chapter, Topic, StudyMaterial, MaterialAnalysis, MaterialType
from app.models.exam import Question, QuestionSource, QuestionStatus, QuestionType, DifficultyLevel
import logging

logger = logging.getLogger(__name__)

class DataIngestionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ingest(self, material: StudyMaterial, extracted_data: Dict[str, Any]) -> None:
        """
        Ingest extracted data into the database models.
        """
        try:
            # Create or update MaterialAnalysis record
            stmt = select(MaterialAnalysis).where(MaterialAnalysis.material_id == material.id)
            result = await self.db.execute(stmt)
            analysis = result.scalars().first()
            
            if not analysis:
                analysis = MaterialAnalysis(material_id=material.id)
                self.db.add(analysis)
                
            # Store raw extracted data in topics_extracted as JSON
            analysis.topics_extracted = extracted_data
            
            if material.material_type == MaterialType.SYLLABUS:
                await self._ingest_syllabus(material.subject_id, extracted_data)
                
            elif material.material_type == MaterialType.PYQ:
                await self._ingest_pyq(material, extracted_data)
                
            await self.db.commit()
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Ingestion failed for material {material.id}: {str(e)}")
            raise e


    async def _ingest_syllabus(self, subject_id: uuid.UUID, extracted_data: Dict[str, Any]) -> None:
        """
        Create Chapters (Units) and Topics if they don't exist.
        """
        units = extracted_data.get("units", [])
        
        for idx, unit_data in enumerate(units):
            unit_name = unit_data.get("name")
            if not unit_name:
                continue
                
            # Check if chapter exists
            stmt = select(Chapter).where(
                Chapter.subject_id == subject_id,
                Chapter.name == unit_name
            )
            result = await self.db.execute(stmt)
            chapter = result.scalars().first()
            
            if not chapter:
                chapter_no = idx + 1
                chapter = Chapter(
                    subject_id=subject_id,
                    name=unit_name,
                    chapter_no=chapter_no
                )
                self.db.add(chapter)
                await self.db.flush() # To get chapter.id
                
            topics = unit_data.get("topics", [])
            for topic_name in topics:
                if not topic_name:
                    continue
                    
                # Check if topic exists
                stmt_topic = select(Topic).where(
                    Topic.chapter_id == chapter.id,
                    Topic.name == topic_name
                )
                res_topic = await self.db.execute(stmt_topic)
                topic = res_topic.scalars().first()
                
                if not topic:
                    topic = Topic(
                        chapter_id=chapter.id,
                        name=topic_name
                    )
                    self.db.add(topic)
                    
        await self.db.flush()

    async def _ingest_pyq(self, material: StudyMaterial, extracted_data: Dict[str, Any]) -> None:
        """
        Create Question records from extracted PYQ data.
        Links questions to existing subject topics/chapters where keyword matches occur.
        Questions are marked REVIEW_REQUIRED as heuristic extraction may be imperfect.
        """
        questions_data = extracted_data.get("questions", [])
        if not questions_data:
            logger.info(f"No questions found in PYQ material {material.id}")
            return

        # Fetch existing topics for this subject to correlate questions to topics
        stmt = (
            select(Topic, Chapter)
            .join(Chapter, Topic.chapter_id == Chapter.id)
            .where(Chapter.subject_id == material.subject_id)
        )
        t_res = await self.db.execute(stmt)
        subject_topics = t_res.all()

        created = 0
        for q_data in questions_data:
            q_text = q_data.get("text", "").strip()
            if not q_text or len(q_text) < 5:
                # Skip trivially short/empty extractions
                continue

            marks_val = q_data.get("marks")
            marks = float(marks_val) if marks_val is not None else 1.0

            # Match question text to existing topics in this subject
            matched_topic_id = None
            matched_chapter_id = None
            q_lower = q_text.lower()

            for topic_obj, chapter_obj in subject_topics:
                t_name = topic_obj.name.strip().lower()
                # Check for direct topic name or distinctive words (>3 chars)
                if t_name and (t_name in q_lower or any(w in q_lower for w in t_name.split() if len(w) > 4)):
                    matched_topic_id = topic_obj.id
                    matched_chapter_id = chapter_obj.id
                    break

            question = Question(
                subject_id=material.subject_id,
                chapter_id=matched_chapter_id,
                topic_id=matched_topic_id,
                question_type=QuestionType.SHORT_ANSWER,  # Conservative default
                question_text=q_text,
                options=None,
                correct_answer=None,
                explanation=None,
                marks=marks,
                difficulty_level=DifficultyLevel.MEDIUM,
                source=QuestionSource.PYQ,
                source_reference=str(material.id),  # Link back to source material
                status=QuestionStatus.ACTIVE,  # Available immediately to students
                created_by=material.uploaded_by,
            )
            self.db.add(question)
            created += 1

        await self.db.flush()
        logger.info(f"Ingested {created} PYQ questions from material {material.id}")
