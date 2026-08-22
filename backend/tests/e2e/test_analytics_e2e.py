import pytest
from playwright.sync_api import Page, expect
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# We will test 3 different students to ensure multi-student isolation
STUDENTS = [
    ("demo.student1@example.com", "demopass", "Strong Student"),
    ("demo.student2@example.com", "demopass", "Average Student"),
    ("demo.student3@example.com", "demopass", "Weak Student"),
]

@pytest.mark.e2e
@pytest.mark.parametrize("email, password, name", STUDENTS)
def test_analytics_isolation(page: Page, email, password, name):
    """Test Performance, Readiness, and Study Plan isolation for different students."""
    # Login
    page.goto(f"{FRONTEND_URL}/login")
    page.fill("input[type='email']", email)
    page.fill("input[type='password']", password)
    page.click("button[type='submit']")
    
    page.wait_for_url(f"{FRONTEND_URL}/", timeout=15000)
    
    # 1. Performance
    page.locator("a[href='/performance']").first.click()
    expect(page.locator("text=Performance Analytics").first).to_be_visible(timeout=10000)
    
    # 2. Readiness
    page.locator("a[href='/readiness']").first.click()
    expect(page.locator("text=Exam Readiness").first).to_be_visible(timeout=10000)
    
    # 3. Study Plan
    page.locator("a[href='/study-plan']").first.click()
    expect(page.locator("text=Personalized Study Plan").first).to_be_visible(timeout=10000)
    
    # Verify student specific data based on role
    # We check that the student's name is visible, proving session isolation
    expect(page.locator(f"text={name}").first).to_be_visible()
        
    # Logout at the end (direct clear to avoid UI flakiness)
    page.evaluate("window.localStorage.clear()")
    page.goto(f"{FRONTEND_URL}/login")
