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

---

## 10. NativeWind Alpha Slash Syntax 不生效

### Symptom

Modal 背景透明，显示为白屏而非半透明遮罩：

```jsx
// 不生效 - 背景透明
<View className="bg-black/50">
  <Text>Content</Text>
</View>
```

### Root Cause

NativeWind v4 **不支持** Tailwind 的 alpha slash 语法（如 `bg-black/50`、`bg-accent-primary/20`）。

### Fix

使用内联样式替代：

```jsx
// 生效
<View style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
  <Text>Content</Text>
</View>
```

### Affected Code

```jsx
// BEFORE (broken)
<View className="bg-black/50" />

// AFTER (works)
<View style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }} />
```

---

## 11. 条件样式 (Conditional ClassName) 警告

### Symptom

NativeWind logs warnings about conditional styles:

```
NativeWind: Conditional classes are not currently supported
```

### Root Cause

使用三元表达式动态切换 className 会导致样式不稳定或警告：

```jsx
// 问题代码
<Text className={`text-sm ${isCompleted ? "text-accent-primary" : "text-text-muted"}`}>
```

### Fix

**Option A**: 使用显式样式声明（推荐）

```jsx
<Text className="text-sm text-text-muted" style={{ color: isCompleted ? "#6fe3b1" : undefined }}>
```

**Option B**: 根据状态选择不同的组件

```jsx
{
  isCompleted ? (
    <Text className="text-sm text-accent-primary">Completed</Text>
  ) : (
    <Text className="text-sm text-text-muted">To Read</Text>
  );
}
```

**Option C**: 使用 `display` 属性控制元素显示

```jsx
<CheckCircle
  size={14}
  color="#00FF94"
  style={{ display: isCompleted ? "flex" : "none" }}
/>
```

### Affected Code

```jsx
// BEFORE (warning)
<Text className={`text-sm font-bold ${isCompleted ? "text-accent-primary" : "text-text-muted"}`}>
  {title}
</Text>

// AFTER (clean)
<Text className="text-sm font-bold text-text-muted">
  {title}
</Text>
```

---

## 12. 模板字符串动态类名

### Symptom

颜色不显示或显示为透明：

```jsx
// 问题
<View className={`bg-accent-${isDanger ? "danger" : "primary"}/20`} />
```

### Root Cause

NativeWind 无法解析动态拼接的类名，特别是结合 alpha 语法时。

### Fix

使用内联样式：

```jsx
// 修复前
<View className={`w-2 h-full rounded-full bg-accent-${item.difficulty > 3 ? 'danger' : 'primary'}/20`} />

// 修复后
<View
  className="w-2 h-full rounded-full"
  style={{
    backgroundColor: item.difficulty > 3
      ? "rgb(var(--color-accent-danger))"
      : "rgb(var(--color-accent-primary))",
    opacity: 0.2
  }}
/>
```

### 颜色变量格式

在 `tailwind.config.js` 中配置 RGB 格式颜色：

```js
colors: {
  accent: {
    primary: "111 227 177",  // RGB 格式，无逗号
    danger: "255 107 107",
  }
}
```

使用时用 `rgb(var(--color-accent-primary))`。

---

## 13. Modal 背景透明问题

### Symptom

点击书籍选择器后，Modal 背景透明，看不到遮罩层。

### Root Cause

NativeWind 的 `bg-black/50` 语法不生效，导致背景完全透明。

### Fix

使用完整的内联样式 Modal 结构：

```tsx
<Modal
  visible={isBookModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setIsBookModalVisible(false)}
>
  {/* 内联样式替代 Tailwind 类 */}
  <View
    style={{
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    }}
  >
    <View
      style={{
        backgroundColor: "#0a0f0d",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        width: "100%",
        borderTopWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* 内容 */}
    </View>
  </View>
</Modal>
```

### 完整示例

