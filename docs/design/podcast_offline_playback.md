# 播客离线播放技术方案设计文档 (Podcast Offline Playback Design Doc)

## 1. 背景与目标
当前播客功能已实现因特网在线流式播放和简单的文件下载（下载到本地磁盘）。为了提供类似原生 App 的用户体验，计划在未来引入 **App 内离线播放** 功能。

**核心目标**：
- 在用户无网络连接时，仍能在 Web App 内部播放已下载的播客。
- 保持用户体验的一致性（无需手动打开本地文件）。
- 优化流量消耗，播放过的音频下次自动走缓存。

## 2. 方案选型对比

| 方案 | 技术栈 | 优点 | 缺点 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **A. 纯下载 (当前)** | `Backend Proxy` + `System Download` | 简单，文件可见，方便拷贝 | **App 内无法离线播放**，体验割裂 | 用户需归档保存文件 |
| **B. PWA 缓存 (推荐)** | `Service Worker` + `Cache API` | **App 内无缝离线**，无需修改播放器逻辑，广泛支持 | 占用浏览器缓存空间 (Quota)，需要处理缓存管理 | 主流 Web App 离线听歌 |
| **C. 本地文件系统** | `File System Access API` (OPFS) | 性能极高，适合读写极大的文件 | 写代码极其复杂，iOS/Firefox 支持一般 | 专业视频编辑器 / IDE |

**结论：选择方案 B (PWA 缓存)**。这是目前做 Web 离线内容的工业标准，也是 Spotify (PWA)、YouTube Music 等采用的主流方案。

## 3. 推荐架构设计：基于 Workbox 的 PWA 离线架构

### 3.1 核心流程 (Core Flow)
1.  **拦截 (Intercept)**：Service Worker 拦截所有 `*.mp3` 或后端代理 `/api/podcast/proxy/*` 的网络请求。
2.  **策略 (Strategy)**：
    *   **播放时**：使用 `StaleWhileRevalidate` 或 `CacheFirst`。边听边存，下次直接读缓存。
    *   **下载时**：用户点击下载 -> 前端 Fetch -> 写入 Cache API -> 写入 IndexedDB (元数据)。
3.  **播放 (Playback)**：
    *   断网时，`<audio src="...">` 发起请求。
    *   Service Worker 拦截请求，发现 Cache 中有对应 Response，直接返回 Blob。
    *   播放器对此无感知，以为还在联网播放。

### 3.2 技术实现细节

#### 3.2.1 引入 Workbox
推荐使用 `vite-plugin-pwa` 配合 `workbox` 进行配置，避免手写复杂的 Service Worker 生命周期管理。

```javascript
// vite.config.js 配置示例
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [{
          // 匹配规则：匹配音频文件后缀或专门的音频代理路径
          urlPattern: ({ request, url }) => request.destination === 'audio' || url.pathname.endsWith('.mp3'),
          
          // 策略：缓存优先。有缓存用缓存，没缓存去下载并缓存。
          handler: 'CacheFirst',
          
          options: {
            cacheName: 'podcast-audio-cache',
            expiration: {
              maxEntries: 50, // 限制最大缓存集数，防止爆磁盘
              maxAgeSeconds: 30 * 24 * 60 * 60, // 缓存保留30天
            },
            // 关键配置：允许缓存跨域的不透明响应 (Opaque Responses)
            // 注意：不透明响应无法获取文件大小，可能影响 Quota 计算
            cacheableResponse: { statuses: [0, 200] },
            
            // 插件：支持 Range Requests (关键！否则无法拖动进度条)
            plugins: [
              new workbox.rangeRequests.RangeRequestsPlugin(),
            ],
          },
        }]
      }
    })
  ]
})
```

#### 3.2.2 "显式下载" 逻辑实现
为了区分“自动缓存”和“用户收藏下载”，即使使用了 Service Worker，我们也需要一个显式的下载动作。

```javascript
// frontend/src/utils/offline.js

// 1. 下载音频到 Cache API
export async function downloadEpisodeForOffline(url) {
  const cache = await caches.open('podcast-audio-cache');
  // 显式添加，强制触发 Service Worker 的缓存逻辑
  await cache.add(url); 
}

// 2. 保存元数据到 IndexedDB (使用 idb-keyval 库)
import { set, get } from 'idb-keyval';

export async function saveEpisodeMetadata(episode) {
  const offlineEpisodes = await get('offline_episodes') || [];
  offlineEpisodes.push({
    id: episode.id,
    title: episode.title,
    image: episode.image_url,
    downloadedAt: Date.now()
  });
  await set('offline_episodes', offlineEpisodes);
}
```

