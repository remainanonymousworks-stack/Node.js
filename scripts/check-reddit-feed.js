'use strict';

const Parser = require('rss-parser');
const parser = new Parser({ timeout: 10000 });
const subreddit = (process.argv[2] || '').toLowerCase();

if (!/^[a-z0-9_]{2,21}$/.test(subreddit)) {
  console.error('Usage: npm run check:reddit -- <subreddit>');
  process.exit(2);
}

(async () => {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/.rss`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'public-reddit-rss-monitor/1.0 (RSS feed reader)' },
      signal: AbortSignal.timeout(10000),
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) throw new Error(`HTTP ${response.status} after ${latencyMs} ms`);
    const feed = await parser.parseString(await response.text());
    console.log(JSON.stringify({
      subreddit,
      url,
      ok: true,
      latencyMs,
      title: feed.title,
      itemCount: (feed.items || []).length,
      checkedAt: new Date().toISOString(),
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ subreddit, url, ok: false, latencyMs: Date.now() - started, error: error.message }, null, 2));
    process.exitCode = 1;
  }
})();
