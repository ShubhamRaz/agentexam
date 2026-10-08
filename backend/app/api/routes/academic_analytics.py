"""
GET /api/v1/academic-analytics/topic-frequency
GET /api/v1/academic-analytics/question-patterns

Task 3 — DATA ANALYSIS endpoints.
All responses are scoped to the requesting student's own uploaded materials.
"""
import uuid
from typing import Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SessionDep, get_current_active_user
from app.models.user import User
from app.services import academic_analytics as analytics_service

router = APIRouter()


@router.get("/topic-frequency")
async def topic_frequency(
    subject_id: uuid.UUID = Query(..., description="Subject to analyse"),
    db: SessionDep = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    REQ-1.4/REQ-1.5 — PYQ-derived topic frequency and weightage.
    Only uses PYQ materials uploaded by the requesting user.
    Returns 'sufficient_data: false' when fewer than 5 questions are available.
    """
    return await analytics_service.get_topic_frequency(db, subject_id, current_user.id)


@router.get("/question-patterns")
async def question_patterns(
    subject_id: uuid.UUID = Query(..., description="Subject to analyse"),
    db: SessionDep = None,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Question type distribution and marks distribution from uploaded PYQs.
    Only uses PYQ materials uploaded by the requesting user.
    """
    return await analytics_service.get_question_patterns(db, subject_id, current_user.id)


