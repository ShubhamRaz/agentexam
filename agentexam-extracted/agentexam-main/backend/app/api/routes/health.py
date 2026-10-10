from fastapi import APIRouter

router = APIRouter()

@router.get("/health", response_model=dict)
def health_check():
    """
    Check if the API is running correctly.
    """
    return {
        "status": "ok",
        "service": "agentexam-backend"
    }
