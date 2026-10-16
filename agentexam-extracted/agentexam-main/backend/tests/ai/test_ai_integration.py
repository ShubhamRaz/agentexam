import pytest
import uuid
import os
from unittest.mock import patch, AsyncMock
from app.models.exam import QuestionType
from app.services.ai_provider import get_ai_provider, OpenAICompatibleProvider
from app.core.config import settings
from app.schemas.ai import AIEvaluationSchema

# We will force the provider to "compatible" to use Groq API for these tests
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "openai/gpt-oss-20b"

@pytest.fixture
def real_ai_provider():
    api_key = settings.get_ai_api_key
    if not api_key:
        pytest.skip("No GROQ_API_KEY found in .env, skipping real AI integration tests.")
        
    return get_ai_provider(
        provider_type="compatible",
        model_name=GROQ_MODEL,
        api_key=api_key,
        base_url=GROQ_BASE_URL
    )

@pytest.mark.asyncio
async def test_provider_connection_and_generation(real_ai_provider):
    """ Test basic provider connection and question generation for MCQ (Task 17) """
    prompt = "Subject: Operating Systems\nTopic: CPU Scheduling\nPlease generate 1 simple MCQ question."
    
    try:
        response = await real_ai_provider.generate_questions(
            prompt=prompt,
            count=1,
            question_type=QuestionType.MCQ,
            marks=1.0
        )
        assert response is not None
        assert len(response.questions) == 1
        q = response.questions[0]
        assert q.question_text
        assert len(q.options) >= 2
        assert q.explanation
    except Exception as e:
        import httpx
        if isinstance(e, httpx.HTTPStatusError):
            if e.response.status_code in (401, 429):
                pytest.skip(f"Groq API Error {e.response.status_code} during generation test.")
            else:
                raise e
        else:
            raise e

@pytest.mark.asyncio
async def test_ai_answer_evaluation(real_ai_provider):
    """ Test answer evaluation logic (Task 18) """
    expected_answer = "The CPU is the central processing unit, the brain of the computer that executes instructions."
    
    # 1. Correct Answer
    correct_student_answer = "It is the central processing unit and acts as the brain to execute instructions."
    
    try:
        correct_eval = await real_ai_provider.evaluate_answer(
            student_answer=correct_student_answer,
            expected_answer=expected_answer,
            max_marks=10.0
        )
        assert isinstance(correct_eval, AIEvaluationSchema)
        assert correct_eval.score >= 7.0
        
        # 2. Incorrect Answer
        incorrect_student_answer = "A CPU is a type of computer mouse."
        incorrect_eval = await real_ai_provider.evaluate_answer(
            student_answer=incorrect_student_answer,
            expected_answer=expected_answer,
            max_marks=10.0
        )
        assert incorrect_eval.score <= 3.0
    except Exception as e:
        import httpx
        if isinstance(e, httpx.HTTPStatusError):
            if e.response.status_code in (401, 429):
                pytest.skip(f"Groq API Error {e.response.status_code} during evaluation test.")
            else:
                raise e
        else:
            raise e

@pytest.mark.asyncio
async def test_viva_ai_chat_response(real_ai_provider):
    """ Test Viva AI generic chat response generation (Task 15) """
    messages = [
        {"role": "system", "content": "You are a helpful examiner."},
        {"role": "user", "content": "What is 2+2?"}
    ]
    try:
        response = await real_ai_provider.generate_chat_response(messages)
        assert response is not None
        assert "4" in response
    except Exception as e:
        import httpx
        if isinstance(e, httpx.HTTPStatusError):
            if e.response.status_code in (401, 429):
                pytest.skip(f"Groq API Error {e.response.status_code} during chat test.")
            else:
                raise e
        else:
            raise e

@pytest.mark.asyncio
async def test_provider_error_handling():
    """ Test invalid key safely raises an exception and doesn't crash the host blindly (Task 25 Failure Handling) """
    bad_provider = get_ai_provider(
        provider_type="compatible",
        model_name=GROQ_MODEL,
        api_key="gsk_invalid_key_123",
        base_url=GROQ_BASE_URL
    )
    
    from httpx import HTTPStatusError
    with pytest.raises(HTTPStatusError) as exc_info:
        await bad_provider.generate_chat_response([{"role": "user", "content": "Hello"}])
    
    assert exc_info.value.response.status_code == 401

@pytest.mark.asyncio
async def test_viva_ai_flow(auth_client_student, auth_client_admin, demo_subject_id):
    """ 
    Integration test: Viva AI flow with mock provider. 
    We mock it here so we don't spam the real API for large flow testing.
    """
    if not demo_subject_id:
        pytest.skip("No demo subject found")
        
    # 1. Create a chat session
    session_res = await auth_client_student.post("/api/v1/ai/chat/sessions", json={
        "subject_id": demo_subject_id
    })
    assert session_res.status_code == 200
    session_id = session_res.json()["id"]

    # 2. Send a message
    chat_response = await auth_client_student.post(f"/api/v1/ai/chat/sessions/{session_id}/messages", json={
        "content": "Can you explain memory management?"
    })
    
    # We should get a 200 response since AI provider in config is currently 'mock' for testing
    if chat_response.status_code != 200:
        print("CHAT RESPONSE ERROR:", chat_response.text)
    assert chat_response.status_code == 200
    data = chat_response.json()
    assert "content" in data or "response" in data
