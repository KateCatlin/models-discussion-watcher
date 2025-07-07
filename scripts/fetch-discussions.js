const { chromium } = require('playwright');
const fs = require('fs');

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
    console.log('Waiting for discussions to load...');
    await page.waitForSelector('li.Box-row.js-navigation-item', { timeout: 15000 });
    
    // Get all discussion items
    const discussions = await page.$$eval('li.Box-row.js-navigation-item', (items) => {
      return items.map(item => {
        // Find the discussion title link
        const titleLink = item.querySelector('a.markdown-title.discussion-Link--secondary');
        if (!titleLink) return null;
        
        // Find the author
        const authorLink = item.querySelector('a.Link--muted.Link--inTextBlock[href^="/"][aria-label*="author"]');
        
        // Find the timestamp
        const timeElement = item.querySelector('relative-time');
        
        // Find comment count
        const commentLink = item.querySelector('a[aria-label*="comment"]');
        const commentCount = commentLink ? commentLink.textContent.trim() : '0';
        
        return {
          title: titleLink.textContent.trim(),
          url: titleLink.href,
          author: authorLink ? authorLink.textContent.trim() : 'Unknown',
          datetime: timeElement ? timeElement.getAttribute('datetime') : null,
          timeText: timeElement ? timeElement.textContent.trim() : null,
          commentCount: commentCount
        };
      }).filter(item => item !== null);
    });
    
    if (discussions.length === 0) {
      console.log('No discussions found. Let me debug...');
      
      // Debug: check what's actually on the page
      const boxRows = await page.$$eval('li.Box-row', items => items.length);
      console.log(`Found ${boxRows} li.Box-row elements`);
      
      const titleLinks = await page.$$eval('a.markdown-title', links => links.length);
      console.log(`Found ${titleLinks} markdown-title links`);
      
      // Try to get any discussion links
      const anyDiscussionLinks = await page.$$eval('a[href*="/discussions/"]', links => 
        links.map(link => ({
          href: link.href,
          text: link.textContent.trim().substring(0, 100)
        })).slice(0, 5)
      );
      console.log('Any discussion links found:', anyDiscussionLinks);
      
      // Still save an empty array to discussions.json
      fs.writeFileSync('discussions.json', JSON.stringify([], null, 2));
      console.log('Saved empty discussions array to discussions.json');
      return;
    }
    
    // Sort by datetime (most recent first)
    discussions.sort((a, b) => {
      if (a.datetime && b.datetime) {
        return new Date(b.datetime) - new Date(a.datetime);
      }
      return 0;
    });
    
    // Calculate date 30 days ago for filtering
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Filter discussions from the last 30 days
    const recentDiscussions = discussions.filter(discussion => {
      if (!discussion.datetime) return false;
      const discussionDate = new Date(discussion.datetime);
      return discussionDate >= thirtyDaysAgo;
    });
    
    console.log(`Found ${recentDiscussions.length} discussions from the last 30 days out of ${discussions.length} total`);
    console.log('Date range:', thirtyDaysAgo.toISOString(), 'to', new Date().toISOString());
    
    if (recentDiscussions.length === 0) {
      console.log('No discussions found from the last 30 days.');
      // Still save an empty array to discussions.json
      fs.writeFileSync('discussions.json', JSON.stringify([], null, 2));
      console.log('Saved empty discussions array to discussions.json');
      return;
    }

    // Save the filtered discussions to JSON file
    fs.writeFileSync('discussions.json', JSON.stringify(recentDiscussions, null, 2));
    console.log(`Saved ${recentDiscussions.length} discussions to discussions.json`);
    
    // Show basic info about the most recent discussion
    if (recentDiscussions.length > 0) {
      const latest = recentDiscussions[0];
      console.log('\n=== MOST RECENT DISCUSSION (LAST 30 DAYS) ===');
      console.log(`Title: ${latest.title}`);
      console.log(`Author: ${latest.author}`);
      console.log(`Time: ${latest.datetime} (${latest.timeText || 'no relative time'})`);
      console.log(`Comments: ${latest.commentCount}`);
      console.log(`URL: ${latest.url}`);
    }
    
  } catch (error) {
    console.error('Error occurred:', error.message);
    
    // Debug information
    try {
      await page.screenshot({ path: 'debug-screenshot.png' });
      console.log('Page title:', await page.title());
      console.log('Current URL:', page.url());
      
      // Check if we can find any elements
      const anyBoxRows = await page.$$eval('li', items => items.length);
      console.log(`Found ${anyBoxRows} li elements total`);
      
    } catch (debugError) {
      console.error('Error during debugging:', debugError.message);
    }
    
    // Save an empty array on error
    fs.writeFileSync('discussions.json', JSON.stringify([], null, 2));
    console.log('Saved empty discussions array to discussions.json due to error');
    
  } finally {
    await browser.close();
  }
})();
