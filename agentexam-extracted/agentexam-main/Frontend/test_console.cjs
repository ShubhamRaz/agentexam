const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.setItem('agentexam_token', 'fake-token');
  });

  await page.goto('http://localhost:5173/dashboard');
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'screenshot_test.png' });
  console.log('Took screenshot: screenshot_test.png');

  await browser.close();
})();
