const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to GitHub discussions...');
    await page.goto('https://github.com/orgs/community/discussions/categories/models', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    // Wait for the discussions to load
    await page.waitForSelector('[data-testid="discussion-item"]', { timeout: 10000 });
    
    // Get all discussion items
    const discussions = await page.$$('[data-testid="discussion-item"]');
    
    if (discussions.length === 0) {
      console.log('No discussions found with the expected selector. Trying alternative approach...');
      
      // Alternative approach: look for discussion links in the page
      const discussionLinks = await page.$$eval('a[href*="/discussions/"]', links => 
        links
          .filter(link => link.href.includes('/community/discussions/'))
          .map(link => ({
            url: link.href,
            title: link.textContent.trim(),
            element: link
          }))
          .slice(0, 5) // Get first 5 to analyze
      );
      
      if (discussionLinks.length > 0) {
        console.log(`Found ${discussionLinks.length} discussion links`);
        console.log('Most recent discussion (first in list):');
        console.log(`Title: ${discussionLinks[0].title}`);
        console.log(`URL: ${discussionLinks[0].url}`);
      } else {
        console.log('No discussion links found at all.');
      }
      
      return;
    }
    
    console.log(`Found ${discussions.length} discussions`);
    
    // Get the first (most recent) discussion
    const firstDiscussion = discussions[0];
    
    // Extract the discussion link
    const discussionLink = await firstDiscussion.$('a[href*="/discussions/"]');
    const url = await discussionLink?.getAttribute('href');
    const title = await discussionLink?.textContent();
    
    // Extract the time information
    const timeElement = await firstDiscussion.$('relative-time');
    const datetime = await timeElement?.getAttribute('datetime');
    const timeText = await timeElement?.textContent();
    
    // Extract author information
    const authorLink = await firstDiscussion.$('a[href*="/"]');
    const author = await authorLink?.textContent();
    
    if (url && datetime) {
      console.log('=== MOST RECENT DISCUSSION ===');
      console.log(`Title: ${title?.trim() || 'No title found'}`);
      console.log(`Author: ${author?.trim() || 'No author found'}`);
      console.log(`Time: ${datetime} (${timeText?.trim() || 'No relative time'})`);
      console.log(`URL: https://github.com${url}`);
    } else {
      console.log('Could not extract discussion details.');
      console.log('URL:', url);
      console.log('DateTime:', datetime);
    }
    
  } catch (error) {
    console.error('Error occurred:', error.message);
    
    // Debug: Take a screenshot and save page content
    await page.screenshot({ path: 'debug-screenshot.png' });
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('First 500 chars of page content:', content.substring(0, 500));
    
  } finally {
    await browser.close();
  }
})();
