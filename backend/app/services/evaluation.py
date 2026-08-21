import uuid
from typing import List, Tuple
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from app.models.exam import MockTest, Question, Answer, Evaluation, Result, ExamStatus, QuestionType

class EvaluationService:
    def _calculate_grade(self, percentage: float) -> str:
        if percentage >= 90:
            return "A"
        elif percentage >= 80:
            return "B"
        elif percentage >= 70:
            return "C"
        elif percentage >= 60:
            return "D"
        else:
            return "F"
            
    async def get_result(self, db: AsyncSession, exam_id: uuid.UUID) -> Result:
        stmt = select(Result).where(Result.test_id == exam_id)
        result = await db.execute(stmt)
        return result.scalars().first()
        
    async def get_multi(self, db: AsyncSession, student_id: uuid.UUID, skip: int = 0, limit: int = 100) -> Tuple[List[Result], int]:
        stmt = select(Result).where(Result.student_id == student_id)
        
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await db.execute(count_stmt)).scalar() or 0
        
        stmt = stmt.offset(skip).limit(limit)
        items = (await db.execute(stmt)).scalars().all()
        
        return items, total

    async def evaluate_exam(self, db: AsyncSession, exam_id: uuid.UUID, student_id: uuid.UUID) -> Result:
        # Load exam with questions and answers
        stmt = select(MockTest).where(
            MockTest.id == exam_id,
            MockTest.student_id == student_id
        ).options(
            selectinload(MockTest.questions),
            selectinload(MockTest.result)
        )
        
        exam_result = await db.execute(stmt)
        exam = exam_result.scalars().first()
        
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
            
        if exam.status not in [ExamStatus.SUBMITTED, ExamStatus.EXPIRED]:
            raise HTTPException(status_code=400, detail=f"Cannot evaluate exam in status: {exam.status}")
            
        if exam.result:
            return exam.result # Idempotent return
            
        # Fetch existing answers
        ans_stmt = select(Answer).where(Answer.test_id == exam_id)
        ans_result = await db.execute(ans_stmt)
        answers = {ans.question_id: ans for ans in ans_result.scalars().all()}
        
        total_marks = 0.0
        obtained_marks = 0.0
        requires_review = False
        
        evaluations_to_add = []
        answers_to_add = []
        
        for question in exam.questions:
            q_marks = float(question.marks)
            total_marks += q_marks
            
            # Ensure answer exists
            answer = answers.get(question.id)
            if not answer:
                answer = Answer(
                    question_id=question.id,
                    student_id=student_id,
                    test_id=exam_id,
                    selected_option_id=None,
                    answer_text=None
                )
                answers_to_add.append(answer)
                # Need ID for Evaluation, so we flush after loop or add to session and flush
                
            if question.question_type == QuestionType.MCQ:
                if answer.selected_option_id and answer.selected_option_id == question.correct_answer:
                    marks = q_marks
                    feedback = "Correct"
                else:
                    marks = 0.0
                    feedback = "Incorrect" if answer.selected_option_id else "Unanswered"
            else:
                # Subjective questions require review in V1.0
                requires_review = True
                marks = 0.0
                feedback = "Pending Manual/AI Review"
                
            obtained_marks += marks
            
            evaluation = Evaluation(
                answer=answer, # Use relationship mapping since ID might not be generated yet
                marks_obtained=marks,
                feedback=feedback
            )
            evaluations_to_add.append(evaluation)
            
        # Add new answers and evaluations
        db.add_all(answers_to_add)
        db.add_all(evaluations_to_add)
        
        # Calculate final scores
        percentage = (obtained_marks / total_marks * 100) if total_marks > 0 else 0
        grade = self._calculate_grade(percentage)
        pass_status = percentage >= 40.0
        
        # Update Exam Status
        exam.status = ExamStatus.REVIEW_REQUIRED if requires_review else ExamStatus.EVALUATED
        
        # Create Result
        result = Result(
            test_id=exam_id,
            student_id=student_id,
            total_marks=total_marks,
            obtained_marks=obtained_marks,
            percentage=percentage,
            grade=grade,
            pass_status=pass_status
        )
        db.add(result)
        
        await db.commit()
        await db.refresh(result)
        return result

    async def get_detailed_result(self, db: AsyncSession, exam_id: uuid.UUID, student_id: uuid.UUID) -> dict:
        """ Returns a constructed dictionary matching ResultDetailResponse """
        stmt = select(MockTest).where(
            MockTest.id == exam_id,
            MockTest.student_id == student_id
        ).options(
            selectinload(MockTest.questions),
            selectinload(MockTest.result)
        )
        
        exam = (await db.execute(stmt)).scalars().first()
        if not exam or not exam.result:
            raise HTTPException(status_code=404, detail="Result not found")
            
        ans_stmt = select(Answer).where(Answer.test_id == exam_id).options(selectinload(Answer.evaluation))
        answers = {ans.question_id: ans for ans in (await db.execute(ans_stmt)).scalars().all()}
        
        question_results = []
        for q in exam.questions:
            ans = answers.get(q.id)
            eval_data = None
            if ans and ans.evaluation:
                eval_data = {
                    "id": ans.evaluation.id,
                    "answer_id": ans.id,
                    "marks_obtained": float(ans.evaluation.marks_obtained),
                    "feedback": ans.evaluation.feedback
                }
                
            question_results.append({
                "question_id": q.id,
                "question_text": q.question_text,
                "marks": float(q.marks),
                "options": q.options,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "student_selected_option_id": ans.selected_option_id if ans else None,
                "student_answer_text": ans.answer_text if ans else None,
                "evaluation": eval_data
            })
            
        return {
            "id": exam.result.id,
            "test_id": exam.id,
            "student_id": exam.student_id,
            "total_marks": float(exam.result.total_marks),
            "obtained_marks": float(exam.result.obtained_marks),
            "percentage": float(exam.result.percentage),
            "grade": exam.result.grade,
            "pass_status": exam.result.pass_status,
            "question_results": question_results
        }

evaluation_service = EvaluationService()
