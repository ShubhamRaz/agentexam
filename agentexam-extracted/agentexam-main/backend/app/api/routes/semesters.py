from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import SessionDep, get_current_user, require_role
from app.models.user import RoleType
from app.schemas.academic import SemesterResponse, SemesterCreate, SubjectResponse
from app.services import academic as academic_service

router = APIRouter()

@router.get("/{semester_id}", response_model=SemesterResponse)
async def read_semester(
    semester_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get a specific semester by ID. """
    semester = await academic_service.get_semester(db, semester_id=semester_id)
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    return semester

@router.get("/{semester_id}/subjects", response_model=List[SubjectResponse])
async def read_semester_subjects(
    semester_id: uuid.UUID,
    db: SessionDep,
    skip: int = 0,
    limit: int = 20,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get all subjects for a specific semester. """
    return await academic_service.get_subjects(db, semester_id=semester_id, skip=skip, limit=limit)

@router.post("/", response_model=SemesterResponse, status_code=status.HTTP_201_CREATED)
async def create_semester(
    semester_in: SemesterCreate,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> Any:
    """ Create new semester (Admin only). """
    return await academic_service.create_semester(db, semester_in=semester_in)

@router.delete("/{semester_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_semester(
    semester_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> None:
    """ Delete a semester (Admin only). """
    success = await academic_service.delete_semester(db, semester_id=semester_id)
    if not success:
        raise HTTPException(status_code=404, detail="Semester not found")
