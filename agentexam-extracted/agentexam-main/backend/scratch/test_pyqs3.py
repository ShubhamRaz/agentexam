import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import create_access_token
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy.future import select
import httpx

async def main():
    async with AsyncSessionLocal() as db:
        stmt = select(User).limit(1)
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            print("No user found.")
            return
            
        print(f"Logging in as {user.email}")
        
        # Create token
        from datetime import timedelta
        access_token_expires = timedelta(minutes=60)
        token = create_access_token(
            subject=user.id, role=user.role, expires_delta=access_token_expires
        )
        
        # Make request
        url = "http://localhost:8001/api/v1/pyqs/?skip=0&limit=50"
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            print(f"GET {url}")
            response = await client.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print("Headers:")
            for k, v in response.headers.items():
                print(f"  {k}: {v}")
            print(f"Body: {response.text}")

if __name__ == "__main__":
    asyncio.run(main())
