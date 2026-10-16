from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import SessionDep, get_current_user, require_role
from app.models.user import RoleType
from app.schemas.academic import TopicResponse, TopicCreate
from app.services import academic as academic_service

router = APIRouter()

@router.get("/{topic_id}", response_model=TopicResponse)
async def read_topic(
    topic_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(get_current_user),
) -> Any:
    """ Get a specific topic by ID. """
    topic = await academic_service.get_topic(db, topic_id=topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@router.post("/", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    topic_in: TopicCreate,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> Any:
    """ Create new topic (Admin only). """
    return await academic_service.create_topic(db, topic_in=topic_in)

@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: uuid.UUID,
    db: SessionDep,
    current_user: Any = Depends(require_role([RoleType.ADMIN])),
) -> None:
    """ Delete a topic (Admin only). """
    success = await academic_service.delete_topic(db, topic_id=topic_id)
    if not success:
        raise HTTPException(status_code=404, detail="Topic not found")
