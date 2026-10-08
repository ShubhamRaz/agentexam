import uuid
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.plan import StudyPlan, Recommendation, PlanStatus, RecommendationPriority, RecommendationType
from app.models.academic import Topic, Subject
from app.schemas.plan import StudyPlanResponse, StudyTaskSchema
from app.services.performance import performance_service
from app.services.readiness import readiness_service

class StudyPlanService:

    async def get_active_plan(self, db: AsyncSession, student_id: uuid.UUID) -> Optional[StudyPlan]:
        stmt = (
            select(StudyPlan)
            .where(
                StudyPlan.student_id == student_id,
                StudyPlan.status == PlanStatus.ACTIVE,
                StudyPlan.end_date >= datetime.date.today()
            )
            .order_by(StudyPlan.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    async def generate_plan(self, db: AsyncSession, student_id: uuid.UUID) -> StudyPlan:
        # Invalidate existing active plans
        stmt = (
            select(StudyPlan)
            .where(
                StudyPlan.student_id == student_id,
                StudyPlan.status == PlanStatus.ACTIVE
            )
        )
        result = await db.execute(stmt)
        existing_plans = result.scalars().all()
        for plan in existing_plans:
            plan.status = PlanStatus.COMPLETED
            
        await db.commit()

        # Fetch performance data
        overview = await performance_service.get_performance_overview(db, student_id)
        
        # Determine priority tasks
        tasks = []
        today = datetime.date.today()
        
        # We will distribute tasks across 7 days
        days = 7
        tasks_per_day = 3 # Aim for ~3 tasks per day
        
        # Prepare topics to study (High -> Medium -> Low priority)
        pool = []
        
        # High priority: Weak topics
        for wt in overview.weak_topics:
            pool.append({
                "topic_id": wt.topic_id,
                "topic_name": wt.topic_name,
                "priority": RecommendationPriority.HIGH,
                "type": RecommendationType.PRACTICE,
                "duration": 45
            })
            
        # Medium priority: Insufficient data topics
        for idt in overview.insufficient_data_topics:
            pool.append({
                "topic_id": idt.topic_id,
                "topic_name": idt.topic_name,
                "priority": RecommendationPriority.MEDIUM,
                "type": RecommendationType.STUDY,
                "duration": 30
            })
            
        # Low priority: Strong topics (Revision)
        for st in overview.strong_topics:
            pool.append({
                "topic_id": st.topic_id,
                "topic_name": st.topic_name,
                "priority": RecommendationPriority.LOW,
                "type": RecommendationType.REVISION,
                "duration": 20
            })
            
        # If pool is empty, provide a general fallback (assuming new student, no data)
        if not pool:
            pool.append({
                "topic_id": None,
                "topic_name": "General Syllabus Review",
                "priority": RecommendationPriority.MEDIUM,
                "type": RecommendationType.STUDY,
                "duration": 60
            })
            pool.append({
                "topic_id": None,
                "topic_name": "Take a Mock Test to identify weak areas",
                "priority": RecommendationPriority.HIGH,
                "type": RecommendationType.PRACTICE,
                "duration": 30
            })
            
        # Generate tasks by repeating the pool to fill the week if necessary
        # Or truncating if too large.
        task_id_counter = 1
        for day_offset in range(days):
            target_date = today + datetime.timedelta(days=day_offset)
            
            # Pick tasks for this day (round robin from pool)
            for i in range(tasks_per_day):
                if not pool:
                    break
                pool_idx = (day_offset * tasks_per_day + i) % len(pool)
                item = pool[pool_idx]
                
                title = f"{item['type'].value.capitalize()} - {item['topic_name']}"
                
                task = {
                    "id": f"task-{task_id_counter}",
                    "title": title,
                    "topic_id": str(item['topic_id']) if item['topic_id'] else None,
                    "topic_name": item['topic_name'],
                    "subject_name": None, # Could fetch from DB if needed
                    "priority": item['priority'].value,
                    "task_type": item['type'].value,
                    "duration_minutes": item['duration'],
                    "status": "pending",
                    "date": target_date.isoformat()
                }
                tasks.append(task)
                task_id_counter += 1
                
        # Create plan entity
        plan = StudyPlan(
            student_id=student_id,
            start_date=today,
            end_date=today + datetime.timedelta(days=days-1),
            plan_json={"tasks": tasks},
            status=PlanStatus.ACTIVE
        )
        
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
        
        # Also generate Recommendations based on readiness
        readiness = await readiness_service.get_readiness(db, student_id)
        for rec in readiness.recommendations:
            db_rec = Recommendation(
                plan_id=plan.id,
                topic_id=rec.topic_id,
                recommendation_type=RecommendationType.STUDY,
                priority=rec.priority,
                message=rec.message,
                is_done=False
            )
            db.add(db_rec)
            
        await db.commit()
        
        return plan

    async def update_task_status(self, db: AsyncSession, plan_id: uuid.UUID, task_id: str, status: str) -> bool:
        stmt = select(StudyPlan).where(StudyPlan.id == plan_id)
        result = await db.execute(stmt)
        plan = result.scalars().first()
        
        if not plan:
            return False
            
        tasks = plan.plan_json.get("tasks", [])
        found = False
        for task in tasks:
            if task.get("id") == task_id:
                task["status"] = status
                found = True
                break
                
        if found:
            # Need to re-assign to trigger JSONB update in SQLAlchemy
            new_json = {"tasks": tasks}
            plan.plan_json = new_json
            
            # Since JSONB updates are sometimes missed by the ORM depending on dialect usage,
            # we explicitly mark it as modified.
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(plan, "plan_json")
            
            await db.commit()
            return True
            
        return False

plan_service = StudyPlanService()
