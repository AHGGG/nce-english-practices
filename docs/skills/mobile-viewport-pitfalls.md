# Mobile Viewport & Full-Screen Layout Pitfalls (Web)

> Web 端全屏页面在真机移动浏览器上的视口陷阱 (2026-02)
>
> 适用于：精听播放器、Audiobook 播放器等 `overflow-hidden` 全屏布局页面。
> Chrome DevTools 设备模拟器无法复现这些问题——必须在真机上验证。

---

## 1. `min-h-screen` kills `h-dvh`

### Symptom

底部控件（SEG / A-B / 速度按钮）在真机 Chrome 上被裁掉，只能看到部分 UI；DevTools 模拟器完全正常。

### Root Cause

```css
/* BAD */
.container {
  height: 100dvh; /* 动态视口高度，地址栏可见时较小 */
  min-height: 100vh; /* 大视口高度，包含地址栏后面的区域 */
}
```

CSS 规则：**当 `min-height > height` 时，`min-height` 胜出**。

真机上地址栏可见时 `100vh > 100dvh`，所以 `min-h-screen` 把容器撑到大视口尺寸，超出可见区域的部分被 `overflow-hidden` 裁掉。

DevTools 模拟器没有真实地址栏，`100vh == 100dvh`，所以永远看不到这个 bug。

### Fix

使用 CSS 级联 fallback，**不用 `min-height`**：

```css
/* GOOD — 在 index.css @layer utilities 中定义 */
.h-safe-viewport {
  height: 100vh; /* 不支持 dvh 的浏览器用这行 */
  height: 100dvh; /* 支持 dvh 的浏览器第二行覆盖第一行 */
}
```

Tailwind 用法：直接写 `className="h-safe-viewport"` 代替 `h-dvh min-h-screen`。

### Key Rule

> **绝对不要把 `min-h-screen` 当作 `h-dvh` 的 fallback，它们是冲突的。**

---

## 2. Whole-page swipe / address bar gesture

### Symptom

全屏页面在真机上可以整体上下滑动，触发地址栏显示/隐藏，整个 UI 跟着晃动。DevTools 模拟器无此现象。

### Root Cause

两个因素叠加：

1. **`body { min-height: 100vh }`**（全局 CSS）— 在移动端 `100vh` = 大视口，body 比可见区域高，浏览器认为 document 可滚动，允许滑动手势操控地址栏。
2. **Overscroll chaining** — 内部滚动区（如字幕列表）滑到顶/底边界后，scroll 事件冒泡到 document 层，同样触发地址栏手势。

### Fix — 三层防御（缺一不可）

| Layer             | Technique                                         | Purpose                                             |
| ----------------- | ------------------------------------------------- | --------------------------------------------------- |
| Root container    | `fixed inset-0` (不用 `h-dvh`/`h-safe-viewport`)  | 脱离文档流，尺寸锁定到视觉视口，document 无内容可滚 |
| html/body         | `useEffect` 挂载时设 `overflow: hidden`，卸载恢复 | 从 document 层彻底禁止滚动（与 modal 库同一模式）   |
| Inner scroll area | `overscroll-y-contain`                            | 阻断滚动链：内部滚到边界不冒泡到 document           |

Root container 额外加 `overscroll-none` 作为保险。

#### Code: Root container

```tsx
// UnifiedPlayerView.tsx
<div className="fixed inset-0 bg-[#0a0f0d] flex flex-col overflow-hidden overscroll-none">
```

#### Code: Body lock useEffect

```tsx
// 在组件顶层
useEffect(() => {
  const html = document.documentElement;
  const body = document.body;
  const origHtml = html.style.overflow;
  const origBody = body.style.overflow;
  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  return () => {
    html.style.overflow = origHtml;
    body.style.overflow = origBody;
  };
}, []);
```

#### Code: Inner scroll area

```tsx
// AudioContentRenderer.tsx — 字幕滚动区域
<div className="flex-1 overflow-y-auto overscroll-y-contain ...">
```

### Why `fixed inset-0` instead of `h-safe-viewport`?

`h-safe-viewport`（`height: 100dvh`）解决了高度计算问题，但容器仍然在文档流中。只要 `body` 比视口大（全局 `min-height: 100vh` 导致），浏览器就能在 document 层发起滚动。`fixed inset-0` 直接把容器从文档流中移除，釜底抽薪。

---

## 3. Mobile controls must be compact

### Symptom

底部播放控件在移动端堆叠 3-4 行，总高度超出可用空间，底部按钮被裁掉或挤压。

### Root Cause

桌面端一行放得下的控件，在 `< sm` 断点下 `flex-col` 堆叠后高度翻倍。加上地址栏/底部工具栏占用，可用空间比预期少 100-120px。

### Fix — Spotify / Apple Podcasts 布局范式

```
 0:42 ──────── progress ──────── 21:11    ← 时间两端对齐进度条
       [-30s]  [|<]  [▶]  [>|]  [+30s]   ← 播放按钮居中（纯对称）
      [SEG] [A] [B] [A-B] [CLR] [1x]     ← 辅助工具居中
```

关键原则：

- **时间显示紧贴进度条**（`justify-between`），不独占一行
- **播放按钮行只放 transport 控件**，保证 Play 按钮完美居中
- **辅助操作另起一行**，小按钮、等间距、居中
- **冗余状态文字移动端隐藏**（按钮高亮已传达状态，如 Loop 模式）
- 移动端适当缩小 padding/gap/icon size（`py-1.5`/`gap-1.5`/`w-4 h-4`），桌面端用 `sm:` 恢复

### Reference

- `AudioContentRenderer.tsx` — `PlayerControls` 组件
- `UnifiedPlayerView.tsx` — root container

---

## Quick Checklist

新建全屏页面时检查：

- [ ] Root container 用 `fixed inset-0`，不用 `h-dvh`/`h-screen`/`min-h-screen`
- [ ] 组件 mount 时 lock `html/body` overflow，unmount 恢复
- [ ] Root container 加 `overflow-hidden overscroll-none`
- [ ] 内部唯一可滚动区域加 `overscroll-y-contain`
- [ ] 移动端控件紧凑化（时间贴进度条、按钮行纯居中、冗余文字隐藏）
- [ ] **在真机上验证**，不要只看 DevTools 模拟器
