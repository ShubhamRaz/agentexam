import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleType
from app.schemas.performance import (
    WeakTopicResponse, 
    RecommendedDifficultyResponse,
    TopicPerformanceResponse,
    PerformanceOverviewResponse
)
from app.schemas.readiness import ReadinessResponse
from app.services.performance import performance_service
from app.services.readiness import readiness_service

router = APIRouter()

def ensure_student(user: User):
    """ Only students should access their own performance data directly """
    if user.role != RoleType.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only students can access these performance endpoints"
        )

@router.get("/me", response_model=PerformanceOverviewResponse)
async def get_my_performance_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get the overall performance analytics for the currently authenticated student """
    ensure_student(current_user)
    return await performance_service.get_performance_overview(db, current_user.id)

@router.get("/me/topics", response_model=List[TopicPerformanceResponse])
async def get_my_topics_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get performance metrics for all topics the student has answered """
    ensure_student(current_user)
    return await performance_service.get_topic_performance(db, current_user.id)

@router.get("/me/strong-topics", response_model=List[TopicPerformanceResponse])
async def get_my_strong_topics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get a list of topics where the student falls above the STRONG_TOPIC_THRESHOLD """
    ensure_student(current_user)
    return await performance_service.get_strong_topics(db, current_user.id)

@router.get("/me/weak-topics", response_model=List[WeakTopicResponse])
async def get_my_weak_topics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get a list of topics where the student falls below the configurable WEAK_TOPIC_THRESHOLD """
    ensure_student(current_user)
    return await performance_service.get_weak_topics(db, current_user.id)

@router.get("/me/topics/{topic_id}/difficulty", response_model=RecommendedDifficultyResponse)
async def get_topic_recommended_difficulty(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get the recommended DifficultyLevel for a topic based on the student's historical performance """
    ensure_student(current_user)
    return await performance_service.get_recommended_difficulty(db, current_user.id, topic_id)

@router.get("/me/readiness", response_model=ReadinessResponse)
async def get_my_readiness(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get the readiness score, risk areas, and recommendations for the student """
    ensure_student(current_user)
    return await readiness_service.get_readiness(db, current_user.id)
