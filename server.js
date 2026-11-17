'use strict';

const express = require('express');
const Parser = require('rss-parser');

const app = express();
const parser = new Parser({ timeout: 10000 });
const port = Number(process.env.PORT) || 8080;
const subredditNames = (process.env.REDDIT_SUBREDDITS || 'programming,technology')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter((name) => /^[a-z0-9_]{2,21}$/.test(name));
const history = new Map();
const MAX_SAMPLES = 100;

function record(subreddit, ok) {
  const samples = history.get(subreddit) || [];
  samples.push({ ok, at: new Date().toISOString() });
  history.set(subreddit, samples.slice(-MAX_SAMPLES));
}

function uptimePercent(subreddit) {
  const samples = history.get(subreddit) || [];
  if (samples.length === 0) return null;
  const successful = samples.filter((sample) => sample.ok).length;
  return Math.round((successful / samples.length) * 10000) / 100;
}

async function fetchFeed(subreddit) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/.rss`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'public-reddit-rss-monitor/1.0 (RSS feed reader)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Reddit returned HTTP ${response.status}`);
    const xml = await response.text();
    const parsed = await parser.parseString(xml);
    record(subreddit, true);
    return {
      subreddit,
      url,
      title: parsed.title || `r/${subreddit}`,
      ok: true,
      latencyMs: Date.now() - started,
      uptimePercent: uptimePercent(subreddit),
      items: (parsed.items || []).slice(0, 25).map((item) => ({
        title: item.title || '(untitled)',
        link: item.link || '',
        publishedAt: item.isoDate || item.pubDate || null,
      })),
    };
  } catch (error) {
    record(subreddit, false);
    return {
      subreddit,
      url,
      title: `r/${subreddit}`,
      ok: false,
      latencyMs: Date.now() - started,
      uptimePercent: uptimePercent(subreddit),
      error: error.name === 'TimeoutError' ? 'Feed request timed out' : error.message,
      items: [],
    };
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'reddit-rss-monitor',
    uptimeSeconds: Math.floor(process.uptime()),
    checkedAt: new Date().toISOString(),
  });
});

app.get('/api/feeds', async (_req, res) => {
  const feeds = await Promise.all(subredditNames.map(fetchFeed));
  res.json({ checkedAt: new Date().toISOString(), feeds });
});

app.get('/api/feeds/:subreddit', async (req, res) => {
  const subreddit = req.params.subreddit.toLowerCase();
  if (!/^[a-z0-9_]{2,21}$/.test(subreddit)) {
    return res.status(400).json({ error: 'Invalid subreddit name.' });
  }
  const feed = await fetchFeed(subreddit);
  return res.status(feed.ok ? 200 : 502).json(feed);
});

app.listen(port, () => {
  console.log(`Reddit RSS monitor listening on port ${port}`);
});