## 4. 关键问题解决方案 (FAQ)

### Q1: 跨域资源 (CORS) 怎么办？
大多数 Podcast 托管商（如 AWS S3）未必配置了允许你的域名访问的 CORS 头。
*   **混合下载策略 (Hybrid Strategy)**:
    1.  **优先尝试直连 (Direct)**: 前端先尝试对原始 URL 发起 `HEAD` 请求。如果支持 CORS 且能获取 Content-Length，则直接下载，节省服务器带宽。
    2.  **自动回退代理 (Proxy Fallback)**: 如果直连失败（CORS 错误或 Mixed Content），则自动切换到后端代理下载。
    *   前端请求：`<audio src="/api/podcast/proxy?url=ORIGINAL_URL">`
    *   后端 (FastAPI)：转发请求流，并添加 `Access-Control-Allow-Origin: *`。
    *   这样 Service Worker 就能完美缓存 Response，且支持 Range Requests。

### Q2: 存储空间配额 (Quota)
浏览器通常允许使用磁盘空闲空间的 60%-80%。
*   **策略**: 使用 `navigator.storage.estimate()` 监控配额。
*   **UI**: 在“已下载”页面显示存储占用情况 (e.g., "Used 500MB of 20GB")。

### Q3: iOS Safari 兼容性
iOS Safari 对 Service Worker 拦截 Range Requests 的支持曾有 Bug。
*   **状态**: 现代 iOS (15+) 支持较好。
*   **兜底**: Workbox 的 `RangeRequestsPlugin` 是必须的，它能将 Range 请求转化为对完整 Cache Blob 的切片读取。

## 5. 实施路线图 (Roadmap)

1.  **Phase 1 (PWA 基础)**:
    *   引入 `vite-plugin-pwa`。
    *   配置基本的 Manifest (图标、名称)。
    *   配置 Workbox 缓存策略 (CacheFirst for mp3)。

2.  **Phase 2 (代理优化)**:
    *   优化后端 `/api/podcast/download` 接口，支持 HTTP Range (206 Partial Content) 转发，确保拖动进度条流畅。
    *   前端播放器 URL 切换为后端代理地址。

3.  **Phase 3 (离线中心 UI)**:
    *   开发“我的下载”页面。
    *   集成 IndexedDB 读写逻辑。

139:     *   实现离线状态下的 UI 降级（显示“已下载”，隐藏不可用内容）。
140: 
141: ## 6. 数据库架构设计 (Database Schema)
142: 
143: 采用 **Shared Feed Model (共享订阅源)** 设计，避免同一 RSS 源被不同用户重复存储。
144: 
145: ### 6.1 核心表结构 (ER Diagram Concepts)
146: 
147: 1.  **`podcast_feeds` (Global)**
148:     *   存储 RSS 源的元数据 (Title, Description, Author)。
149:     *   **关键点**：无 `user_id`，`rss_url` 全局唯一。后台爬虫只需更新此表。
150: 
151: 2.  **`podcast_feed_subscriptions` (User <-> Feed)**
152:     *   记录用户订阅了哪些 Feed。
153:     *   PK: `(user_id, feed_id)`。
154: 
155: 3.  **`podcast_episodes` (Global)**
156:     *   属于某个 Feed 的单集信息 (Audio URL, Duration, Transcript)。
157:     *   **关键点**：全局仅存一份，所有订阅该 Feed 的用户共享。
158: 
159: 4.  **`user_episode_states` (User State)**
160:     *   记录用户对单集的个性化状态。
161:     *   Field: `current_position_seconds` (断点续传), `is_finished` (标记听完), `listened_at` (最近播放)。
162:     *   **优势**：通过 `UPSERT` 快速更新播放进度。
163: 
164: 5.  **`podcast_listening_sessions` (Analytics)**
165:     *   播放流水日志。每一次播放行为（Start -> End）生成一条记录。
166:     *   用于分析用户学习时长、习惯。
