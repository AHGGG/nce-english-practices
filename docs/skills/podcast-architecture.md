# Podcast Architecture & Apple API Strategy

This document outlines the architecture choices and "gotchas" discovered while implementing the Podcast Service, specifically regarding Apple's RSS APIs.

## Apple RSS API Strategy (Hybrid Approach)

We use a **Hybrid Strategy** combining Apple's Legacy V1 API and the modern V2 API to achieve the best of both worlds (Category filtering + Stability).

### 1. The "Genre Filtering" Pitfall
*   **Problem**: The modern V2 API (`rss.applemarketingtools.com`) **ignores** the `genre` query parameter for Top Charts. It always returns the Global Top Podcasts regardless of the genre ID provided.
*   **Solution**: We MUST use the **Legacy V1 API** (`itunes.apple.com/us/rss/...`) for category-specific requests.
*   **Verification**:
    *   `V2 (Global)`: `https://rss.applemarketingtools.com/api/v2/us/podcasts/top/100/podcasts.json` (Works)
    *   `V2 (Genre)`: `.../top/100/podcasts.json?genre=1301` (IGNORES GENRE, returns Global)
    *   `V1 (Genre)`: `https://itunes.apple.com/us/rss/toppodcasts/limit=100/genre=1301/json` (WORKS, returns Arts category)

### 2. API Limits & Stability
*   **V2 API Limit**: The V2 API throws a **500 Internal Server Error** if `limit > 100`. Do not request more than 100 items.
*   **V1 API Limit**: The V1 API supports up to **200** items.
*   **Recommendation**: We set our internal `CACHE_SIZE = 100` as a safe common denominator.

### 3. Data Normalization
The two APIs return drastically different JSON structures. The `PodcastService` includes a normalization layer to handle both:

| Feature | V1 (Legacy) | V2 (Modern) |
| :--- | :--- | :--- |
| **Root** | `feed.entry` (List or Dict) | `feed.results` (List) |
| **Title** | `im:name.label` | `name` |
| **Artist** | `im:artist.label` | `artistName` |
| **Images** | `im:image` (List of objects) | `artworkUrl100` (String) |
| **ID** | `id.attributes.im:id` | `id` |

### 4. RSS URL Lookup (The "Missing Link")
Both Top Charts APIs often **omit the direct RSS Feed URL**, providing only the iTunes ID.
*   **Solution**: We perform a secondary "Lookup" call.
*   **Optimization**: We use **Batch Lookup** (comma-separated IDs) to resolve 100+ RSS URLs in a single HTTP request (max ~150 IDs per request safe limit).
*   **Endpoint**: `https://itunes.apple.com/lookup?id=ID1,ID2,ID3...`

## Caching Strategy

To ensure instant response times and avoid hitting API rate limits:

1.  **Background Refresher**: A `start_cache_refresher` task runs on server startup and every **12 hours**.
2.  **Scope**: It proactively fetches the **Top 100** podcasts for:
    *   Global Top Charts
    *   All 22 supported Categories (Arts, Business, Comedy, etc.)
3.  **Memory Cache**: Data is stored in `PodcastService._trending_cache` (process-local memory).
4.  **Fallback**: If the cache is cold (service just started), it fetches from upstream on-demand and caches the result.

## Development Tips

*   **Proxy Support**: All upstream calls respect the `PROXY_URL` env var.
*   **SSL Issues**: Legacy iTunes endpoints may have strict/old SSL chains. The service implements retry logic (Standard -> Verify=False) to handle proxy/SSL handshake failures in strict environments.
