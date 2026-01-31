# Mobile Development Pitfalls

> 移动端开发踩坑记录 (2026-01)
>
> 本文档记录了使用 NativeWind v4 + React Native + Expo SDK 54 开发时遇到的问题和解决方案。

---

## 1. React 版本冲突

### Symptom

"Invalid hook call" runtime error when running mobile app.

### Root Cause

Multiple React versions (19.1.0 vs 19.2.4) in the monorepo workspace due to nested dependencies.

### Fix

**Option A**: Add `react` and `react-dom` as devDependencies in `packages/shared/package.json`:

```json
{
  "devDependencies": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

**Option B**: Use pnpm overrides in root `package.json`:

```json
{
  "overrides": {
    "react": "19.1.0",
    "react-dom": "19.1.0"
  }
}
```

---

## 2. NativeWind CSS 不生效 (白屏)

### Symptom

App renders with no styles - white background, unstyled text.

### Root Cause

Mobile's `tailwind.config.js` had no custom color tokens defined, so classes like `bg-bg-base`, `text-text-primary` were ignored.

### Fix

**Step 1**: Add Cyber-Noir design tokens to `apps/mobile/global.css`:

```css
:root {
  /* Background Hierarchy */
  --color-bg-base: #050505;
  --color-bg-surface: #0a0a0a;

  /* Text Hierarchy */
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #888888;
  --color-text-muted: #666666;

  /* ... all other tokens (same as web index.css) */
}
```

**Step 2**: Configure color tokens in `apps/mobile/tailwind.config.js`:

```js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: { base: "var(--color-bg-base)" },
        text: { primary: "var(--color-text-primary)" },
        accent: {
          primary: "rgb(var(--color-accent-primary) / <alpha-value>)",
        },
        // ... all other tokens
      },
    },
  },
};
```

**Step 3**: Configure Metro in `apps/mobile/metro.config.cjs`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

---

## 3. Android 模拟器崩溃 - SafeAreaView edges Prop

### Symptom

App loads, shows splash, then immediately crashes on Android emulator.

### Log Error

```
Native crash in libreact_codegen_safeareacontext.so
at RNCSafeAreaViewShadowNode::adjustLayoutWithState()
```

### Root Cause

The `edges` prop on `SafeAreaView` (e.g., `edges={["top"]}`) causes a native crash in React Native 0.81.5 / Expo SDK 54.

### Fix

Remove all `edges` props from SafeAreaView components:

```jsx
// BEFORE (crashes)
<SafeAreaView className="flex-1" edges={["top"]}>

// AFTER (works)
<SafeAreaView className="flex-1">
```

**Affected files**: All screens using SafeAreaView with edges prop.

---

## 4. expo-notifications 在 SDK 53+ 被移除

### Symptom

App crashes on startup with:

```
expo-notifications: Android Push notifications functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53. Use a development build instead of Expo Go.
```

### Root Cause

Expo Go SDK 53+ removed expo-notifications support.

### Fix

**Step 1**: Comment out imports in `apps/mobile/app/_layout.tsx`:

```tsx
// NOTE: expo-notifications removed from Expo Go in SDK 53+
// Uncomment when using Development Build
// import { notificationService } from "../src/services/NotificationService";
```

**Step 2**: Replace notification toggle in `apps/mobile/app/settings.tsx`:

```tsx
const toggleNotifications = async (value: boolean) => {
  Alert.alert(
    "Not Available",
    "Push notifications require a Development Build. This feature is disabled in Expo Go.",
  );
  setNotificationsEnabled(false);
};
```

**Step 3**: Re-enable when using Development Build (APK via `npx expo run:android`).

---

## 5. react-native-safe-area-context 缺失

### Symptom

SafeAreaView renders but app crashes when navigating to screens using it.

### Root Cause

The package was only installed as a transitive dependency, not explicitly in `package.json`.

### Fix

Add explicit dependency to `apps/mobile/package.json`:

```json
{
  "dependencies": {
    "react-native-safe-area-context": "~5.6.0"
  }
}
```

**Important**: After changing dependencies:

```bash
npx expo prebuild --clean
npx expo run:android
```

---

## 6. pnpm 临时目录问题 (Windows)

### Symptom

`pnpm install` fails with:

```
ENOENT: no such file or directory, scandir 'node_modules/react-native-css-interop_tmp_***/node_modules'
```

### Root Cause

NativeWind's postinstall script creates temp directories that conflict with Windows file locking.

### Fix

```powershell
# Clear problematic temp directories
rm -rf node_modules/react-native-css-interop_tmp_*

# Retry install (packages still install despite errors)
pnpm install
```

---

## 7. Metro Bundler 缓存问题

### Symptom

Changes to `tailwind.config.js` or `global.css` not reflected in app.

### Fix

Always clear Metro cache after config changes:

```bash
npx expo start --clear
# or manually delete node_modules/.cache
```

---

## 8. Android 模拟器不稳定

### Symptom

App crashes, freezes, or shows black screen on Android emulator.

### Context

Android x86 emulators are known to be unstable, especially with native modules and GPU rendering.

### Workaround

Use a real physical device for development:

```bash
# Connect via USB with USB debugging enabled
# Run and press 'a' to open on connected device
npx expo start

# Or use adb connect for wireless debugging
adb connect <device-ip>
```

---

## 9. Development Build vs Expo Go

| Feature                          | Expo Go            | Development Build     |
| -------------------------------- | ------------------ | --------------------- |
| Native modules (not in Expo SDK) | ❌ No              | ✅ Yes                |
| Background audio                 | ❌ No              | ✅ Yes                |
| Push notifications               | ❌ Removed SDK 53+ | ✅ Yes                |
| Build speed                      | Instant (download) | 3-10 minutes          |
| Debugging                        | Limited            | Full native debugging |

### Recommendation

For production features requiring native code, always use **Development Build**:

```bash
# Create development build
npx expo run:android

# Or build for distribution
eas build --profile development
```

Use **Expo Go** only for rapid prototyping of pure JS/React features.

---

## Quick Commands Reference

```bash
# Start development with cache clear
cd apps/mobile
npx expo start --clear --offline

# Build development APK
npx expo run:android

# Rebuild native code after dependency changes
npx expo prebuild --clean

# Install dependencies
pnpm install

# Clear problematic temp dirs
rm -rf node_modules/react-native-css-interop_tmp_*
```

---

## Related Files

- `apps/mobile/package.json` - Dependencies
- `apps/mobile/global.css` - Design tokens
- `apps/mobile/tailwind.config.js` - Tailwind config
- `apps/mobile/metro.config.cjs` - Metro bundler config
- `apps/mobile/app/_layout.tsx` - App entry point
- `apps/mobile/src/lib/platform-init.ts` - Platform adapters
