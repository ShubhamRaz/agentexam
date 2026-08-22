import asyncio
import os
import sys

from app.db.session import AsyncSessionLocal
from app.models.academic import StudyMaterial
from sqlalchemy.future import select
from app.services.processing import ProcessingOrchestrator

async def main():
    async with AsyncSessionLocal() as db_session:
        stmt = select(StudyMaterial).where(StudyMaterial.processing_status == "FAILED")
        result = await db_session.execute(stmt)
        materials = result.scalars().all()
        
        if not materials:
            print("No FAILED materials found.")
            return

        orchestrator = ProcessingOrchestrator(db_session)
        for material in materials:
            print(f"Reprocessing material {material.id} - {material.title}")
            material.processing_status = "UPLOADED"
            await db_session.commit()
            
            await orchestrator.process_material_sync(material.id)
            
            stmt = select(StudyMaterial).where(StudyMaterial.id == material.id)
            res = await db_session.execute(stmt)
            updated = res.scalars().first()
            print(f"Result for {updated.id}: {updated.processing_status}")
            if updated.processing_error:
                print(f"Error: {updated.processing_error}")

if __name__ == "__main__":
    asyncio.run(main())
