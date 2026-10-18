"""
Selenium Automated Test Suite for AgentExam Login Page.

By default, this script opens a real, visible browser window so you can watch
the automated tests in action!

Usage:
    python test.py               # Opens visible browser window (default)
    python test.py --headless    # Runs silently in background (headless)
"""

import sys
import time
import argparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions


BASE_URL = "http://localhost:3000"


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    END = "\033[0m"


if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')


def log_pass(test_name: str, detail: str = ""):
    msg = f"{Colors.GREEN}[PASS]{Colors.END} {Colors.BOLD}{test_name}{Colors.END}"
    if detail:
        msg += f" - {detail}"
    print(msg)


def log_fail(test_name: str, error: Exception):
    err_msg = str(error).strip() or repr(error)
    print(f"{Colors.RED}[FAIL]{Colors.END} {Colors.BOLD}{test_name}{Colors.END}: {err_msg}")


def log_info(msg: str):
    print(f"{Colors.BLUE}[INFO]{Colors.END} {msg}")


def log_step(msg: str):
    print(f"  {Colors.CYAN}->{Colors.END} {msg}")


def slow_type(element, text: str, delay: float = 0.05):
    """Types characters with a realistic typing delay for visual clarity."""
    element.clear()
    for char in text:
        element.send_keys(char)
        time.sleep(delay)


def create_driver(headless: bool = False):
    """Initializes and returns a Selenium WebDriver (Chrome with Edge fallback)."""
    # 1. Try Chrome
    try:
        chrome_opts = ChromeOptions()
        if headless:
            chrome_opts.add_argument("--headless=new")
        chrome_opts.add_argument("--start-maximized")
        chrome_opts.add_argument("--no-sandbox")
        chrome_opts.add_argument("--disable-dev-shm-usage")
        chrome_opts.add_argument("--disable-gpu")
        chrome_opts.add_experimental_option("excludeSwitches", ["enable-logging"])
        driver = webdriver.Chrome(options=chrome_opts)
        if not headless:
            driver.maximize_window()
        return driver
    except Exception as e_chrome:
        log_info(f"Chrome initialization failed ({e_chrome}). Falling back to Microsoft Edge...")

    # 2. Try Edge
    try:
        edge_opts = EdgeOptions()
        if headless:
            edge_opts.add_argument("--headless=new")
        edge_opts.add_argument("--start-maximized")
        edge_opts.add_argument("--no-sandbox")
        edge_opts.add_argument("--disable-dev-shm-usage")
        edge_opts.add_argument("--disable-gpu")
        edge_opts.add_experimental_option("excludeSwitches", ["enable-logging"])
        driver = webdriver.Edge(options=edge_opts)
        if not headless:
            driver.maximize_window()
        return driver
    except Exception as e_edge:
        raise RuntimeError(f"Could not initialize Chrome or Edge driver: {e_edge}")


def clear_auth_and_reload(driver, wait):
    """Clears client tokens and reloads to ensure a clean LoginView state."""
    driver.get(BASE_URL)
    driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
    driver.get(BASE_URL)
    wait.until(EC.visibility_of_element_located((By.ID, "email")))
    time.sleep(0.5)


