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
def test_viva_e2e_flow(logged_in_page: Page):
    """Test AI Viva conversation flow."""
    page = logged_in_page
    
    page.locator("a[href='/viva']").first.click()
            
    page.wait_for_url(f"**/*viva*", timeout=10000)
    
    # Wait for the Start Viva button to become available and click it
    page.wait_for_selector("button:has-text('Start Viva')", timeout=10000)
    page.locator("button", has_text="Start Viva").first.click()

    # After starting, either a question textarea appears or an empty state is shown.
    # Try to locate the textarea; if not present, skip answer steps.
    if page.locator("textarea").first.is_visible():
        # Wait for the textarea to be ready
        page.locator("textarea").first.wait_for(state="visible", timeout=15000)
        # Type an answer
        page.locator("textarea").first.fill(
            "Memory management is the process of controlling and coordinating computer memory."
        )
        # Determine whether to click Save & Next or Submit Viva
        next_btn = page.locator("button", has_text="Save & Next")
        submit_btn = page.locator("button", has_text="Submit Viva")
        if next_btn.count() > 0:
            next_btn.first.click()
        elif submit_btn.count() > 0:
            submit_btn.first.click()
    else:
        # No questions were assigned; simply proceed without answering.
        pass

    # Return to the Viva session list (Start Viva button should be visible again)
    page.wait_for_selector("button:has-text('Start Viva')", timeout=15000)
