"""
app/services/academic_analytics.py — Task 3: DATA ANALYSIS

Computes PYQ-derived analytics scoped to the requesting student's uploads.
SRS REQ-1.4: topic & chapter frequency/weightage. REQ-1.5: high/medium/low probability flag.
"""
import uuid
import logging
from typing import Dict, Any, List, Optional
from collections import Counter

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.exam import Question, QuestionSource, QuestionType
from app.models.academic import StudyMaterial, MaterialType, Topic, Chapter

logger = logging.getLogger(__name__)

MIN_PYQS_FOR_ANALYSIS = 5


async def _get_pyq_questions(
    db: AsyncSession,
    subject_id: uuid.UUID,
    user_id: uuid.UUID,
) -> List[Question]:
    """PYQ Questions scoped to materials uploaded by this user."""
    mat_stmt = select(StudyMaterial.id).where(
        StudyMaterial.subject_id == subject_id,
        StudyMaterial.material_type == MaterialType.PYQ,
        StudyMaterial.uploaded_by == user_id,
        StudyMaterial.processing_status == "PROCESSED",
    )
    mat_result = await db.execute(mat_stmt)
    material_ids = [str(r[0]) for r in mat_result.all()]

    if not material_ids:
        return []

    q_stmt = select(Question).where(
        Question.subject_id == subject_id,
        Question.source == QuestionSource.PYQ,
        Question.source_reference.in_(material_ids),
    )
    q_result = await db.execute(q_stmt)
    return list(q_result.scalars().all())


def _insufficient(count: int) -> Dict[str, Any]:
    return {
        "sufficient_data": False,
        "message": (
            f"Insufficient data. At least {MIN_PYQS_FOR_ANALYSIS} processed PYQ "
            f"questions are required. Currently have {count}."
        ),
        "total_questions": count,
    }


async def get_topic_frequency(
    db: AsyncSession, subject_id: uuid.UUID, user_id: uuid.UUID
) -> Dict[str, Any]:
    """REQ-1.4/REQ-1.5 — Topic & Chapter-wise frequency and PYQ-derived weightage."""
    questions = await _get_pyq_questions(db, subject_id, user_id)
    if len(questions) < MIN_PYQS_FOR_ANALYSIS:
        return {**_insufficient(len(questions)), "topics": [], "units": []}

    topic_counts: Dict[Optional[uuid.UUID], int] = {}
    topic_names: Dict[Optional[uuid.UUID], str] = {}
    topic_chapter_map: Dict[Optional[uuid.UUID], Optional[uuid.UUID]] = {}
    chapter_counts: Dict[Optional[uuid.UUID], int] = {}
    chapter_names: Dict[Optional[uuid.UUID], str] = {}

    for q in questions:
        tid = q.topic_id
        cid = q.chapter_id
        topic_counts[tid] = topic_counts.get(tid, 0) + 1
        topic_names.setdefault(tid, None)
        topic_chapter_map.setdefault(tid, cid)
        chapter_counts[cid] = chapter_counts.get(cid, 0) + 1
        chapter_names.setdefault(cid, None)

    known_tids = [t for t in topic_counts if t is not None]
    if known_tids:
        t_result = await db.execute(select(Topic).where(Topic.id.in_(known_tids)))
        for t in t_result.scalars():
            topic_names[t.id] = t.name
            topic_chapter_map[t.id] = t.chapter_id
            if t.chapter_id and t.chapter_id not in chapter_counts:
                chapter_counts[t.chapter_id] = 0

    known_cids = [c for c in chapter_counts if c is not None]
    if known_cids:
        c_result = await db.execute(select(Chapter).where(Chapter.id.in_(known_cids)))
        for c in c_result.scalars():
            chapter_names[c.id] = c.name

    total = len(questions)

    # Build topic list
    topics = []
    for tid, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
        pct = round(count / total * 100, 2)
        topics.append({
            "topic_id": str(tid) if tid else None,
            "topic_name": topic_names.get(tid) or "Unclassified",
            "chapter_id": str(topic_chapter_map.get(tid)) if topic_chapter_map.get(tid) else None,
            "frequency": count,
            "weightage_pct": pct,
            "probability": "HIGH" if pct >= 20 else ("MEDIUM" if pct >= 10 else "LOW"),
        })

    # Build chapter/unit-wise breakdown (REQ-1.4)
    units = []
    for cid, count in sorted(chapter_counts.items(), key=lambda x: -x[1]):
        if count == 0 and cid is None:
            continue
        pct = round(count / total * 100, 2)
        unit_topics = [t for t in topics if t.get("chapter_id") == (str(cid) if cid else None)]
        units.append({
            "chapter_id": str(cid) if cid else None,
            "unit_name": chapter_names.get(cid) or "Unclassified Unit",
            "frequency": count,
            "weightage_pct": pct,
            "probability": "HIGH" if pct >= 25 else ("MEDIUM" if pct >= 15 else "LOW"),
            "topics": unit_topics,
        })

    return {
        "sufficient_data": True,
        "total_questions": total,
        "topics": topics,
        "units": units,
        "note": "Derived from student-uploaded PYQs only."
    }


async def get_question_patterns(
    db: AsyncSession, subject_id: uuid.UUID, user_id: uuid.UUID
) -> Dict[str, Any]:
    """Question type, marks distribution, and repeated question patterns from uploaded PYQs."""
    questions = await _get_pyq_questions(db, subject_id, user_id)
    if len(questions) < MIN_PYQS_FOR_ANALYSIS:
        return _insufficient(len(questions))

    type_dist: Dict[str, int] = {}
    marks_dist: Dict[float, int] = {}
    question_text_counts: Dict[str, int] = Counter()
    total_marks = 0.0

    for q in questions:
        qt = getattr(q.question_type, "value", str(q.question_type)) if q.question_type else "UNKNOWN"
        type_dist[qt] = type_dist.get(qt, 0) + 1
        m = float(q.marks) if q.marks else 1.0
        marks_dist[m] = marks_dist.get(m, 0) + 1
        total_marks += m
        
        # Clean text for pattern frequency check
        normalized_q = " ".join(q.question_text.lower().split())
        question_text_counts[normalized_q] += 1

    n = len(questions)

    # Identify repeated or high-frequency questions
    repeated_questions = [
        {"question_text": q_text, "frequency": count}
        for q_text, count in question_text_counts.items()
        if count > 1
    ]
    repeated_questions.sort(key=lambda x: -x["frequency"])

    return {
        "sufficient_data": True,
        "total_questions": n,
        "question_type_distribution": [
            {"type": k, "count": v, "pct": round(v / n * 100, 2)}
            for k, v in sorted(type_dist.items(), key=lambda x: -x[1])
        ],
        "marks_distribution": [
            {"marks": k, "count": v} for k, v in sorted(marks_dist.items())
        ],
        "average_marks_per_question": round(total_marks / n, 2),
        "repeated_questions": repeated_questions,
        "repeated_questions_count": len(repeated_questions),
        "note": "Derived from student-uploaded PYQs only.",
    }
