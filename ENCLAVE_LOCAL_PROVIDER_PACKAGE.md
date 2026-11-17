# Enclave Local Provider — package layout

This package layout is a **local development template** for the public RSS reader. It contains no card/payment integration, credential collection, token extraction, device identity tracking, or device-wide network inspection.

```text
enclave-local-provider/
├── README.md
├── app.yaml                    # App Engine Standard configuration
├── package.json                # Backend dependencies and scripts
├── server.js                   # Public RSS API only
├── scripts/
│   └── check-reddit-feed.js    # One-off public feed latency check
├── android/
│   ├── settings.gradle
│   ├── build.gradle
│   ├── gradle.properties
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── java/com/example/redditfeedmonitor/
│               └── MainActivity.kt
└── .env.example                # Non-secret feed configuration
```

## Local workflow

1. Install Node.js 22+ and Android Studio.
2. From the package root, run `npm install`.
3. Set `REDDIT_SUBREDDITS` to comma-separated public subreddit names, or use the example defaults.
4. Start the API with `npm start` (port 8080 by default).
5. Open `android/` in Android Studio and run the app on an emulator. Its development API URL is `http://10.0.2.2:8080`.
6. Run a one-off public-feed latency check with `npm run check:reddit -- programming`.

The Android app caches the latest successful feed response in app-private storage. The backend accepts only subreddit names for feed selection; it does not fetch arbitrary URLs. The local uptime percentage is a small in-memory sample and resets when the process restarts. Deploy only the RSS API with `gcloud app deploy app.yaml`; use HTTPS for deployed service connections.
