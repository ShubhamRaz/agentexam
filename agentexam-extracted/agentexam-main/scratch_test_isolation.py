import httpx
import asyncio

BASE_URL = "http://localhost:8000/api/v1"

async def test_isolation():
    async with httpx.AsyncClient() as client:
        # Create Student A
        await client.post(f"{BASE_URL}/auth/register", json={
            "name": "Isol Student A",
            "email": "isolA@example.com",
            "password": "Password123"
        })
        resA = await client.post(f"{BASE_URL}/auth/login", data={"username": "isolA@example.com", "password": "Password123"})
        tokenA = resA.json().get("access_token")

        # Create Student B
        await client.post(f"{BASE_URL}/auth/register", json={
            "name": "Isol Student B",
            "email": "isolB@example.com",
            "password": "Password123"
        })
        resB = await client.post(f"{BASE_URL}/auth/login", data={"username": "isolB@example.com", "password": "Password123"})
        tokenB = resB.json().get("access_token")
        
        headersA = {"Authorization": f"Bearer {tokenA}"}
        headersB = {"Authorization": f"Bearer {tokenB}"}
        
        print("Tokens Acquired.")

        # Let's get the first subject
        subjects_res = await client.get(f"{BASE_URL}/subjects/", headers=headersB)
        print("Subjects Res Code:", subjects_res.status_code)
        print("Subjects Res Text:", subjects_res.text)
        sub_id = subjects_res.json()[0]["id"] if isinstance(subjects_res.json(), list) else subjects_res.json().get("data", [])[0]["id"]

        # Student B uploads a material (we'll just use the mock materials API if upload is tricky without file)
        # We can simulate by using a mock file.
        # But wait, there is no file upload in API directly using JSON. It uses Form-Data.
        # Let's check results isolation instead.
        
        print("Testing Performance Isolation...")
        res_perfB = await client.get(f"{BASE_URL}/performance/", headers=headersB)
        res_perfA = await client.get(f"{BASE_URL}/performance/", headers=headersA)
        # Since it's mock/seeded data on fresh accounts, performance might be empty
        print("Perf A:", res_perfA.json())
        print("Perf B:", res_perfB.json())

        print("Testing Readiness Isolation...")
        res_readB = await client.get(f"{BASE_URL}/performance/readiness/", headers=headersB)
        res_readA = await client.get(f"{BASE_URL}/performance/readiness/", headers=headersA)
        print("Readiness A:", res_readA.json())
        print("Readiness B:", res_readB.json())

        print("Testing Study Plan Isolation...")
        res_planB = await client.get(f"{BASE_URL}/study-plan/", headers=headersB)
        res_planA = await client.get(f"{BASE_URL}/study-plan/", headers=headersA)
        print("Plan A status:", res_planA.status_code, len(res_planA.json()))
        print("Plan B status:", res_planB.status_code, len(res_planB.json()))

        # If data is empty for both, we need to create an exam result for B and see if A can see it.

if __name__ == "__main__":
    asyncio.run(test_isolation())