见 `apps/mobile/app/(tabs)/library.tsx` 中的书籍选择器 Modal。

---

## 14. Web-Only 样式不生效

### Symptom

某些样式在 Native 上不生效：

```jsx
// Web only - 这些在 Native 上无效
<View className="bg-inherit" />
<View className="bg-current" />
```

### Root Cause

`bg-inherit` and `bg-current` are Web 专有属性，NativeWind 不支持。

### Fix

使用明确的颜色值：

```jsx
// BEFORE (web only)
<View className="bg-current" />

// AFTER (works on both)
<View style={{ backgroundColor: "currentColor" }} />
```

---

## 15. backgroundOpacity 插件默认禁用

### Symptom

无法使用 `bg-opacity-XX` 类动态设置透明度。

### Root Cause

NativeWind 为性能默认禁用了 `backgroundOpacity` 插件。

### Fix

**Option A**: 启用插件（在 `tailwind.config.js` 中）：

```js
module.exports = {
  corePlugins: {
    backgroundOpacity: true,
  },
};
```

**Option B**: 直接使用内联样式（推荐，简单场景）：

```jsx
<View style={{ opacity: 0.5 }}>
  <Text>Content</Text>
</View>
```

---

## 16. 低透明度背景在移动端显示为全透明 (Glassmorphism 失效)

### Symptom

在 Web 端显示为 Glassmorphism (毛玻璃) 效果的组件（如 `bg-bg-elevated`，对应 `rgba(255,255,255,0.05)`），在移动端显示为完全透明，导致文字看不清。

### Root Cause

React Native 没有原生的 CSS `backdrop-filter: blur(...)` 支持。低透明度背景（< 10%）如果没有模糊效果衬托，在移动端复杂背景上几乎不可见。

### Fix

**Option A**: 使用实色背景（推荐，性能最好）

```tsx
// BEFORE (透明看不清)
<View className="bg-bg-elevated ...">

// AFTER (实色深灰/黑)
<View className="bg-zinc-900 ...">
```

**Option B**: 使用 `expo-blur` 包裹

```tsx
import { BlurView } from "expo-blur";

<BlurView intensity={20} tint="dark" className="overflow-hidden rounded-xl">
  <View className="bg-white/10 p-4">{/* Content */}</View>
</BlurView>;
```

---

## Quick Reference: NativeWind vs Tailwind Web

| 功能            | Tailwind Web | NativeWind v4                                          |
| --------------- | ------------ | ------------------------------------------------------ |
| `bg-black/50`   | ✅           | ❌ 用 `style={{ backgroundColor: "rgba(0,0,0,0.5)" }}` |
| `bg-opacity-50` | ✅           | ❌ 用 `style={{ opacity: 0.5 }}`                       |
| `bg-inherit`    | ✅           | ❌ 用具体颜色                                          |
| `bg-current`    | ✅           | ❌ 用具体颜色                                          |
| 条件 className  | ✅           | ⚠️ 警告，用显式样式                                    |
| 模板动态类名    | ✅           | ❌ 用内联样式                                          |
| flex-direction  | row (默认)   | column (默认)                                          |
| 低透明度背景    | ✅ (有 blur) | ❌ (无 blur，需用实色或 Expo Blur)                     |

---

## Best Practices for NativeWind

1. **优先使用 Tailwind 类**：简单、静态的样式（如 `p-4`、`rounded-xl`）
2. **透明度用内联**：`style={{ opacity: 0.2 }}` 或 `backgroundColor: "rgba(...)"`
3. **避免条件 className**：使用 `style` 或分状态渲染组件
4. **RGB 颜色变量**：`"111 227 177"` 格式，配合 `rgb(var(--...))`
5. **显式 flex 方向**：始终添加 `flex-row` 或 `flex-col`
6. **移动端背景色**：避免使用极低透明度背景，除非配合 `BlurView`
7. **测试时用真机**：模拟器可能有样式渲染差异
