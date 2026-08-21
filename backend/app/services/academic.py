import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import exc

from app.models.academic import Course, Semester, Subject, Chapter, Topic, StudyMaterial, MaterialType
from app.schemas.academic import (
    ProgramCreate, SemesterCreate, SubjectCreate, UnitCreate, TopicCreate
)

# ----------------- PROGRAMS (Course) -----------------
async def get_programs(db: AsyncSession, skip: int = 0, limit: int = 20) -> List[Course]:
    result = await db.execute(select(Course).offset(skip).limit(limit))
    return result.scalars().all()

async def get_program(db: AsyncSession, program_id: uuid.UUID) -> Optional[Course]:
    result = await db.execute(select(Course).where(Course.id == program_id))
    return result.scalars().first()

async def create_program(db: AsyncSession, program_in: ProgramCreate) -> Course:
    program = Course(**program_in.model_dump())
    db.add(program)
    await db.commit()
    await db.refresh(program)
    return program

async def delete_program(db: AsyncSession, program_id: uuid.UUID) -> bool:
    program = await get_program(db, program_id)
    if not program:
        return False
    await db.delete(program)
    await db.commit()
    return True

# ----------------- SEMESTERS -----------------
async def get_semesters(db: AsyncSession, program_id: uuid.UUID) -> List[Semester]:
    result = await db.execute(select(Semester).where(Semester.course_id == program_id))
    return result.scalars().all()

async def get_semester(db: AsyncSession, semester_id: uuid.UUID) -> Optional[Semester]:
    result = await db.execute(select(Semester).where(Semester.id == semester_id))
    return result.scalars().first()

async def create_semester(db: AsyncSession, semester_in: SemesterCreate) -> Semester:
    semester = Semester(**semester_in.model_dump())
    db.add(semester)
    await db.commit()
    await db.refresh(semester)
    return semester

async def delete_semester(db: AsyncSession, semester_id: uuid.UUID) -> bool:
    semester = await get_semester(db, semester_id)
    if not semester:
        return False
    await db.delete(semester)
    await db.commit()
    return True


# ----------------- SUBJECTS -----------------
async def get_subjects(
    db: AsyncSession, 
    semester_id: Optional[uuid.UUID] = None, 
    skip: int = 0, 
    limit: int = 20
) -> List[Subject]:
    query = select(Subject)
    if semester_id:
        query = query.where(Subject.semester_id == semester_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_subject(db: AsyncSession, subject_id: uuid.UUID) -> Optional[Subject]:
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    return result.scalars().first()

async def create_subject(db: AsyncSession, subject_in: SubjectCreate) -> Subject:
    subject = Subject(**subject_in.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)
    return subject

async def delete_subject(db: AsyncSession, subject_id: uuid.UUID) -> bool:
    subject = await get_subject(db, subject_id)
    if not subject:
        return False
    await db.delete(subject)
    await db.commit()
    return True


# ----------------- UNITS (Chapter) -----------------
async def get_units(db: AsyncSession, subject_id: uuid.UUID) -> List[Chapter]:
    result = await db.execute(select(Chapter).where(Chapter.subject_id == subject_id))
    return result.scalars().all()

async def get_unit(db: AsyncSession, unit_id: uuid.UUID) -> Optional[Chapter]:
    result = await db.execute(select(Chapter).where(Chapter.id == unit_id))
    return result.scalars().first()

async def create_unit(db: AsyncSession, unit_in: UnitCreate) -> Chapter:
    unit = Chapter(**unit_in.model_dump())
    db.add(unit)
    await db.commit()
    await db.refresh(unit)
    return unit

async def delete_unit(db: AsyncSession, unit_id: uuid.UUID) -> bool:
    unit = await get_unit(db, unit_id)
    if not unit:
        return False
    await db.delete(unit)
    await db.commit()
    return True


# ----------------- TOPICS -----------------
async def get_topics(db: AsyncSession, unit_id: uuid.UUID) -> List[Topic]:
    result = await db.execute(select(Topic).where(Topic.chapter_id == unit_id))
    return result.scalars().all()

async def get_topic(db: AsyncSession, topic_id: uuid.UUID) -> Optional[Topic]:
    result = await db.execute(select(Topic).where(Topic.id == topic_id))
    return result.scalars().first()

async def create_topic(db: AsyncSession, topic_in: TopicCreate) -> Topic:
    topic = Topic(**topic_in.model_dump())
    db.add(topic)
    await db.commit()
    await db.refresh(topic)
    return topic

async def delete_topic(db: AsyncSession, topic_id: uuid.UUID) -> bool:
    topic = await get_topic(db, topic_id)
    if not topic:
        return False
    await db.delete(topic)
    await db.commit()
    return True


# ----------------- SYLLABUS & PYQ -----------------
async def get_subject_syllabus(db: AsyncSession, subject_id: uuid.UUID) -> List[StudyMaterial]:
    result = await db.execute(
        select(StudyMaterial).where(
            StudyMaterial.subject_id == subject_id,
            StudyMaterial.material_type == MaterialType.SYLLABUS
        )
    )
    return result.scalars().all()

async def get_pyqs(
    db: AsyncSession, 
    subject_id: Optional[uuid.UUID] = None, 
    skip: int = 0, 
    limit: int = 20
) -> List[StudyMaterial]:
    query = select(StudyMaterial).where(StudyMaterial.material_type == MaterialType.PYQ)
    if subject_id:
        query = query.where(StudyMaterial.subject_id == subject_id)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_pyq(db: AsyncSession, pyq_id: uuid.UUID) -> Optional[StudyMaterial]:
    result = await db.execute(
        select(StudyMaterial).where(
            StudyMaterial.id == pyq_id,
            StudyMaterial.material_type == MaterialType.PYQ
        )
    )
    return result.scalars().first()
