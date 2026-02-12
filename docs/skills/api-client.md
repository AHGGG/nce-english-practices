# Enhanced API Client

统一的 HTTP 客户端，基于原生 fetch API，提供便利方法、自动错误处理和 token 管理。

## Why Enhanced authFetch (Not Axios)

### 优势

1. **跨平台兼容** - 原生 fetch 在 Web 和 React Native 都原生支持
2. **流式响应支持** - 项目大量使用 SSE 和流式 LLM 输出，fetch 的 ReadableStream 更直接
3. **轻量级** - 无额外依赖，减少 bundle size
4. **TypeScript 友好** - 更简洁的类型定义
5. **完全掌控** - 代码在自己掌控中，可按需定制

### 对比 Axios

| 特性        | Enhanced authFetch | Axios           |
| ----------- | ------------------ | --------------- |
| Bundle Size | ~0KB (原生)        | ~13KB (gzipped) |
| 流式响应    | ✅ 原生支持        | ⚠️ 支持较弱     |
| RN 兼容性   | ✅ 原生支持        | ⚠️ 需要配置     |
| 自动 JSON   | ✅                 | ✅              |
| 拦截器      | ✅ (内置)          | ✅              |
| 请求取消    | ✅ AbortController | ✅ CancelToken  |
| 超时控制    | ✅                 | ✅              |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AuthService (packages/api/src/auth.ts)                     │
│  - authFetch(url, options) → Response (low-level)           │
│  - get<T>(url) → T (convenience)                            │
│  - post<T>(url, data) → T (convenience)                     │
│  - put<T>(url, data) → T (convenience)                      │
│  - delete<T>(url) → T (convenience)                         │
│  - patch<T>(url, data) → T (convenience)                    │
│  - getWithTimeout<T>(url, ms) → T                           │
│  - postWithTimeout<T>(url, data, ms) → T                    │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Token Management                                            │
│  - Proactive refresh (60s buffer)                           │
│  - Reactive retry on 401                                    │
│  - Cross-platform storage (TokenStorage interface)          │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Error Handling                                              │
│  - ApiError class with status code                          │
│  - is(status) - Check specific status                       │
│  - isClientError() - Check 4xx                              │
│  - isServerError() - Check 5xx                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Files

| File                            | Description                 |
| ------------------------------- | --------------------------- |
| `packages/api/src/auth.ts`      | AuthService 核心实现        |
| `packages/api/src/storage.ts`   | Token 存储抽象层            |
| `apps/web/src/api/auth.js`      | Web 端重新导出              |
| `apps/web/src/api/client.js`    | Dictionary & Vocabulary API |
| `apps/web/src/api/podcast.js`   | Podcast API                 |
| `apps/web/src/api/audiobook.js` | Audiobook API               |

## Quick Start

### Basic Usage

```javascript
import { apiGet, apiPost, apiPut, apiDelete } from "@nce/api";

// GET request
const user = await apiGet("/api/user/profile");

// POST request
const result = await apiPost("/api/data", { name: "test", value: 123 });

// PUT request
const updated = await apiPut("/api/data/1", { name: "updated" });

// DELETE request
await apiDelete("/api/data/1");
```

### Error Handling

```javascript
import { apiGet, ApiError } from "@nce/api";

try {
  const data = await apiGet("/api/data");
} catch (error) {
  if (error instanceof ApiError) {
    console.log("Status:", error.status);

    if (error.is(404)) {
      console.log("Not found");
    }

    if (error.isClientError()) {
      console.log("Client error (4xx)");
    }
  }
}
```

### Request Cancellation

```javascript
import { apiGet } from "@nce/api";

const controller = new AbortController();

// Start request
const promise = apiGet("/api/data", { signal: controller.signal });

// Cancel request
controller.abort();
```

### Timeout Control

```javascript
import { authService } from "@nce/api";

// GET with 5 second timeout
const data = await authService.getWithTimeout("/api/data", 5000);

// POST with 10 second timeout
const result = await authService.postWithTimeout(
  "/api/data",
  { value: 123 },
  10000,
);
```

### Streaming Responses (SSE, Blobs)

For streaming responses, use the low-level `authFetch`:

