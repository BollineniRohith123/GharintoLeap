const puppeteer = require('puppeteer');

async function measureLCP(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Collect LCP metrics
  const lcpData = [];

  page.on('load', async () => {
    // Wait a bit for dynamic content
    await page.waitForTimeout(3000);

    const lcpValue = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check if Performance Observer is supported
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          });

          observer.observe({ entryTypes: ['largest-contentful-paint'] });

          // Fallback: check for existing LCP entries
          setTimeout(() => {
            const existingLCP = performance.getEntriesByType('largest-contentful-paint');
            if (existingLCP.length > 0) {
              resolve(existingLCP[existingLCP.length - 1].startTime);
            } else {
              resolve(null);
            }
          }, 1000);
        } else {
          resolve(null);
        }
      });
    });

    if (lcpValue) {
      lcpData.push({
        url,
        lcp: Math.round(lcpValue * 100) / 100
      });
    }

    console.log(`LCP for ${url}: ${lcpValue ? lcpValue + 'ms' : 'Not available'}`);
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(5000); // Wait for potential LCP updates
  } catch (error) {
    console.error(`Error loading ${url}:`, error.message);
  }

  await browser.close();
  return lcpData;
}

measureLCP('https://web.dev').then(data => {
  console.log('LCP measurement completed:', data);
});