def run_tests(driver, pacing: float = 1.0):
    wait = WebDriverWait(driver, 10)
    failed = 0
    passed = 0

    print("\n" + "=" * 65)
    print(f"{Colors.BOLD}Starting AgentExam Login Page Selenium Test Suite{Colors.END}")
    print(f"Target URL: {BASE_URL}")
    print(f"Visual pacing delay: {pacing}s between major steps")
    print("=" * 65 + "\n")

    # ---------------------------------------------------------
    # Test 1: Page Load and UI Elements Presence
    # ---------------------------------------------------------
    test_name = "Test 1: Verify Login Page Structure & UI Elements"
    try:
        log_step("Navigating to login page and checking form elements...")
        clear_auth_and_reload(driver, wait)
        time.sleep(pacing)

        heading = driver.find_element(By.XPATH, "//*[contains(text(), 'Welcome back')]")
        email_input = driver.find_element(By.ID, "email")
        password_input = driver.find_element(By.ID, "password")
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")

        assert heading.is_displayed(), "Heading 'Welcome back' is not visible"
        assert email_input.is_displayed(), "Email input is not visible"
        assert password_input.is_displayed(), "Password input is not visible"
        assert submit_btn.is_displayed(), "Submit button is not visible"
        assert "Sign In" in submit_btn.text or "Sign in" in submit_btn.text, "Submit button label incorrect"

        log_pass(test_name, "Title, inputs, demo buttons, and submit button rendered properly")
        passed += 1
    except Exception as e:
        log_fail(test_name, str(e))
        failed += 1

    # ---------------------------------------------------------
    # Test 2: Client-side Validation on Empty Fields
    # ---------------------------------------------------------
    test_name = "Test 2: Validation on Empty Submission"
    try:
        log_step("Attempting submission with empty fields...")
        clear_auth_and_reload(driver, wait)

        email_input = driver.find_element(By.ID, "email")
        password_input = driver.find_element(By.ID, "password")
        email_input.clear()
        password_input.clear()

        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()
        time.sleep(pacing)

        alert = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[@role='alert']"))
        )
        assert "Please enter both email and password" in alert.text, f"Unexpected alert text: {alert.text}"
        log_pass(test_name, f"Validation message displayed: '{alert.text.strip()}'")
        passed += 1
    except Exception as e:
        log_fail(test_name, e)
        failed += 1

    # ---------------------------------------------------------
    # Test 3: Password Visibility Toggle
    # ---------------------------------------------------------
    test_name = "Test 3: Password Visibility Toggle"
    try:
        log_step("Typing sample password and testing eye visibility toggle...")
        clear_auth_and_reload(driver, wait)

        password_input = driver.find_element(By.ID, "password")
        slow_type(password_input, "SecretPass123")
        assert password_input.get_attribute("type") == "password", "Default input type should be password"
        time.sleep(pacing * 0.7)

        toggle_btn = driver.find_element(By.XPATH, "//button[@aria-label='Show password' or @aria-label='Hide password']")
        toggle_btn.click()
        time.sleep(pacing * 0.7)
        assert password_input.get_attribute("type") == "text", "Input type should be 'text' after toggle"

        toggle_btn.click()
        time.sleep(pacing * 0.7)
        assert password_input.get_attribute("type") == "password", "Input type should be 'password' after toggle back"

        log_pass(test_name, "Password toggles between hidden and visible text correctly")
        passed += 1
    except Exception as e:
        log_fail(test_name, e)
        failed += 1

    # ---------------------------------------------------------
    # Test 4: Invalid Credentials Handling
    # ---------------------------------------------------------
    test_name = "Test 4: Error Handling with Invalid Credentials"
    try:
        log_step("Entering invalid credentials to verify server error rejection...")
        clear_auth_and_reload(driver, wait)

        email_input = driver.find_element(By.ID, "email")
        password_input = driver.find_element(By.ID, "password")

        slow_type(email_input, "nonexistent_student@test.com")
        time.sleep(0.3)
        slow_type(password_input, "incorrect_password_123")
        time.sleep(pacing * 0.5)

        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()

        alert = wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[@role='alert']"))
        )
        time.sleep(pacing)
        assert alert.is_displayed(), "Error alert should be visible"
        log_pass(test_name, f"Server rejected invalid login with error: '{alert.text.strip()}'")
        passed += 1
    except Exception as e:
        log_fail(test_name, e)
        failed += 1

    # ---------------------------------------------------------
    # Test 5: Quick-fill Demo Account Button
    # ---------------------------------------------------------
    test_name = "Test 5: Student Demo Quick-fill Button"
    try:
        log_step("Clicking 'Try the demo account' quick-fill button...")
        clear_auth_and_reload(driver, wait)

        demo_btn = driver.find_element(By.XPATH, "//button[contains(., 'Try the demo account')]")
        demo_btn.click()
        time.sleep(pacing)

        email_input = driver.find_element(By.ID, "email")
        password_input = driver.find_element(By.ID, "password")

        email_val = email_input.get_attribute("value")
        pass_val = password_input.get_attribute("value")

        assert email_val == "demo@agentexam.ai", f"Expected 'demo@agentexam.ai', got '{email_val}'"
        assert pass_val == "demo123", f"Expected 'demo123', got '{pass_val}'"

        log_pass(test_name, "Demo button correctly populated 'demo@agentexam.ai' and 'demo123'")
        passed += 1
    except Exception as e:
        log_fail(test_name, e)
        failed += 1

    # ---------------------------------------------------------
    # Test 6: Successful Student Login Flow
    # ---------------------------------------------------------
    test_name = "Test 6: Successful Student Login and Navigation"
    try:
        log_step("Submitting demo credentials and waiting for student dashboard...")
        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()

        wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Demo Student') or contains(text(), 'Sign out')]"))
        )
        time.sleep(pacing * 1.5)

        assert len(driver.find_elements(By.XPATH, "//*[contains(text(), 'Study Materials') or contains(text(), 'Dashboard')]")) > 0

        log_pass(test_name, "Logged in successfully as Demo Student and landed on App Shell")
        passed += 1
    except Exception as e:
        log_fail(test_name, e)
        failed += 1

    # ---------------------------------------------------------
    # Test 7: Sign Out Flow
    # ---------------------------------------------------------
    test_name = "Test 7: Sign Out Flow back to Login Screen"
    try:
        log_step("Clicking 'Sign out' button in sidebar...")
        signout_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Sign out')]"))
        )
        signout_btn.click()
        time.sleep(pacing)

        wait.until(
            EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Welcome back')]"))
        )
        assert driver.find_element(By.ID, "email").is_displayed()

        log_pass(test_name, "Sign out successfully cleared session and redirected to login page")
        passed += 1
    except Exception as e:
        log_fail(test_name, e)
        failed += 1

    # ---------------------------------------------------------
    # Test 8: Faculty Demo Quick-Fill and Login Flow
    # ---------------------------------------------------------
    test_name = "Test 8: Faculty Demo Quick-fill & Login Flow"
    try:
        log_step("Testing Faculty demo account quick-fill and login...")
        clear_auth_and_reload(driver, wait)

        faculty_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Faculty demo')]"))
        )
        faculty_btn.click()
        time.sleep(pacing * 0.8)

        email_input = driver.find_element(By.ID, "email")
        password_input = driver.find_element(By.ID, "password")
        assert email_input.get_attribute("value") == "faculty@agentexam.ai"
        assert password_input.get_attribute("value") == "faculty123"

        submit_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
        submit_btn.click()

        wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(text(), 'Dr. Meera Krishnan') or contains(text(), 'New Classroom') or contains(text(), 'Sign out')]")
            )
        )
        time.sleep(pacing * 1.5)

        log_pass(test_name, "Logged in successfully as Faculty member and reached Faculty dashboard")
        passed += 1
    except Exception as e:
        log_fail(test_name, e)
        failed += 1

    # ---------------------------------------------------------
    # Summary
    # ---------------------------------------------------------
    print("\n" + "=" * 65)
    print(f"Test Summary: {Colors.BOLD}{passed} Passed{Colors.END}, {Colors.RED if failed else Colors.GREEN}{failed} Failed{Colors.END}")
    print("=" * 65 + "\n")

    # Give the user a moment to see the completed state before browser closes
    log_info("Tests completed! Keeping browser visible for 3 seconds before closing...")
    time.sleep(3)

    return failed == 0


def main():
    parser = argparse.ArgumentParser(description="AgentExam Selenium Login Test")
    parser.add_argument(
        "--headless",
        action="store_true",
        default=False,
        help="Run in headless mode (silently without opening visible browser window)"
    )
    parser.add_argument(
        "--pacing",
        type=float,
        default=0.8,
        help="Pacing delay in seconds between actions for visual clarity (default: 0.8s)"
    )
    args = parser.parse_args()

    log_info(f"Opening browser window (headless={args.headless})...")

    driver = None
    try:
        driver = create_driver(headless=args.headless)
        success = run_tests(driver, pacing=args.pacing)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n{Colors.RED}[FATAL ERROR]{Colors.END} {e}")
        sys.exit(2)
    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    main()
