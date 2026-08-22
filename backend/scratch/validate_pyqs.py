import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal
from app.services import academic as academic_service
from app.schemas.material import MaterialResponse
from pydantic import TypeAdapter
from typing import List

async def main():
    try:
        async with AsyncSessionLocal() as db_session:
            print("Fetching PYQs...")
            pyqs = await academic_service.get_pyqs(db_session, limit=50)
            print(f"Fetched {len(pyqs)} pyqs from DB.")
            
            # Validate with Pydantic
            adapter = TypeAdapter(List[MaterialResponse])
            validated = adapter.validate_python(pyqs)
            print(f"Validated {len(validated)} pyqs.")
            for v in validated:
                print(v.model_dump())
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