```javascript
import { authFetch } from "@nce/api";

// Server-Sent Events (SSE)
const response = await authFetch("/api/stream");
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  console.log("Received:", chunk);
}

// Blob download
const response = await authFetch("/api/file/download");
const blob = await response.blob();
```

### FormData Upload

```javascript
import { authFetch } from "@nce/api";

const formData = new FormData();
formData.append("file", fileInput.files[0]);

// Don't set Content-Type, browser will set it with boundary
const response = await authFetch("/api/upload", {
  method: "POST",
  body: formData,
});

if (!response.ok) throw new Error("Upload failed");
const result = await response.json();
```

## API Reference

### Convenience Methods

All methods automatically:

- Add authentication token
- Refresh token if expired
- Parse JSON responses
- Throw `ApiError` on failure

#### `apiGet<T>(url: string, options?: RequestInit): Promise<T>`

GET request with automatic JSON parsing.

```javascript
const users = await apiGet("/api/users");
const user = await apiGet("/api/users/123");
```

#### `apiPost<T>(url: string, data?: any, options?: RequestInit): Promise<T>`

POST request with automatic JSON serialization and parsing.

```javascript
const created = await apiPost("/api/users", {
  name: "John",
  email: "john@example.com",
});
```

#### `apiPut<T>(url: string, data?: any, options?: RequestInit): Promise<T>`

PUT request with automatic JSON serialization and parsing.

```javascript
const updated = await apiPut("/api/users/123", {
  name: "John Updated",
});
```

#### `apiDelete<T>(url: string, options?: RequestInit): Promise<T>`

DELETE request with automatic JSON parsing.

```javascript
await apiDelete("/api/users/123");
```

#### `apiPatch<T>(url: string, data?: any, options?: RequestInit): Promise<T>`

PATCH request with automatic JSON serialization and parsing.

```javascript
const patched = await apiPatch("/api/users/123", {
  email: "newemail@example.com",
});
```

### Low-Level Method

#### `authFetch(url: string, options?: RequestInit): Promise<Response>`

Low-level fetch with automatic token management. Use for:

- Streaming responses (SSE, ReadableStream)
- Blob downloads
- FormData uploads
- Custom response handling

```javascript
const response = await authFetch("/api/custom");
// Handle response manually
```

### Error Class

#### `ApiError`

Custom error class for API failures.

**Properties:**

- `status: number` - HTTP status code
- `message: string` - Error message
- `response?: Response` - Original Response object

**Methods:**

- `is(status: number): boolean` - Check if error is a specific status
- `isClientError(): boolean` - Check if error is 4xx
- `isServerError(): boolean` - Check if error is 5xx

## Migration Guide

### Before (Old authFetch)

```javascript
import { authFetch } from "./api/auth";

const response = await authFetch("/api/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ value: 123 }),
});

if (!response.ok) {
  throw new Error("Request failed");
}

const data = await response.json();
```

### After (New convenience methods)

```javascript
import { apiPost } from "./api/auth";

const data = await apiPost("/api/data", { value: 123 });
```

## Best Practices

### 1. Use Convenience Methods for JSON APIs

They handle serialization, parsing, and errors automatically.

```javascript
// ✅ Good
const data = await apiGet("/api/data");

// ❌ Avoid (unless you need custom handling)
const response = await authFetch("/api/data");
const data = await response.json();
```

### 2. Use authFetch for Special Cases

Streaming, blobs, FormData, or custom response handling.

```javascript
// ✅ Good - Streaming response
const response = await authFetch("/api/stream");
const reader = response.body.getReader();

// ✅ Good - FormData upload
const formData = new FormData();
formData.append("file", file);
const response = await authFetch("/api/upload", {
  method: "POST",
  body: formData,
});
```

### 3. Handle Errors Properly

Use `ApiError` to check status codes and error types.

```javascript
try {
  const data = await apiGet("/api/data");
} catch (error) {
  if (error instanceof ApiError) {
    if (error.is(404)) {
      // Handle not found
    } else if (error.isServerError()) {
      // Handle server error
    }
  }
}
```

### 4. Add Timeouts for Critical Requests

Prevent hanging requests with `getWithTimeout` / `postWithTimeout`.

