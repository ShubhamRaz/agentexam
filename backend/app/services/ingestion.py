import uuid
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError
from app.models.academic import Chapter, Topic, StudyMaterial, MaterialAnalysis, MaterialType
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
                # We don't have a PYQ Question table yet, but we will store the raw extraction
                # in the MaterialAnalysis table for future tasks (Task 11: Question Management)
                pass
                
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
