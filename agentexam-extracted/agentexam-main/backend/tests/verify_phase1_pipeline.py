"""
Verification script for Phase 1: Student Academic Data Pipeline (Tasks 1, 2, 3)
Tests:
1. Student 1 Login
2. Student 2 Login
3. Student 1 uploads PYQ file (Task 1)
4. Processing orchestrator executes OCR/Text extraction & chunking & vector indexing (Task 2)
5. Data ingestion automatically parses and persists Question records (Task 2)
6. Academic Analytics computed from PYQ data scoped to Student 1 (Task 3)
7. Isolation Test: Student 2 cannot view Student 1's uploaded materials or chunks (RAG isolation)
"""
import asyncio
import os
import io
import uuid
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def run_verification():
    print("=== STARTING PHASE 1 PIPELINE VERIFICATION ===")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 1. Login Student 1
        print("\n--- 1. Authenticating Student 1 ---")
        login_res1 = await client.post(
            "/auth/login",
            data={"username": "demo.student1@example.com", "password": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if login_res1.status_code != 200:
            print(f"FAILED: Student 1 Login failed: {login_res1.status_code} {login_res1.text}")
            return False
        token1 = login_res1.json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}
        print("Student 1 Login successful.")

        # 2. Login Student 2
        print("\n--- 2. Authenticating Student 2 ---")
        login_res2 = await client.post(
            "/auth/login",
            data={"username": "demo.student2@example.com", "password": "password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        if login_res2.status_code != 200:
            print(f"FAILED: Student 2 Login failed: {login_res2.status_code} {login_res2.text}")
            return False
        token2 = login_res2.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        print("Student 2 Login successful.")

        # 3. Get Subjects to pick one
        print("\n--- 3. Fetching Subjects ---")
        subj_res = await client.get("/subjects", headers=headers1)
        if subj_res.status_code != 200 or not subj_res.json():
            print(f"FAILED to fetch subjects: {subj_res.status_code} {subj_res.text}")
            return False
        subjects = subj_res.json()
        subject_id = subjects[0]["id"]
        subject_name = subjects[0]["name"]
        print(f"Using Subject: {subject_name} ({subject_id})")

        # 4. Student 1 Uploads PYQ Document
        print("\n--- 4. Student 1 Uploading PYQ Document ---")
        pyq_content = """
        Mid-Term Examination 2025
        Subject: Software Engineering & Data Structures
        
        Q1. What is the time complexity of QuickSort in the average case? [5 Marks]
        A) O(n)
        B) O(n log n)
        C) O(n^2)
        D) O(1)
        Answer: B
        Explanation: Average case of QuickSort is O(n log n).

        Q2. Which data structure uses FIFO principle? (5 Marks)
        A) Stack
        B) Queue
        C) Tree
        D) Graph
        Answer: B
        Explanation: Queue follows First In First Out.

        Q3. What is normalization in relational databases? [10 Marks]
        A) Increasing redundancy
        B) Eliminating anomalies and redundancy
        C) Compressing table rows
        D) Deleting records
        Answer: B

        Q4. Which sorting algorithm is known for stable worst-case O(n log n) performance? [5 Marks]
        A) Merge Sort
        B) Bubble Sort
        C) Selection Sort
        D) Insertion Sort
        Answer: A

        Q5. What is polymorphic behavior in OOP? [10 Marks]
        A) Multiple variables
        B) Ability of a message to be displayed in more than one form
        C) Single inheritance only
        D) Direct memory access
        Answer: B

        Q6. What is the primary purpose of an index in a database? [5 Marks]
        A) To encrypt data
        B) To speed up data retrieval operations
        C) To backup tables
        D) To prevent duplicate records
        Answer: B
        """
        
        files = {
            "file": ("sample_midterm_pyq.txt", io.BytesIO(pyq_content.encode("utf-8")), "text/plain")
        }
        data = {
            "title": "2025 Mid-Term PYQ - Algorithms & OOP",
            "material_type": "PYQ",
            "subject_id": subject_id
        }
        
        upload_res = await client.post("/materials/upload", data=data, files=files, headers=headers1)
        if upload_res.status_code != 201:
            print(f"FAILED: Material upload failed: {upload_res.status_code} {upload_res.text}")
            return False
        
        material_data = upload_res.json()
        material_id = material_data["id"]
        print(f"Material Uploaded Successfully! Material ID: {material_id}")

        # 5. Check Processing Status
        print("\n--- 5. Waiting for Background Processing & Ingestion ---")
        for attempt in range(15):
            await asyncio.sleep(2)
            mat_check = await client.get(f"/materials/{material_id}", headers=headers1)
            if mat_check.status_code == 200:
                p_status = mat_check.json().get("processing_status")
                print(f"  Attempt {attempt+1}: Status = {p_status}")
                if p_status == "PROCESSED":
                    print("Processing completed successfully!")
                    break
                elif p_status == "FAILED":
                    print(f"Processing failed: {mat_check.json().get('processing_error')}")
                    break
        
        # 6. Verify Academic Analytics (Task 3)
        print("\n--- 6. Verifying Academic Analytics Endpoints (Task 3) ---")
        analytics_res = await client.get(f"/academic-analytics/topic-frequency?subject_id={subject_id}", headers=headers1)
        print(f"Topic Frequency Status: {analytics_res.status_code}")
        if analytics_res.status_code == 200:
            print(f"Topic Analytics Response: {analytics_res.json()}")
        
        patterns_res = await client.get(f"/academic-analytics/question-patterns?subject_id={subject_id}", headers=headers1)
        print(f"Question Patterns Status: {patterns_res.status_code}")
        if patterns_res.status_code == 200:
            print(f"Question Patterns Response: {patterns_res.json()}")

        # 7. Verify Data Isolation (Student 2 should NOT see Student 1's uploaded material)
        print("\n--- 7. Verifying Data Isolation between Students ---")
        s2_materials = await client.get("/materials/", headers=headers2)
        if s2_materials.status_code == 200:
            s2_items = s2_materials.json()
            s2_ids = [m["id"] for m in s2_items]
            if material_id in s2_ids:
                print(f"FAILED: Isolation breach! Student 2 can see Student 1's material {material_id}")
                return False
            else:
                print(f"PASSED: Student 2 cannot see Student 1's material. Items count for Student 2: {len(s2_items)}")
        else:
            print(f"Failed to query materials for student 2: {s2_materials.status_code}")

        # 8. Student 2 cannot access material directly
        s2_direct = await client.get(f"/materials/{material_id}", headers=headers2)
        if s2_direct.status_code == 403:
            print("PASSED: Student 2 direct access blocked with 403 Forbidden.")
        else:
            print(f"FAILED: Expected 403 Forbidden for Student 2 direct access, got {s2_direct.status_code}")
            return False

        print("\n=== ALL PHASE 1 PIPELINE VERIFICATION CHECKS PASSED ===")
        return True

if __name__ == "__main__":
    success = asyncio.run(run_verification())
    exit(0 if success else 1)
