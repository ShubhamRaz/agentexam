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
def test_dashboard_and_materials(logged_in_page: Page):
    """Test dashboard data and materials page."""
    page = logged_in_page
    
    # 1. Dashboard
    expect(page.locator("text=Dashboard").first).to_be_visible()
    
    # 2. Navigate to Materials
    page.locator("a[href='/materials']").first.click()
    expect(page).to_have_url(f"{FRONTEND_URL}/materials")
    
    # Verify materials page load
    expect(page.locator("text=My Study Materials").first).to_be_visible(timeout=5000)

@pytest.mark.e2e
def test_syllabus_and_pyqs(logged_in_page: Page):
    """Test Syllabus and PYQs pages."""
    page = logged_in_page
    
    # 1. Syllabus
    page.locator("a[href='/syllabus']").first.click()
    expect(page).to_have_url(f"{FRONTEND_URL}/syllabus")
    # Verify AI syllabus chapters
    expect(page.locator("text=Introduction to AI").first).to_be_visible(timeout=5000)
    
    # 2. PYQs
    page.locator("a[href='/pyqs']").first.click()
    expect(page).to_have_url(f"{FRONTEND_URL}/pyqs")
    # Verify PYQ question displays or page loads
    expect(page.locator("text=Previous Year Questions").first).to_be_visible(timeout=5000)

@pytest.mark.e2e
def test_upload_material_flow(logged_in_page: Page):
    """Test uploading a material via the frontend UI."""
    page = logged_in_page
    
    page.goto(f"{FRONTEND_URL}/upload-material")
    expect(page).to_have_url(f"{FRONTEND_URL}/upload-material")
    
    # Wait for subject dropdown to load
    page.wait_for_selector("#subject-select option", state="attached", timeout=10000)
    
    # Fill file
    page.set_input_files("input[type='file']", {
        "name": "e2e_test_notes.txt",
        "mimeType": "text/plain",
        "buffer": b"E2E Test Note: Neural networks are computational models inspired by biological neural networks."
    })
    
    # Fill title
    page.fill("#mat-title", "E2E Neural Networks Notes")
    
    # Submit form
    page.click("button[type='submit']")
    
    # Verify success banner
    expect(page.locator("text=uploaded successfully").first).to_be_visible(timeout=10000)
