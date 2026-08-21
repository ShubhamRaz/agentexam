import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleType
from app.schemas.chat import ChatSessionCreate, ChatSessionResponse, ChatMessageCreate, ChatMessageResponse
from app.services.chat import chat_service

router = APIRouter()

def ensure_student(user: User):
    """ Only students should use the AI Academic Chatbot """
    if user.role != RoleType.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only students can access the AI Student Assistant"
        )

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    request: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Create a new chat session """
    ensure_student(current_user)
    session = await chat_service.create_session(db, current_user, request)
    return session

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ List all chat sessions for the current student """
    ensure_student(current_user)
    sessions = await chat_service.get_sessions(db, current_user.id)
    return sessions

@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get a specific chat session """
    ensure_student(current_user)
    session = await chat_service.get_session(db, session_id, current_user.id)
    return session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Delete a specific chat session """
    ensure_student(current_user)
    await chat_service.delete_session(db, session_id, current_user.id)

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Get all messages for a specific chat session """
    ensure_student(current_user)
    messages = await chat_service.get_messages(db, session_id, current_user.id)
    return messages

@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    session_id: uuid.UUID,
    request: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ Send a message to the AI Assistant and get a response grounded in academic RAG """
    ensure_student(current_user)
    # The chat_service handles validation, RAG context, sending to AI, and saving both messages.
    assistant_msg = await chat_service.send_message(db, session_id, current_user, request)
    return assistant_msg
