from typing import Any, List, Optional
import uuid
import os
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File, Form, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, get_current_user, get_current_active_user, require_role
from app.models.academic import MaterialType
from app.models.user import RoleType, Admin
from app.schemas.material import MaterialResponse, MaterialUpdate
from app.services import material as material_service
from app.services.storage import get_storage_provider, StorageProvider
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.processing import ProcessingOrchestrator

router = APIRouter()


async def run_processing_task(material_id: uuid.UUID):
    """Background task: run full document processing pipeline for a material."""
    import logging
    _logger = logging.getLogger(__name__)
    try:
        async with AsyncSessionLocal() as db_session:
            orchestrator = ProcessingOrchestrator(db_session)
            await orchestrator.process_material_sync(material_id)
    except Exception as exc:
        # Log but do not propagate — background task failures must not crash the server
        _logger.error(f"Background processing task failed for material {material_id}: {exc}")

@router.post("/upload", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def upload_material(
    request: Request,
    background_tasks: BackgroundTasks,
    db: SessionDep,
    title: str = Form(...),
    material_type: MaterialType = Form(...),
    subject_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    # Any authenticated and active user may upload their own materials (REQ-1.1)
    current_user: Any = Depends(get_current_active_user),
) -> Any:
    """ Upload a new academic material. Available to all authenticated users (students, teachers, admins). """
    # Validate file size if content-length header is present
    content_length = request.headers.get('content-length')
    if content_length:
        if int(content_length) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")
            
    storage = get_storage_provider()
    
    # Material service will handle subject validation and DB transactions
    material = await material_service.upload_material(
        db=db,
        storage=storage,
        file=file,
        title=title,
        material_type=material_type,
        subject_id=subject_id,
        uploader_id=current_user.id
    )

    # Auto-trigger document processing in background (REQ-1.2, REQ-1.3)
    background_tasks.add_task(run_processing_task, material.id)

    return material


@router.get("/", response_model=List[MaterialResponse])
async def read_materials(
    db: SessionDep,
    subject_id: Optional[uuid.UUID] = Query(None, description="Filter by subject ID"),
    material_type: Optional[MaterialType] = Query(None, description="Filter by material type"),
    processing_status: Optional[str] = Query(None, description="Filter by processing status"),
    skip: int = 0,
    limit: int = 20,
    current_user: Any = Depends(get_current_active_user),
) -> Any:
    """ List materials. Students see only their own uploads; admins/teachers see all. """
    # Students are scoped to their own uploads for data isolation (SRS §5.3)
    uploader_id = None
    if current_user.role == RoleType.STUDENT:
        uploader_id = current_user.id

    return await material_service.get_materials(
        db=db,
        subject_id=subject_id,
        material_type=material_type,
        processing_status=processing_status,
        uploader_id=uploader_id,
        skip=skip,
        limit=limit
    )


@router.get("/{material_id}", response_model=MaterialResponse)
async def read_material(
    material_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_active_user),
) -> Any:
    """ Get material metadata by ID. """
    material = await material_service.get_material(db, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    # Data isolation: Students can only view their own uploaded materials
    if current_user.role == RoleType.STUDENT and material.uploaded_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this material")
    return material


@router.get("/{material_id}/download")
async def download_material(
    material_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_active_user),
) -> Any:
    """ Download or access the material file. """
    material = await material_service.get_material(db, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    # Data isolation: Students can only download their own uploaded materials
    if current_user.role == RoleType.STUDENT and material.uploaded_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to download this material")
        
    storage = get_storage_provider()
    try:
        file_path = await storage.get(material.storage_key)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing in storage")
        
    # FileResponse handles returning the file safely as a stream
    # Ensure it's returning a local path correctly
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename=material.file_name,
            media_type=material.mime_type
        )
    else:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing in storage")


@router.patch("/{material_id}", response_model=MaterialResponse)
async def update_material_metadata(
    material_id: uuid.UUID,
    update_data: MaterialUpdate,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> Any:
    """ Update material metadata (Admin only). """
    material = await material_service.update_material(db, material_id, update_data)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
    return material


@router.delete("/{material_id}")
async def delete_material(
    material_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_active_user),
) -> None:
    """ Delete material (Admin or original uploader). """
    material = await material_service.get_material(db, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")
        
    # Authorization logic
    if current_user.role != RoleType.ADMIN and material.uploaded_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this material")
        
    storage = get_storage_provider()
    success = await material_service.delete_material(db, storage, material_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete material")

@router.post("/{material_id}/process", status_code=status.HTTP_202_ACCEPTED)
async def process_material(
    material_id: uuid.UUID,
    db: SessionDep,
    background_tasks: BackgroundTasks,
    current_user: Any = Depends(get_current_active_user),
) -> Any:
    """ Re-trigger document processing for an uploaded material (available to owner or admin). """
    material = await material_service.get_material(db, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found")

    # Only the uploader or an admin may reprocess
    if current_user.role != RoleType.ADMIN and material.uploaded_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to process this material")

    if material.processing_status == "PROCESSING":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material is already processing")

    # Reset status so orchestrator will reprocess
    material.processing_status = "UPLOADED"
    await db.commit()

    background_tasks.add_task(run_processing_task, material_id)

    return {"message": "Processing started", "material_id": material_id}
