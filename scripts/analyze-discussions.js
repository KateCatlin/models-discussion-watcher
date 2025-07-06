const { chromium } = require('playwright');

// Simple AI-like analysis function to classify discussions as bug reports
function classifyAsBugReport(title, author, commentCount) {
  const bugKeywords = [
    'bug', 'error', 'issue', 'problem', 'broken', 'not working', 'fail', 'crash',
    'exception', 'unexpected', 'wrong', 'incorrect', 'unable to', 'cannot',
    'doesn\'t work', 'does not work', 'regression', 'breaking', 'broken',
    'malfunction', 'glitch', 'defect', 'fault', 'anomaly'
  ];
  
  const featureKeywords = [
    'feature', 'request', 'enhancement', 'improvement', 'suggestion',
    'proposal', 'idea', 'add', 'support for', 'would be nice', 'could we',
    'please add', 'new feature', 'capability', 'functionality'
  ];
  
  const questionKeywords = [
    'how to', 'how do', 'question', 'help', 'clarification', 'documentation',
    'tutorial', 'guide', 'example', 'usage', 'best practice', 'recommend'
  ];
  
  const titleLower = title.toLowerCase();
  
  // Count keyword matches
  const bugScore = bugKeywords.reduce((count, keyword) => 
    count + (titleLower.includes(keyword) ? 1 : 0), 0);
  
  const featureScore = featureKeywords.reduce((count, keyword) => 
    count + (titleLower.includes(keyword) ? 1 : 0), 0);
  
  const questionScore = questionKeywords.reduce((count, keyword) => 
    count + (titleLower.includes(keyword) ? 1 : 0), 0);
  
  // Additional heuristics
  let confidence = 0;
  let classification = 'other';
  
  if (bugScore > 0) {
    classification = 'bug_report';
    confidence = Math.min(bugScore * 25, 90); // Max 90% confidence
    
    // Boost confidence for certain patterns
    if (titleLower.includes('error') || titleLower.includes('bug')) {
      confidence += 10;
    }
    if (titleLower.includes('not working') || titleLower.includes('broken')) {
      confidence += 15;
    }
  } else if (featureScore > 0) {
    classification = 'feature_request';
    confidence = Math.min(featureScore * 20, 80);
  } else if (questionScore > 0) {
    classification = 'question';
    confidence = Math.min(questionScore * 15, 70);
  } else {
    classification = 'discussion';
    confidence = 30; // Low confidence for general discussions
  }
  
  // Adjust confidence based on comment count (more comments might indicate a real issue)
  const commentNum = parseInt(commentCount) || 0;
  if (commentNum > 5 && classification === 'bug_report') {
    confidence += 5;
  }
  
  confidence = Math.min(confidence, 95); // Cap at 95%
  
  return {
    classification,
    confidence: Math.round(confidence),
    bugScore,
    featureScore,
    questionScore
  };
}

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
      
      return;
    }
    
    // Sort by datetime (most recent first)
    discussions.sort((a, b) => {
      if (a.datetime && b.datetime) {
        return new Date(b.datetime) - new Date(a.datetime);
      }
      return 0;
    });
    
    // Analyze each discussion
    const analyzedDiscussions = discussions.map(disc => {
      const analysis = classifyAsBugReport(disc.title, disc.author, disc.commentCount);
      return {
        ...disc,
        analysis
      };
    });
    
    const latest = analyzedDiscussions[0];
    
    console.log('=== MOST RECENT DISCUSSION ===');
    console.log(`Title: ${latest.title}`);
    console.log(`Author: ${latest.author}`);
    console.log(`Time: ${latest.datetime} (${latest.timeText || 'no relative time'})`);
    console.log(`Comments: ${latest.commentCount}`);
    console.log(`Classification: ${latest.analysis.classification} (${latest.analysis.confidence}% confidence)`);
    console.log(`URL: ${latest.url}`);
    
    console.log('\n=== AI ANALYSIS SUMMARY ===');
    const bugReports = analyzedDiscussions.filter(d => d.analysis.classification === 'bug_report');
    const featureRequests = analyzedDiscussions.filter(d => d.analysis.classification === 'feature_request');
    const questions = analyzedDiscussions.filter(d => d.analysis.classification === 'question');
    const other = analyzedDiscussions.filter(d => d.analysis.classification === 'discussion');
    
    console.log(`Bug Reports: ${bugReports.length}`);
    console.log(`Feature Requests: ${featureRequests.length}`);
    console.log(`Questions: ${questions.length}`);
    console.log(`Other Discussions: ${other.length}`);
    
    console.log('\n=== BUG REPORTS IDENTIFIED ===');
    if (bugReports.length > 0) {
      bugReports.forEach((disc, i) => {
        console.log(`${i + 1}. ${disc.title}`);
        console.log(`   By: ${disc.author} | ${disc.timeText || disc.datetime} | ${disc.commentCount} comments`);
        console.log(`   Confidence: ${disc.analysis.confidence}%`);
        console.log(`   ${disc.url}`);
        console.log('');
      });
    } else {
      console.log('No bug reports identified in recent discussions.');
    }
    
    console.log('\n=== ALL RECENT DISCUSSIONS WITH ANALYSIS ===');
    analyzedDiscussions.slice(0, 10).forEach((disc, i) => {
      const classificationEmoji = {
        'bug_report': '🐛',
        'feature_request': '✨',
        'question': '❓',
        'discussion': '💬'
      };
      
      console.log(`${i + 1}. ${classificationEmoji[disc.analysis.classification]} ${disc.title}`);
      console.log(`   By: ${disc.author} | ${disc.timeText || disc.datetime} | ${disc.commentCount} comments`);
      console.log(`   Classification: ${disc.analysis.classification} (${disc.analysis.confidence}%)`);
      console.log(`   ${disc.url}`);
      console.log('');
    });
    
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
    
  } finally {
    await browser.close();
  }
})();
