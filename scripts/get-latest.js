const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://github.com/orgs/community/discussions/categories/models', { waitUntil: 'networkidle' });

  // Get the first discussion item
  const discussion = await page.$('a[data-hovercard-type="discussion"]');
  const url = await discussion?.getAttribute('href');
  const timeEl = await page.$('relative-time');
  const datetime = await timeEl?.getAttribute('datetime');

  if (url && datetime) {
    console.log(`Most recent discussion:\nTime: ${datetime}\nURL: https://github.com${url}`);
  } else {
    console.log("No discussions found.");
  }

  await browser.close();
})();