```javascript
// ✅ Good - 5 second timeout
const data = await authService.getWithTimeout("/api/data", 5000);

// ❌ Avoid - No timeout, may hang forever
const data = await apiGet("/api/data");
```

### 5. Cancel Requests When Needed

Use `AbortController` for user-initiated cancellations.

```javascript
const controller = new AbortController();

// Start request
const promise = apiGet("/api/search", { signal: controller.signal });

// User cancels search
cancelButton.onclick = () => controller.abort();
```

## TypeScript Support

All methods support TypeScript generics:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Type-safe response
const user = await apiGet<User>("/api/users/123");
console.log(user.name); // TypeScript knows this is a string

// Type-safe request
const created = await apiPost<User>("/api/users", {
  name: "John",
  email: "john@example.com",
});
```

## Common Patterns

### Complete CRUD Example

```javascript
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from "@nce/api";

// List all items
async function listItems() {
  try {
    return await apiGet("/api/items");
  } catch (error) {
    if (error instanceof ApiError && error.is(404)) {
      return [];
    }
    throw error;
  }
}

// Get single item
async function getItem(id) {
  return apiGet(`/api/items/${id}`);
}

// Create item
async function createItem(data) {
  return apiPost("/api/items", data);
}

// Update item
async function updateItem(id, data) {
  return apiPut(`/api/items/${id}`, data);
}

// Delete item
async function deleteItem(id) {
  return apiDelete(`/api/items/${id}`);
}
```

### Search with Cancellation

```javascript
import { apiGet } from "@nce/api";

let currentSearch = null;

async function search(query) {
  // Cancel previous search
  if (currentSearch) {
    currentSearch.abort();
  }

  currentSearch = new AbortController();

  try {
    const results = await apiGet(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: currentSearch.signal,
    });
    return results;
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Search cancelled");
      return null;
    }
    throw error;
  } finally {
    currentSearch = null;
  }
}
```

### Retry with Exponential Backoff

```javascript
import { apiGet, ApiError } from "@nce/api";

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiGet(url);
    } catch (error) {
      if (error instanceof ApiError && error.isServerError()) {
        // Retry on server errors
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
}
```

### Parallel Requests

```javascript
import { apiGet } from "@nce/api";

// Fetch multiple resources in parallel
const [user, posts, comments] = await Promise.all([
  apiGet("/api/user/123"),
  apiGet("/api/posts?user=123"),
  apiGet("/api/comments?user=123"),
]);
```

### Conditional Requests (ETag)

```javascript
import { authFetch } from "@nce/api";

let cachedData = null;
let etag = null;

async function fetchWithCache(url) {
  const headers = {};
  if (etag) {
    headers["If-None-Match"] = etag;
  }

  const response = await authFetch(url, { headers });

  if (response.status === 304) {
    // Not modified, use cached data
    return cachedData;
  }

  etag = response.headers.get("ETag");
  cachedData = await response.json();
  return cachedData;
}
```

## Troubleshooting

### Issue: "ApiError is not defined"

**Solution**: Import `ApiError` from `@nce/api`:

```javascript
import { apiGet, ApiError } from "@nce/api";
```

### Issue: Request hangs forever

**Solution**: Add timeout:

```javascript
// Instead of
const data = await apiGet("/api/slow");

// Use
const data = await authService.getWithTimeout("/api/slow", 10000);
```

### Issue: FormData upload fails

**Solution**: Don't set `Content-Type` header, let browser set it:

```javascript
// ❌ Wrong
const response = await authFetch("/api/upload", {
  method: "POST",
  headers: { "Content-Type": "multipart/form-data" }, // Wrong!
  body: formData,
});

// ✅ Correct
const response = await authFetch("/api/upload", {
  method: "POST",
  body: formData, // Browser sets Content-Type with boundary
});
```

### Issue: Streaming response not working

**Solution**: Use `authFetch`, not convenience methods:

```javascript
// ❌ Wrong - convenience methods parse JSON
const data = await apiGet("/api/stream");

// ✅ Correct - use authFetch for streaming
const response = await authFetch("/api/stream");
const reader = response.body.getReader();
```

## Related Skills

- [Mobile Architecture](./mobile-architecture.md) - Cross-platform token storage
- [Content Renderer](./content-renderer.md) - Using API client in renderers
