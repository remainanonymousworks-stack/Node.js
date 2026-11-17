package com.example.redditfeedmonitor

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var content: TextView

    // Android emulator loopback to the host machine. Replace with the HTTPS App Engine URL for deployment.
    private val apiBaseUrl = "http://10.0.2.2:8080"
    private val cacheKey = "latest_public_feed_response"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
        }
        val heading = TextView(this).apply {
            text = "Reddit RSS Monitor"
            textSize = 24f
        }
        status = TextView(this).apply { textSize = 14f }
        val refresh = Button(this).apply {
            text = "Refresh feeds"
            setOnClickListener { loadFeeds() }
        }
        content = TextView(this).apply {
            textSize = 16f
            setTextIsSelectable(true)
        }
        val scroll = ScrollView(this).apply {
            addView(content)
        }
        root.addView(heading)
        root.addView(status)
        root.addView(refresh)
        root.addView(scroll, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)

        val cached = getSharedPreferences("rss_cache", MODE_PRIVATE).getString(cacheKey, null)
        if (cached != null) render(cached, "Showing cached feeds while checking for updates…")
        else content.text = "Tap Refresh feeds to load public Reddit RSS feeds."
        loadFeeds()
    }

    private fun loadFeeds() {
        status.text = "Fetching public RSS feeds…"
        executor.execute {
            try {
                val connection = (URL("$apiBaseUrl/api/feeds").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 12_000
                    readTimeout = 12_000
                    requestMethod = "GET"
                }
                val body = try {
                    val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
                    stream.bufferedReader().use { it.readText() }
                } finally {
                    connection.disconnect()
                }
                if (JSONObject(body).has("feeds")) {
                    getSharedPreferences("rss_cache", MODE_PRIVATE).edit().putString(cacheKey, body).apply()
                    runOnUiThread { render(body, "Updated just now · cached on this device") }
                } else {
                    throw IllegalStateException("Backend returned an unexpected response")
                }
            } catch (error: Exception) {
                runOnUiThread {
                    status.text = "Could not refresh: ${error.message ?: "network error"}"
                    if (content.text.isNullOrBlank()) content.text = "No cached feed data yet. Check the backend URL and try again."
                }
            }
        }
    }

    private fun render(json: String, message: String) {
        val root = JSONObject(json)
        val feeds = root.optJSONArray("feeds")
        val lines = mutableListOf<String>()
        if (feeds != null) {
            for (i in 0 until feeds.length()) {
                val feed = feeds.getJSONObject(i)
                lines += "r/${feed.optString("subreddit")} — ${if (feed.optBoolean("ok")) "UP" else "DOWN"}"
                lines += "Latency: ${feed.opt("latencyMs") ?: "—"} ms · Recent availability: ${feed.opt("uptimePercent") ?: "no samples"}%"
                if (!feed.optBoolean("ok")) lines += "Error: ${feed.optString("error", "Feed unavailable")}" 
                val items = feed.optJSONArray("items")
                if (items != null) {
                    for (j in 0 until items.length()) {
                        val item = items.getJSONObject(j)
                        lines += "• ${item.optString("title", "(untitled)")}"
                        val link = item.optString("link")
                        if (link.isNotBlank()) lines += link
                    }
                }
                lines += ""
            }
        }
        content.text = lines.joinToString("\n").ifBlank { "No feed items returned." }
        status.text = "$message · checked ${root.optString("checkedAt", "")}" 
    }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
