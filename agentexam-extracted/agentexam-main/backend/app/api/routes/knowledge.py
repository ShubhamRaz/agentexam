import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, ConfigDict

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User, RoleType
from app.services.rag import rag_service

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    subject_id: uuid.UUID
    top_k: int = 5

class ChunkResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    content: str
    metadata_: dict
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class SearchResponse(BaseModel):
    results: List[ChunkResponse]

@router.post("/search", response_model=SearchResponse)
async def search_knowledge(
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search academic knowledge base using RAG semantic search.
    Only Teachers and Admins can query this directly for now.
    """
    if current_user.role not in [RoleType.TEACHER, RoleType.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to search knowledge directly.")
        
    chunks = await rag_service.search(
        db=db,
        query=request.query,
        subject_id=request.subject_id,
        top_k=request.top_k
    )
    
    # We must explicitly set metadata_ or alias it if needed, but Pydantic uses dict key
    # since model_config has from_attributes
    return SearchResponse(results=[
        ChunkResponse(
            id=c.id,
            document_id=c.document_id,
            content=c.content,
            metadata_=c.metadata_ or {}
        ) for c in chunks
    ])
