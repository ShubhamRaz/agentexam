import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.readiness import (
    ReadinessResponse,
    ReadinessStatus,
    RiskArea,
    RiskLevel,
    Recommendation,
    ReadinessFactor
)
from app.services.performance import performance_service
from app.core.config import settings

class ReadinessService:
    
    async def get_readiness(self, db: AsyncSession, student_id: uuid.UUID) -> ReadinessResponse:
        # Fetch performance overview
        overview = await performance_service.get_performance_overview(db, student_id)
        
        # Calculate total attempts
        all_topics = await performance_service.get_topic_performance(db, student_id)
        total_attempts = sum(t.attempts for t in all_topics)
        
        # Insufficient data check
        if total_attempts < settings.MINIMUM_READINESS_ATTEMPTS:
            return ReadinessResponse(
                readiness_score=None,
                status=ReadinessStatus.INSUFFICIENT_DATA,
                factors=[],
                risk_areas=[],
                recommendations=[
                    Recommendation(
                        priority=RiskLevel.HIGH,
                        message="Attempt more assessments to generate a readiness score.",
                        topic_id=None
                    )
                ]
            )
            
        score = overview.overall_accuracy
        
        if score < 40:
            status = ReadinessStatus.LOW
        elif score < 70:
            status = ReadinessStatus.MODERATE
        else:
            status = ReadinessStatus.HIGH
            
        factors = [
            ReadinessFactor(name="Overall Accuracy", value=round(score, 2)),
            ReadinessFactor(name="Topics Attempted", value=float(len(all_topics)))
        ]
        
        risk_areas = []
        recommendations = []
        
        # Weak Topics -> High Risk
        for topic in overview.weak_topics:
            risk_areas.append(
                RiskArea(
                    topic_id=topic.topic_id,
                    topic_name=topic.topic_name,
                    risk_level=RiskLevel.HIGH,
                    reason="Low accuracy"
                )
            )
            recommendations.append(
                Recommendation(
                    priority=RiskLevel.HIGH,
                    message="Review the relevant study material and attempt easier questions first.",
                    topic_id=topic.topic_id
                )
            )
            
        # Insufficient Data Topics -> Medium Risk
        for topic in overview.insufficient_data_topics:
            risk_areas.append(
                RiskArea(
                    topic_id=topic.topic_id,
                    topic_name=topic.topic_name,
                    risk_level=RiskLevel.MEDIUM,
                    reason="Insufficient practice"
                )
            )
            recommendations.append(
                Recommendation(
                    priority=RiskLevel.MEDIUM,
                    message="Practice more questions from this topic.",
                    topic_id=topic.topic_id
                )
            )
            
        # Cap recommendations to avoid overwhelming the student
        MAX_RECOMMENDATIONS = 5
        # Sort recommendations by priority (HIGH then MEDIUM then LOW)
        priority_order = {RiskLevel.HIGH: 1, RiskLevel.MEDIUM: 2, RiskLevel.LOW: 3}
        recommendations.sort(key=lambda r: priority_order[r.priority])
        recommendations = recommendations[:MAX_RECOMMENDATIONS]
        
        return ReadinessResponse(
            readiness_score=round(score, 2),
            status=status,
            factors=factors,
            risk_areas=risk_areas,
            recommendations=recommendations
        )

readiness_service = ReadinessService()
