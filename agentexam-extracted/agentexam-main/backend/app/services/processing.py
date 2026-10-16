import os
import uuid
import traceback
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.academic import StudyMaterial
from app.services.document_processor import DocumentProcessor
from app.services.extractor import StructureExtractor
from app.services.ingestion import DataIngestionService
from app.core.config import settings

logger = logging.getLogger(__name__)

class ProcessingOrchestrator:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.processor = DocumentProcessor()
        self.extractor = StructureExtractor()
        self.ingestion = DataIngestionService(db)

    async def process_material_sync(self, material_id: uuid.UUID) -> None:
        """
        Runs the full document processing pipeline synchronously for background jobs.
        """
        stmt = select(StudyMaterial).where(StudyMaterial.id == material_id)
        result = await self.db.execute(stmt)
        material = result.scalars().first()
        
        if not material:
            logger.error(f"Material {material_id} not found for processing.")
            return

        if material.processing_status == "PROCESSED":
            logger.info(f"Material {material_id} is already processed.")
            return

        # Start Processing
        material.processing_status = "PROCESSING"
        await self.db.commit()

        try:
            # 1. Resolve file path
            file_path = os.path.join(settings.STORAGE_PATH, material.storage_key)
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found on disk: {file_path}")

            # 2. Extract Text
            # We determine type from material metadata, or fallback to file extension
            file_ext = material.storage_key.split(".")[-1].lower() if "." in material.storage_key else "pdf"
            text = self.processor.extract_text(file_path, file_ext)

            # 3. Extract Structure
            extracted_data = self.extractor.extract(text, material.material_type)

            # 4. Ingest to DB
            await self.ingestion.ingest(material, extracted_data)

            # 4.5. Index for RAG
            from app.services.rag import rag_service
            await rag_service.index_document(self.db, material, text)

            # 5. Mark Complete
            material.processing_status = "PROCESSED"
            material.processed_at = datetime.utcnow()
            material.processing_error = None
            await self.db.commit()
            
            logger.info(f"Material {material_id} processed successfully.")

        except Exception as e:
            await self.db.rollback()
            # Fetch material again since rollback detached it
            stmt = select(StudyMaterial).where(StudyMaterial.id == material_id)
            result = await self.db.execute(stmt)
            material = result.scalars().first()
            if material:
                material.processing_status = "FAILED"
                material.processed_at = datetime.utcnow()
                material.processing_error = traceback.format_exc()
                await self.db.commit()
            logger.error(f"Failed to process material {material_id}: {str(e)}")
