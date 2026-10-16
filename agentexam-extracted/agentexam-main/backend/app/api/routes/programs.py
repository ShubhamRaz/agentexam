from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import SessionDep, get_current_user, require_role
from app.models.user import RoleType
from app.schemas.academic import ProgramResponse, ProgramCreate, SemesterResponse
from app.services import academic as academic_service

router = APIRouter()

@router.get("/", response_model=List[ProgramResponse])
async def read_programs(
    db: SessionDep,
    skip: int = 0,
    limit: int = 20,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Retrieve programs. """
    return await academic_service.get_programs(db, skip=skip, limit=limit)

@router.get("/{program_id}", response_model=ProgramResponse)
async def read_program(
    program_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get a specific program by ID. """
    program = await academic_service.get_program(db, program_id=program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return program

@router.get("/{program_id}/semesters", response_model=List[SemesterResponse])
async def read_program_semesters(
    program_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get all semesters for a specific program. """
    return await academic_service.get_semesters(db, program_id=program_id)

@router.post("/", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
async def create_program(
    program_in: ProgramCreate,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> Any:
    """ Create new program (Admin only). """
    return await academic_service.create_program(db, program_in=program_in)

@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> None:
    """ Delete a program (Admin only). """
    success = await academic_service.delete_program(db, program_id=program_id)
    if not success:
        raise HTTPException(status_code=404, detail="Program not found")
