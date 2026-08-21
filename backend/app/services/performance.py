import uuid
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.exam import Answer, Evaluation, Question, MockTest, ExamStatus, DifficultyLevel
from app.models.academic import Topic
from app.schemas.performance import (
    WeakTopicResponse, 
    RecommendedDifficultyResponse,
    TopicPerformanceResponse,
    PerformanceOverviewResponse
)
from app.core.config import settings

class PerformanceService:

    async def get_topic_accuracy_metrics(self, db: AsyncSession, student_id: uuid.UUID, topic_id: uuid.UUID = None):
        # Base query to fetch sum(marks_obtained) and sum(marks_max) for all EVALUATED tests per topic
        stmt = (
            select(
                Question.topic_id,
                Topic.name.label("topic_name"),
                Topic.subject_id,
                func.count(Answer.id).label("attempts"),
                func.sum(Evaluation.marks_obtained).label("total_obtained"),
                func.sum(Question.marks).label("total_max")
            )
            .join(Answer, Answer.question_id == Question.id)
            .join(Evaluation, Evaluation.answer_id == Answer.id)
            .join(MockTest, Answer.test_id == MockTest.id)
            .join(Topic, Question.topic_id == Topic.id)
            .where(
                Answer.student_id == student_id,
                MockTest.status == ExamStatus.EVALUATED
            )
        )
        
        if topic_id:
            stmt = stmt.where(Question.topic_id == topic_id)
            
        stmt = stmt.group_by(Question.topic_id, Topic.name, Topic.subject_id)
        
        result = await db.execute(stmt)
        return result.all()
        
    async def get_topic_performance(self, db: AsyncSession, student_id: uuid.UUID) -> List[TopicPerformanceResponse]:
        rows = await self.get_topic_accuracy_metrics(db, student_id)
        
        topics = []
        for row in rows:
            accuracy = 0.0
            if row.total_max and float(row.total_max) > 0:
                accuracy = (float(row.total_obtained) / float(row.total_max)) * 100
            
            topics.append(TopicPerformanceResponse(
                topic_id=row.topic_id,
                topic_name=row.topic_name,
                subject_id=row.subject_id,
                accuracy=accuracy,
                attempts=row.attempts
            ))
            
        return topics

    async def get_weak_topics(self, db: AsyncSession, student_id: uuid.UUID) -> List[WeakTopicResponse]:
        rows = await self.get_topic_accuracy_metrics(db, student_id)
        
        weak_topics = []
        for row in rows:
            if row.attempts >= settings.MINIMUM_ATTEMPTS_FOR_CLASSIFICATION:
                if row.total_max and float(row.total_max) > 0:
                    accuracy = (float(row.total_obtained) / float(row.total_max)) * 100
                    if accuracy < settings.WEAK_TOPIC_THRESHOLD:
                        weak_topics.append(WeakTopicResponse(
                            topic_id=row.topic_id,
                            topic_name=row.topic_name,
                            subject_id=row.subject_id,
                            accuracy=accuracy,
                            attempts=row.attempts
                        ))
                    
        # Sort by lowest accuracy first
        weak_topics.sort(key=lambda x: x.accuracy)
        return weak_topics
        
    async def get_strong_topics(self, db: AsyncSession, student_id: uuid.UUID) -> List[TopicPerformanceResponse]:
        topics = await self.get_topic_performance(db, student_id)
        return [
            t for t in topics 
            if t.accuracy >= settings.STRONG_TOPIC_THRESHOLD 
            and t.attempts >= settings.MINIMUM_ATTEMPTS_FOR_CLASSIFICATION
        ]

    async def get_insufficient_data_topics(self, db: AsyncSession, student_id: uuid.UUID) -> List[TopicPerformanceResponse]:
        topics = await self.get_topic_performance(db, student_id)
        return [
            t for t in topics 
            if t.attempts < settings.MINIMUM_ATTEMPTS_FOR_CLASSIFICATION
        ]
        
    async def get_performance_overview(self, db: AsyncSession, student_id: uuid.UUID) -> PerformanceOverviewResponse:
        # Calculate overall accuracy
        stmt = (
            select(
                func.sum(Evaluation.marks_obtained).label("total_obtained"),
                func.sum(Question.marks).label("total_max")
            )
            .join(Answer, Answer.question_id == Question.id)
            .join(Evaluation, Evaluation.answer_id == Answer.id)
            .join(MockTest, Answer.test_id == MockTest.id)
            .where(
                Answer.student_id == student_id,
                MockTest.status == ExamStatus.EVALUATED
            )
        )
        result = await db.execute(stmt)
        row = result.first()
        
        overall_accuracy = 0.0
        if row and row.total_max and float(row.total_max) > 0:
            overall_accuracy = (float(row.total_obtained) / float(row.total_max)) * 100
            
        topics = await self.get_topic_performance(db, student_id)
        
        strong_topics = []
        weak_topics = []
        insufficient_data = []
        
        for t in topics:
            if t.attempts < settings.MINIMUM_ATTEMPTS_FOR_CLASSIFICATION:
                insufficient_data.append(t)
            elif t.accuracy < settings.WEAK_TOPIC_THRESHOLD:
                weak_topics.append(t)
            elif t.accuracy >= settings.STRONG_TOPIC_THRESHOLD:
                strong_topics.append(t)
                
        # Sort topics
        weak_topics.sort(key=lambda x: x.accuracy)
        strong_topics.sort(key=lambda x: x.accuracy, reverse=True)
                
        return PerformanceOverviewResponse(
            overall_accuracy=overall_accuracy,
            strong_topics=strong_topics,
            weak_topics=weak_topics,
            insufficient_data_topics=insufficient_data
        )

    async def get_recommended_difficulty(self, db: AsyncSession, student_id: uuid.UUID, topic_id: uuid.UUID) -> RecommendedDifficultyResponse:
        rows = await self.get_topic_accuracy_metrics(db, student_id, topic_id)
        
        # If no history exists, default to MEDIUM
        if not rows:
            return RecommendedDifficultyResponse(
                topic_id=topic_id,
                recommended_difficulty=DifficultyLevel.MEDIUM,
                accuracy=0.0,
                attempts=0
            )
            
        row = rows[0]
        accuracy = 0.0
        
        if row.total_max and float(row.total_max) > 0:
            accuracy = (float(row.total_obtained) / float(row.total_max)) * 100
            
        if accuracy < settings.WEAK_TOPIC_THRESHOLD:
            difficulty = DifficultyLevel.EASY
        elif accuracy >= settings.STRONG_TOPIC_THRESHOLD:
            difficulty = DifficultyLevel.HARD
        else:
            difficulty = DifficultyLevel.MEDIUM
            
        return RecommendedDifficultyResponse(
            topic_id=topic_id,
            recommended_difficulty=difficulty,
            accuracy=accuracy,
            attempts=row.attempts
        )


performance_service = PerformanceService()
