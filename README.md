# Reddit RSS monitor: Android + App Engine

A small reader for **public Reddit RSS feeds**. It fetches feed titles/items and reports request latency and recent process-local availability. It does not access payment data, inspect device-wide network traffic, or collect personal identifiers.

## Backend (App Engine Standard)

Requirements: Node.js 22 and gcloud CLI.

```sh
npm install
REDDIT_SUBREDDITS=programming,technology npm start
```

Endpoints:

- `GET /api/health` — service health and process uptime in seconds.
- `GET /api/feeds` — fetches the configured subreddit feeds, returning items, fetch latency, and recent successful-check percentage.
- `GET /api/feeds/:subreddit` — fetches one public subreddit feed.

The `uptimePercent` value is calculated from up to 100 feed checks held in process memory; it resets on restart and is not a long-term SLA. Use Cloud Monitoring or persistent storage for durable uptime history. Configure the feed list with `REDDIT_SUBREDDITS` (comma-separated subreddit names); arbitrary URLs are not accepted.

Deploy:

```sh
gcloud app deploy app.yaml
```

Run the one-off diagnostic script:

```sh
npm run check:reddit -- programming
```

The script prints the feed URL, HTTP success, fetch latency, item count, and timestamp. It sends a descriptive User-Agent to Reddit and uses a 10-second timeout. Respect Reddit's current access policies and rate limits.

## Android app

Open the `android/` directory in Android Studio and run the `app` configuration. The app fetches `/api/feeds`, displays feed fetch latency and recent availability, and stores the latest successful JSON response in app-private SharedPreferences for offline display.

For the Android emulator, the default API URL is `http://10.0.2.2:8080`. For a deployed service, change `API_BASE_URL` in `android/app/src/main/java/com/example/redditfeedmonitor/MainActivity.kt` to the HTTPS App Engine service URL. The manifest permits cleartext only to support local emulator development; use HTTPS in deployment.

No user account or device identifier is sent to the backend. The local cache can be cleared by clearing the app's storage in Android settings.
