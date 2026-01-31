# Mobile Architecture & Guidelines

The mobile app (`apps/mobile`) shares 95% of its business logic with the web app (`apps/web`) via `@nce/shared` and `@nce/store`.

## 1. Audio & Background Tasks (Crucial)

### Expo Go Limitation

Background audio (e.g., Podcast playback while screen off) **DOES NOT WORK** in the standard Expo Go client. You MUST use a **Development Build**.

### Configuration

| Platform    | Configuration                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------ |
| **iOS**     | `UIBackgroundModes: ["audio"]` in `app.json`                                                     |
| **Android** | `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions (Android 14+ requirement) |

### Service Pattern

Use `staysActiveInBackground: true` in `Audio.setAudioModeAsync()`. Ideally, migrate to `react-native-track-player` for native Lock Screen controls.

## 2. WebView Bridge Strategy

For heavy data transfer (like passing a 2MB book content to the Reader):

| Strategy                       | Use Case                                            |
| ------------------------------ | --------------------------------------------------- |
| **postMessage** (Native → Web) | Heavy data transfer, large JSON payloads            |
| **injectJavaScript**           | Small, frequent updates (e.g., toggling highlights) |

**Android Limit**: Be aware of string length limits in older Android WebViews.

## 3. Voice Implementation (Push-to-Talk)

We use a **Push-to-Talk (PTT)** model for stability on Expo.

| Component      | Details                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| **Input**      | Record AAC (Android) or WAV (iOS) via `expo-av`                                            |
| **Transport**  | Send Base64 encoded audio chunks over WebSocket to `app/services/voice_session.py`         |
| **Output**     | Receive PCM, wrap in WAV header (using `audioUtils.ts`), and play via `expo-av` queue      |
| **MIME Types** | Backend supports dynamic `mime_type` ("audio/aac", "audio/wav") for cross-platform formats |

## 4. Shared State Persistence

| Pattern            | Details                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Library**        | Zustand with `persist` middleware                                                                            |
| **Adapter**        | Must use `createJSONStorage(() => AsyncStorage)` adapter in `apps/mobile`. Standard `localStorage` will fail |
| **Initialization** | Platform adapters initialized in `src/lib/platform-init.ts` called from `_layout.tsx`                        |

## 5. React Native SSE Streaming (2026-01-30)

### Core Lesson

后端必须使用 `stream=True` 才能真正流式发送数据。仅包装一个 `StreamingResponse` 但内部调用同步方法不会产生任何效果。

### Solution

| Layer        | Solution                                                                        |
| ------------ | ------------------------------------------------------------------------------- |
| **Frontend** | Use `react-native-sse` library (based on XMLHttpRequest, handles SSE correctly) |
| **Backend**  | Must use `stream=True` directly on LLM calls, not sync method then yield        |

### Key Files

- `apps/mobile/src/hooks/useWordExplainer.ts`
- `app/services/sentence_study_service.py` (function `stream_word_explanation`)

### Dependency Change

Replace `react-native-fetch-api` with `react-native-sse@^1.2.1`

### Common Issues

| Issue                            | Symptom                                             | Fix                                                                       |
| -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| **Cross-platform Hook Conflict** | Mobile importing Web hooks from `@nce/shared` fails | Mobile must use local hooks with `react-native-sse`                       |
| **Object as String**             | `TypeError: xxx.substring is not a function`        | Check data types, use correct access (e.g., `parsed.overview.summary_en`) |
| **SSE Error Loading**            | Loading state stuck after parse error               | Call `setIsLoading(false)` in catch and error events                      |
| **State Not Reset**              | Old content persists when advancing                 | Call `reset()` in `advance/handleClear`                                   |

## 6. NativeWind Styling Pitfalls (2026-01-31)

NativeWind v4 has multiple differences from Tailwind Web:

| Issue                         | Problem                                                               | Fix                                                                 |
| ----------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Alpha slash syntax**        | `bg-black/50`, `bg-accent-primary/20` don't work                      | Use inline styles: `style={{ backgroundColor: "rgba(0,0,0,0.5)" }}` |
| **Conditional className**     | `className={isActive ? "text-green" : "text-gray"}` triggers warnings | Use explicit styles or separate render logic                        |
| **Template string className** | `className={`bg-accent-${type}`}` doesn't parse                       | Use `style={{ backgroundColor: "rgb(var(--color-accent-...))" }}`   |
| **Web-only styles**           | `bg-inherit`, `bg-current` don't work on native                       | Use specific color values                                           |

**Detailed Solutions**: [Mobile Dev Pitfalls Skill](docs/skills/mobile-dev-pitfalls.md)

## Voice on Mobile

See [Mobile Voice Debugging Skill](docs/skills/mobile-voice-debugging.md) for HTTPS setup and troubleshooting.
