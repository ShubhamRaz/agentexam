from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import SessionDep, get_current_user, require_role
from app.models.user import RoleType
from app.schemas.academic import UnitResponse, UnitCreate, TopicResponse
from app.services import academic as academic_service

router = APIRouter()

@router.get("/{unit_id}", response_model=UnitResponse)
async def read_unit(
    unit_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get a specific unit by ID. """
    unit = await academic_service.get_unit(db, unit_id=unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit

@router.get("/{unit_id}/topics", response_model=List[TopicResponse])
async def read_unit_topics(
    unit_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get all topics for a specific unit. """
    return await academic_service.get_topics(db, unit_id=unit_id)

@router.post("/", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    unit_in: UnitCreate,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> Any:
    """ Create new unit (Admin only). """
    return await academic_service.create_unit(db, unit_in=unit_in)

@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(
    unit_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> None:
    """ Delete a unit (Admin only). """
    success = await academic_service.delete_unit(db, unit_id=unit_id)
    if not success:
        raise HTTPException(status_code=404, detail="Unit not found")
