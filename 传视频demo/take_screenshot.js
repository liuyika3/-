import { chromium } from 'playwright';

(async () => {
  try {
    console.log("Launching Edge...");
    const browser = await chromium.launch({ 
      channel: 'msedge',
      headless: true 
    });
    console.log("Browser launched. Creating page...");
    const page = await browser.newPage({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 3,
    });
    console.log("Page created. Navigating to localhost:5004...");
    await page.goto('http://127.0.0.1:5004/', { waitUntil: 'networkidle' });
    console.log("Navigated. Waiting 3s...");
    await page.waitForTimeout(3000); // Wait for animations
    console.log("Taking screenshot...");
    await page.screenshot({ path: 'screenshot.png' });
    console.log("Closing browser...");
    await browser.close();
    console.log('Screenshot saved to screenshot.png');
  } catch (e) {
    console.error("Error occurred:");
    console.error(e);
    process.exit(1);
  }
})();
