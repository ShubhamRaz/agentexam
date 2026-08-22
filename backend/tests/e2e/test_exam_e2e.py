import pytest
from playwright.sync_api import Page, expect
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@pytest.fixture
def logged_in_page(page: Page):
    """Fixture to log in before tests."""
    page.goto(f"{FRONTEND_URL}/login")
    page.fill("input[type='email']", "demo.student1@example.com")
    page.fill("input[type='password']", "demopass")
    page.click("button[type='submit']")
    page.wait_for_url(f"{FRONTEND_URL}/")
    return page

@pytest.mark.e2e
def test_theory_exam_flow(logged_in_page: Page):
    """Test theory exam from selection to result."""
    page = logged_in_page
    
    # Go to Exams
    page.locator("a[href='/exams']").first.click()
    expect(page).to_have_url(f"{FRONTEND_URL}/exams")
    
    # Wait for subject dropdown to load options
    page.wait_for_selector("select", timeout=10000)
    # Wait for at least one option to be loaded in DOM
    page.wait_for_selector("select option", state="attached", timeout=10000)
    # Select the first available subject
    page.select_option("select", index=0)
    # Click 'Start Mock Test'
    page.locator("button", has_text="Start Mock Test").first.wait_for(state="visible")
    page.locator("button", has_text="Start Mock Test").first.click()
        
    # Wait for active exam interface to load
    page.wait_for_selector(".exam-interface", timeout=15000)
    
    # Answer questions and navigate to submit button
    while page.locator("button:has-text('Next Question')").count() > 0 and page.locator("button:has-text('Next Question')").first.is_visible():
        options = page.locator("input[type='radio']")
        if options.count() > 0:
            options.first.click()
        page.locator("button", has_text="Next Question").first.click()
        
    # On final question, select option if MCQ
    options = page.locator("input[type='radio']")
    if options.count() > 0:
        options.first.click()
        
    # Wait for and click Submit Exam
    page.locator("button", has_text="Submit Exam").first.wait_for(state="visible", timeout=10000)
    page.locator("button", has_text="Submit Exam").first.click()
    
    # Verify we go to Results screen with score and pass status
    page.wait_for_selector("text=Test Completed!", timeout=20000)
    expect(page.locator("text=PASSED").or_(page.locator("text=NOT PASSED")).first).to_be_visible()


@pytest.mark.e2e
def test_practical_exam_flow(logged_in_page: Page):
    """Test practical exam."""
    page = logged_in_page
    
    page.locator("a[href='/practical']").first.click()
    expect(page).to_have_url(f"{FRONTEND_URL}/practical")
    
    # Wait for New Session button to load
    page.wait_for_selector("button:has-text('New Session')", timeout=10000)
    
    # Click New Session
    page.locator("button", has_text="New Session").first.click()
        
    # Wait for practical editor or submission form
    page.wait_for_selector("textarea", timeout=10000)
    
    # Write some code
    page.fill("textarea", "def bfs(graph, start): pass")
    
    # Submit Experiment
    page.locator("button", has_text="Submit Experiment").first.click()
    
    # Expect success return to Practical sessions list
    page.wait_for_selector("button:has-text('New Session')", timeout=10000)
