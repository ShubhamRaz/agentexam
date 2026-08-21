from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import SessionDep, get_current_user
from app.schemas.academic import MaterialResponse
from app.services import academic as academic_service

router = APIRouter()

@router.get("/", response_model=List[MaterialResponse])
async def read_all_pyqs(
    db: SessionDep,
    subject_id: Optional[uuid.UUID] = Query(None, description="Filter by subject ID"),
    skip: int = 0,
    limit: int = 20,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Retrieve all pyqs. Optionally filter by subject_id. """
    return await academic_service.get_pyqs(db, subject_id=subject_id, skip=skip, limit=limit)

@router.get("/{pyq_id}", response_model=MaterialResponse)
async def read_pyq(
    pyq_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get a specific pyq by ID. """
    pyq = await academic_service.get_pyq(db, pyq_id=pyq_id)
    if not pyq:
        raise HTTPException(status_code=404, detail="PYQ not found")
    return pyq
