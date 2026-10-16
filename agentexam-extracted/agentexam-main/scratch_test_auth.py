import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1"

async def test_auth():
    async with httpx.AsyncClient() as client:
        print("Testing Registration...")
        # 1. Valid Registration
        res = await client.post(f"{BASE_URL}/auth/register", json={
            "name": "Student A",
            "email": "studentA_test@example.com",
            "password": "StrongPassword123"
        })
        print("Valid Register:", res.status_code)
        
        # 2. Duplicate Email
        res = await client.post(f"{BASE_URL}/auth/register", json={
            "name": "Student A duplicate",
            "email": "studentA_test@example.com",
            "password": "StrongPassword123"
        })
        print("Duplicate Register:", res.status_code)

        print("\nTesting Login...")
        # 3. Valid Login
        res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": "studentA_test@example.com",
            "password": "StrongPassword123"
        })
        print("Valid Login:", res.status_code)
        token = res.json().get("access_token")

        # 4. Invalid Password
        res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": "studentA_test@example.com",
            "password": "WrongPassword"
        })
        print("Invalid Password:", res.status_code)

        print("\nTesting Protected Route...")
        # 5. Protected Route with Token
        res = await client.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {token}"})
        print("Protected Route (Valid Token):", res.status_code)

        # 6. Protected Route without Token
        res = await client.get(f"{BASE_URL}/auth/me")
        print("Protected Route (No Token):", res.status_code)

if __name__ == "__main__":
    asyncio.run(test_auth())
