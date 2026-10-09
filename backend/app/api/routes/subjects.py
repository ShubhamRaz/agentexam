from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import SessionDep, get_current_user, get_current_active_user, require_role
from app.models.user import RoleType
from app.schemas.academic import SubjectResponse, SubjectCreate, UnitResponse, MaterialResponse
from app.services import academic as academic_service

router = APIRouter()

@router.get("/", response_model=List[SubjectResponse])
async def read_subjects(
    db: SessionDep,
    semester_id: Optional[uuid.UUID] = Query(None, description="Filter by semester ID"),
    skip: int = 0,
    limit: int = 20,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Retrieve subjects. Optionally filter by semester_id. """
    return await academic_service.get_subjects(db, semester_id=semester_id, skip=skip, limit=limit)

@router.get("/{subject_id}", response_model=SubjectResponse)
async def read_subject(
    subject_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get a specific subject by ID. """
    subject = await academic_service.get_subject(db, subject_id=subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.get("/{subject_id}/units", response_model=List[UnitResponse])
async def read_subject_units(
    subject_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get all units for a specific subject. """
    # Fetch units, topics will be lazy-loaded or we can use eager loading in real DB. 
    # For now, it returns the Chapter objects which Pydantic will serialize.
    return await academic_service.get_units(db, subject_id=subject_id)

@router.get("/{subject_id}/syllabus", response_model=List[MaterialResponse])
async def read_subject_syllabus(
    subject_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get syllabus materials for a specific subject. """
    return await academic_service.get_subject_syllabus(db, subject_id=subject_id)

@router.get("/{subject_id}/pyqs", response_model=List[MaterialResponse])
async def read_subject_pyqs(
    subject_id: uuid.UUID,
    db: SessionDep,
    skip: int = 0,
    limit: int = 20,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get pyqs for a specific subject. """
    return await academic_service.get_pyqs(db, subject_id=subject_id, skip=skip, limit=limit)

@router.post("/", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_subject(
    subject_in: SubjectCreate,
    db: SessionDep,
    current_user: Any = Depends(get_current_active_user),
) -> Any:
    """ Create new subject. """
    return await academic_service.create_subject(db, subject_in=subject_in)

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> None:
    """ Delete a subject (Admin only). """
    success = await academic_service.delete_subject(db, subject_id=subject_id)
    if not success:
        raise HTTPException(status_code=404, detail="Subject not found")
