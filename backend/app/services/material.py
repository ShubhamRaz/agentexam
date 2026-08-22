import uuid
import os
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import UploadFile, HTTPException, status

from app.models.academic import StudyMaterial, MaterialType, Subject
from app.schemas.material import MaterialUpdate
from app.services.storage import StorageProvider

# Supported extensions mapping
SUPPORTED_MIME_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/plain": "txt",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
}

async def upload_material(
    db: AsyncSession,
    storage: StorageProvider,
    file: UploadFile,
    title: str,
    material_type: MaterialType,
    subject_id: uuid.UUID,
    uploader_id: uuid.UUID
) -> StudyMaterial:
    
    # 1. Validate subject exists
    subject_result = await db.execute(select(Subject).where(Subject.id == subject_id))
    if not subject_result.scalars().first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
        
    # 2. Validate file type
    if file.content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, 
            detail="Unsupported file type. Allowed: PDF, DOC, DOCX, TXT, PNG, JPG, JPEG"
        )
    file_type = SUPPORTED_MIME_TYPES[file.content_type]
    
    # 3. Size is validated by FastAPI middleware / logic in the router, but we check here too
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    # Generate storage key
    file_uuid = uuid.uuid4()
    storage_key = f"materials/{subject_id}/{file_uuid}.{file_type}"
    
    # 4. Save to storage
    try:
        await storage.save(file, storage_key)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Storage failure")
        
    # 5. Save to DB
    material = StudyMaterial(
        subject_id=subject_id,
        uploaded_by=uploader_id,
        material_type=material_type,
        title=title,
        file_name=file.filename or f"unknown.{file_type}",
        file_type=file_type,
        mime_type=file.content_type,
        file_size=file_size,
        storage_key=storage_key,
        processing_status="UPLOADED"
    )
    
    try:
        db.add(material)
        await db.commit()
        await db.refresh(material)
    except Exception as e:
        await db.rollback()
        # Clean up storage if DB fails
        await storage.delete(storage_key)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database failure")
        
    return material


async def get_materials(
    db: AsyncSession,
    subject_id: Optional[uuid.UUID] = None,
    material_type: Optional[MaterialType] = None,
    processing_status: Optional[str] = None,
    uploader_id: Optional[uuid.UUID] = None,
    skip: int = 0,
    limit: int = 20
) -> List[StudyMaterial]:
    query = select(StudyMaterial)
    if subject_id:
        query = query.where(StudyMaterial.subject_id == subject_id)
    if material_type:
        query = query.where(StudyMaterial.material_type == material_type)
    if processing_status:
        query = query.where(StudyMaterial.processing_status == processing_status)
    if uploader_id:
        query = query.where(StudyMaterial.uploaded_by == uploader_id)
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


async def get_material(db: AsyncSession, material_id: uuid.UUID) -> Optional[StudyMaterial]:
    result = await db.execute(select(StudyMaterial).where(StudyMaterial.id == material_id))
    return result.scalars().first()


async def update_material(
    db: AsyncSession,
    material_id: uuid.UUID,
    update_data: MaterialUpdate
) -> Optional[StudyMaterial]:
    material = await get_material(db, material_id)
    if not material:
        return None
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(material, field, value)
        
    await db.commit()
    await db.refresh(material)
    return material


async def delete_material(
    db: AsyncSession,
    storage: StorageProvider,
    material_id: uuid.UUID
) -> bool:
    material = await get_material(db, material_id)
    if not material:
        return False
        
    # Attempt DB delete first to prevent orphaned records without files
    storage_key = material.storage_key
    await db.delete(material)
    
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        return False
        
    # Attempt to delete file. Even if it fails, the DB record is gone, 
    # which is generally safer than the other way around.
    await storage.delete(storage_key)
    return True
