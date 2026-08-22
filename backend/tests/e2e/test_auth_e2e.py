import pytest
from playwright.sync_api import Page, expect
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@pytest.mark.e2e
def test_authentication_flow(page: Page):
    """
    Test student login and logout.
    """
    # 1. Login
    page.goto(f"{FRONTEND_URL}/login")
    
    # Wait for the login form
    page.wait_for_selector("input[type='email']")
    
    # Fill in credentials
    page.fill("input[type='email']", "demo.student1@example.com")
    page.fill("input[type='password']", "demopass")
    
    # Click the sign-in button (assuming it's a button with text like 'Sign In' or 'Login')
    page.click("button[type='submit']")
    
    # We should be redirected to the dashboard or home
    # Wait for network idle or a specific element on the dashboard
    page.wait_for_url(f"{FRONTEND_URL}/", timeout=10000)
    
    # Check that we are on the dashboard
    expect(page).to_have_url(f"{FRONTEND_URL}/")
    
    # Verify dashboard elements
    expect(page.locator("text=Welcome").first).to_be_visible()

    # 2. Access protected route directly
    page.goto(f"{FRONTEND_URL}/materials")
    expect(page).to_have_url(f"{FRONTEND_URL}/materials")
    
    # 3. Logout
    page.evaluate("window.localStorage.clear()")
    page.goto(f"{FRONTEND_URL}/login")
    
    # Verify redirect to login
    expect(page).to_have_url(f"{FRONTEND_URL}/login")
    expect(page).to_have_url(f"{FRONTEND_URL}/login")
    
    # 4. Try accessing protected page after logout
    page.goto(f"{FRONTEND_URL}/")
    # Should redirect to login
    page.wait_for_url(f"{FRONTEND_URL}/login")
    expect(page).to_have_url(f"{FRONTEND_URL}/login")
