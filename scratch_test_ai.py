import httpx
import asyncio
import os
import time

BASE_URL = "http://localhost:8000/api/v1"

async def test_ai_core():
    async with httpx.AsyncClient() as client:
        print("1. Logging in...")
        res = await client.post(f"{BASE_URL}/auth/login", data={"username": "demo.student1@example.com", "password": "demopass"})
        token = res.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        print("2. Getting subjects...")
        subs_res = await client.get(f"{BASE_URL}/academic/subjects", headers=headers)
        subjects = subs_res.json()
        if not subjects:
            print("No subjects found.")
            return
        subject_id = subjects[0]["id"]
        print(f"   Selected Subject ID: {subject_id}")

        print("3. Uploading Material...")
        test_content = b"The mitochondria is the powerhouse of the cell. AgentExam is a cool AI testing tool. The quick brown fox jumps over the lazy dog."
        with open("test_upload.txt", "wb") as f:
            f.write(test_content)
        
        with open("test_upload.txt", "rb") as f:
            files = {"file": ("test_upload.txt", f, "text/plain")}
            data = {
                "title": "Test Material Powerhouse",
                "material_type": "NOTES",
                "subject_id": subject_id
            }
            # Fastapi expects Form for everything except the file
            upload_res = await client.post(f"{BASE_URL}/materials/upload", headers=headers, data=data, files=files)
        
        print("   Upload Status:", upload_res.status_code)
        if upload_res.status_code != 201:
            print(upload_res.json())
            return
            
        mat_id = upload_res.json()["id"]
        
        print(f"4. Waiting for processing on {mat_id}...")
        for _ in range(10):
            await asyncio.sleep(2)
            mat_res = await client.get(f"{BASE_URL}/materials/{mat_id}", headers=headers)
            status = mat_res.json().get("processing_status")
            print(f"   Status: {status}")
            if status == "COMPLETED" or status == "FAILED":
                break
                
        print("5. Testing Question Generation (AI)...")
        # Ask to generate a question based on the subject
        q_data = {
            "subject_id": subject_id,
            "topic": "mitochondria",
            "question_type": "MULTIPLE_CHOICE",
            "difficulty": "MEDIUM",
            "count": 1
        }
        q_res = await client.post(f"{BASE_URL}/questions/generate", headers=headers, json=q_data)
        print("   Question Gen Status:", q_res.status_code)
        if q_res.status_code == 200:
            print("   Question Generated:", q_res.json()[0].get("text", "No text"))
        else:
            print("   Question Gen Error:", q_res.json())

        print("6. Testing RAG (Chat/AI)...")
        # We assume there is an AI chat or RAG endpoint.
        # Let's check what RAG endpoints exist. There might be a /chat or /rag route.
        # This will be tested if the route exists.

if __name__ == "__main__":
    asyncio.run(test_ai_core())
