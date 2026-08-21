import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from app.schemas.ai import AIQuestionSchema, AIQuestionListSchema, AIEvaluationSchema
from app.models.exam import QuestionType
from app.schemas.question import OptionAdmin


logger = logging.getLogger(__name__)


class AIProvider(ABC):
    @abstractmethod
    async def generate_questions(
        self, 
        prompt: str, 
        count: int, 
        question_type: QuestionType, 
        marks: float
    ) -> AIQuestionListSchema:
        """ Generate structured questions """
        pass

    @abstractmethod
    async def evaluate_answer(
        self, 
        student_answer: str, 
        expected_answer: str, 
        max_marks: float,
        rubric: Optional[str] = None
    ) -> AIEvaluationSchema:
        """ Evaluate a subjective answer """
        pass


class MockAIProvider(AIProvider):
    """ Used for tests and local development to prevent API costs """
    
    async def generate_questions(
        self, 
        prompt: str, 
        count: int, 
        question_type: QuestionType, 
        marks: float
    ) -> AIQuestionListSchema:
        
        logger.info(f"MockAIProvider generating {count} questions for prompt: {prompt[:50]}...")
        
        questions = []
        for i in range(count):
            if question_type == QuestionType.MCQ:
                questions.append(
                    AIQuestionSchema(
                        question_text=f"AI Generated MCQ Question {i+1}?",
                        options=[
                            OptionAdmin(option_text="Option A", is_correct=True),
                            OptionAdmin(option_text="Option B", is_correct=False),
                            OptionAdmin(option_text="Option C", is_correct=False),
                            OptionAdmin(option_text="Option D", is_correct=False),
                        ],
                        explanation="This is an AI generated explanation."
                    )
                )
            else:
                questions.append(
                    AIQuestionSchema(
                        question_text=f"AI Generated Subjective Question {i+1}?",
                        correct_answer="This is an AI generated expected answer.",
                        explanation="This is an AI generated explanation."
                    )
                )
        
        return AIQuestionListSchema(questions=questions)

    async def evaluate_answer(
        self, 
        student_answer: str, 
        expected_answer: str, 
        max_marks: float,
        rubric: Optional[str] = None
    ) -> AIEvaluationSchema:
        
        logger.info(f"MockAIProvider evaluating answer. Max marks: {max_marks}")
        
        # Simple mock logic
        score = max_marks * 0.8
        return AIEvaluationSchema(
            score=score,
            feedback="Good effort. Consider adding more details based on the expected key points.",
            strengths=["Clear articulation"],
            weaknesses=["Lacking depth in specific sections"]
        )

    async def generate_chat_response(self, messages: List[Dict[str, str]]) -> str:
        logger.info(f"MockAIProvider generating chat response for {len(messages)} messages.")
        return "This is a mock academic assistant response based on the retrieved context."


class OpenAICompatibleProvider(AIProvider):
    """ Generic provider for any OpenAI-compatible API """
    
    def __init__(self, api_key: str, model_name: str, base_url: Optional[str] = None):
        try:
            import httpx
            self.httpx = httpx
        except ImportError:
            raise ImportError("httpx is required for OpenAICompatibleProvider. Run pip install httpx")
            
        self.api_key = api_key
        self.model_name = model_name
        self.base_url = base_url or "https://api.openai.com/v1"
        self.client = self.httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=120.0
        )

    async def generate_questions(
        self, 
        prompt: str, 
        count: int, 
        question_type: QuestionType, 
        marks: float
    ) -> AIQuestionListSchema:
        
        system_prompt = (
            "You are an expert exam question generator for a university platform. "
            "Generate questions matching the requested type, difficulty, and academic context. "
            "You MUST output valid JSON conforming to the requested schema. Do not output anything other than JSON."
        )
        
        # In a real implementation we would define the JSON schema parameter for Structured Outputs,
        # but for this abstract implementation we'll request JSON format and validate via Pydantic.
        
        response = await self.client.post("/chat/completions", json={
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        })
        response.raise_for_status()
        data = response.json()
        
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return AIQuestionListSchema.model_validate(parsed)

    async def evaluate_answer(
        self, 
        student_answer: str, 
        expected_answer: str, 
        max_marks: float,
        rubric: Optional[str] = None
    ) -> AIEvaluationSchema:
        
        system_prompt = (
            "You are an expert university examiner. You will be provided with a student's answer, "
            "an expected answer or key concepts, and the maximum marks. "
            "Evaluate the student's answer fairly but strictly. Provide a score and constructive feedback. "
            "You MUST output valid JSON. Do not output anything other than JSON."
        )
        
        prompt = f"Expected Answer/Concepts:\n{expected_answer}\n\n"
        if rubric:
            prompt += f"Grading Rubric:\n{rubric}\n\n"
        prompt += f"Maximum Marks: {max_marks}\n\n"
        prompt += f"Student Answer:\n{student_answer}\n"

        response = await self.client.post("/chat/completions", json={
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        })
        response.raise_for_status()
        data = response.json()
        
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return AIEvaluationSchema.model_validate(parsed)

    async def generate_chat_response(self, messages: List[Dict[str, str]]) -> str:
        response = await self.client.post("/chat/completions", json={
            "model": self.model_name,
            "messages": messages,
        })
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

def get_ai_provider(provider_type: str, model_name: str, api_key: str, base_url: Optional[str] = None) -> AIProvider:
    if provider_type.lower() == "mock":
        return MockAIProvider()
    elif provider_type.lower() in ("openai", "ollama", "compatible"):
        return OpenAICompatibleProvider(api_key=api_key, model_name=model_name, base_url=base_url)
    else:
        logger.warning(f"Unknown AI provider type '{provider_type}', falling back to Mock provider")
        return MockAIProvider()
