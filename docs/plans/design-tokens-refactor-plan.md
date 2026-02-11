# Design Tokens 重构改造文档

> 本文档指导将 `@nce/ui-tokens` 从当前实现重构为符合 DTCG 标准的多平台设计 tokens 系统。

## 一、当前状态分析

### 1.1 项目结构

```
packages/ui-tokens/
├── src/
│   ├── index.ts          # 主导出
│   ├── colors.ts         # 颜色 tokens (TypeScript 对象)
│   ├── typography.ts     # 排版 tokens
│   └── css-variables.ts  # CSS 变量生成器
├── tailwind.config.js    # Tailwind 配置
└── package.json
```

### 1.2 当前问题清单

| 问题类型         | 具体描述                                                                 | 影响               |
| ---------------- | ------------------------------------------------------------------------ | ------------------ |
| **三处重复定义** | `ui-tokens/colors.ts`、`web/index.css`、`mobile/global.css` 定义相同颜色 | 维护成本高，易出错 |
| **值不一致**     | ui-tokens 用 `#050505`，web/mobile 用 `#0a0f0d`                          | 视觉不统一         |
| 未使用 preset    | 虽然 package.json 导出了 preset，但 web/mobile 未使用                    | 共享失败           |
| RGB 格式混乱     | 不同文件使用不同 RGB 值                                                  | 透明度功能可能失效 |
| 缺少 tokens      | 无 spacing、shadow、animation、breakpoint tokens                         | 功能不完整         |
| 无别名引用       | 只能硬编码，无法引用其他 token                                           | 主题切换困难       |
| Mobile 兼容      | NativeWind 不支持 `/<alpha-value>` 语法                                  | 移动端需特殊处理   |

### 1.3 当前颜色值差异

```ts
// packages/ui-tokens/src/colors.ts
bg: { base: "#050505" }  // 纯黑

// apps/web/src/index.css (第 47-51 行)
--color-bg-base: #0a0f0d;  // 深绿黑
--color-bg-surface: #152821;
--color-bg-elevated: #1a3329;
```

**必须在改造中统一！**

---

## 二、改造目标

### 2.1 核心目标

1. **符合 DTCG 标准** - 采用 Design Tokens Community Group 规范
2. **真正的单点定义** - 所有 tokens 一处定义，多处生成
3. **多平台输出** - 自动生成 CSS Variables、JavaScript、React Native、iOS、Android
4. **完整的 token 类型** - 颜色、排版、间距、阴影、动画、断点
5. **支持主题切换** - 亮色/暗色主题无缝切换
6. **类型安全** - 完整的 TypeScript 类型推导

### 2.2 目标架构

```
packages/ui-tokens/
├── tokens/                    # 源 tokens (DTCG 标准 JSON)
│   ├── colors.json           # 颜色 tokens
│   ├── typography.json       # 排版 tokens
│   ├── spacing.json          # 间距 tokens
│   ├── shadows.json          # 阴影 tokens
│   ├── animation.json        # 动画 tokens
│   └── themes.json           # 主题定义
├── src/
│   ├── index.ts              # 主导出
│   ├── primitives.ts         # 原始 token 类型定义
│   ├── semantic.ts           # 语义 token 类型定义
│   └── utils.ts              # 工具函数
├── config/                   # Style Dictionary 配置
│   └── style-dictionary.config.js
├── generated/                # 自动生成的文件
│   ├── css/variables.css
│   ├── js/tokens.ts
│   ├── rn/tokens.ts
│   └── ...
├── tailwind.config.js        # Tailwind preset (引用 generated)
├── package.json
└── tsconfig.json
```

---

## 三、详细改造步骤

### 步骤 1: 创建 DTCG 标准 Token 文件

#### 3.1.1 创建 `tokens/colors.json`

```json
{
  "color": {
    "core": {
      "black": { "$value": "#000000", "$type": "color" },
      "white": { "$value": "#FFFFFF", "$type": "color" }
    },
    "accent": {
      "primary": { "$value": "#00FF94", "$type": "color" },
      "danger": { "$value": "#FF4444", "$type": "color" },
      "info": { "$value": "#3B82F6", "$type": "color" },
      "warning": { "$value": "#FFB800", "$type": "color" },
      "success": { "$value": "#00FF94", "$type": "color" }
    },
    "neon": {
      "green": { "$value": "#00FF94", "$type": "color" },
      "cyan": { "$value": "#00D4FF", "$type": "color" },
      "purple": { "$value": "#9B59B6", "$type": "color" },
      "pink": { "$value": "#FF0080", "$type": "color" }
    },
    "category": {
      "orange": { "$value": "#F97316", "$type": "color" },
      "blue": { "$value": "#3B82F6", "$type": "color" },
      "amber": { "$value": "#F59E0B", "$type": "color" },
      "red": { "$value": "#EF4444", "$type": "color" }
    }
  }
}
```

#### 3.1.2 创建 `tokens/semantic.json` (语义层)

```json
{
  "color": {
    "bg": {
      "base": { "$value": "{color.bg.neutral.900}", "$type": "color" },
      "surface": { "$value": "{color.bg.neutral.800}", "$type": "color" },
      "elevated": { "$value": "{color.bg.neutral.700}", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "{color.neutral.0}", "$type": "color" },
      "secondary": { "$value": "{color.neutral.400}", "$type": "color" },
      "muted": { "$value": "{color.neutral.600}", "$type": "color" }
    },
    "border": {
      "default": { "$value": "{color.neutral.800}", "$type": "color" },
      "subtle": { "$value": "{color.neutral.900}", "$type": "color" }
    }
  }
}
```

#### 3.1.3 创建 `tokens/typography.json`

```json
{
  "font": {
    "family": {
      "sans": { "$value": "Inter", "$type": "fontFamily" },
      "serif": { "$value": "Merriweather", "$type": "fontFamily" },
      "mono": { "$value": "JetBrains Mono", "$type": "fontFamily" }
    },
    "weight": {
      "normal": { "$value": 400, "$type": "fontWeight" },
      "medium": { "$value": 500, "$type": "fontWeight" },
      "semibold": { "$value": 600, "$type": "fontWeight" },
      "bold": { "$value": 700, "$type": "fontWeight" }
    },
    "size": {
      "xs": { "$value": 12, "$type": "dimension" },
      "sm": { "$value": 14, "$type": "dimension" },
      "base": { "$value": 16, "$type": "dimension" },
      "lg": { "$value": 18, "$type": "dimension" },
      "xl": { "$value": 20, "$type": "dimension" },
      "2xl": { "$value": 24, "$type": "dimension" },
      "3xl": { "$value": 30, "$type": "dimension" }
    }
  },
  "lineHeight": {
    "tight": { "$value": 1.2, "$type": "number" },
    "normal": { "$value": 1.5, "$type": "number" },
    "relaxed": { "$value": 1.75, "$type": "number" }
  }
}
```

#### 3.1.4 创建 `tokens/spacing.json`

```json
{
  "spacing": {
    "0": { "$value": "0px", "$type": "dimension" },
    "1": { "$value": "4px", "$type": "dimension" },
    "2": { "$value": "8px", "$type": "dimension" },
    "3": { "$value": "12px", "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" },
    "5": { "$value": "20px", "$type": "dimension" },
    "6": { "$value": "24px", "$type": "dimension" },
    "8": { "$value": "32px", "$type": "dimension" },
    "10": { "$value": "40px", "$type": "dimension" },
    "12": { "$value": "48px", "$type": "dimension" },
    "16": { "$value": "64px", "$type": "dimension" }
  }
}
```

#### 3.1.5 创建 `tokens/shadows.json`

```json
{
  "shadow": {
    "soft": { "$value": "0 4px 20px rgba(0, 0, 0, 0.3)", "$type": "shadow" },
    "accent": {
      "$value": "0 4px 20px rgba(0, 255, 148, 0.15)",
      "$type": "shadow"
    },
    "glow": { "$value": "0 0 40px rgba(0, 255, 148, 0.1)", "$type": "shadow" },
    "card": { "$value": "0 8px 32px rgba(0, 0, 0, 0.4)", "$type": "shadow" },
    "float": { "$value": "0 20px 60px rgba(0, 0, 0, 0.5)", "$type": "shadow" }
  }
}
```

#### 3.1.6 创建 `tokens/themes.json`

```json
{
  "theme": {
    "dark": {
      "bg": { "$value": "#050505" },
      "text": { "$value": "#E0E0E0" }
    },
    "light": {
      "bg": { "$value": "#FFFFFF" },
      "text": { "$value": "#1A1A1A" }
    }
  }
}
```

### 步骤 2: 配置 Style Dictionary

#### 3.2.1 安装依赖

```bash
cd packages/ui-tokens
pnpm add -D style-dictionary
```

#### 3.2.2 创建 `config/style-dictionary.config.js`

```javascript
const StyleDictionary = require("style-dictionary");

const config = {
  source: ["tokens/**/*.json"],
  platforms: {
    // CSS Variables (Web)
    css: {
      transformGroup: "css",
      buildPath: "generated/css/",
      files: [
        {
          destination: "variables.css",
          format: "css/variables",
        },
      ],
    },
    // JavaScript (Web/Node.js)
    js: {
      transformGroup: "js",
      buildPath: "generated/js/",
      files: [
        {
          destination: "tokens.ts",
          format: "javascript/module",
        },
      ],
    },
    // React Native
    rn: {
      transformGroup: "rn",
      buildPath: "generated/rn/",
      files: [
        {
          destination: "tokens.ts",
          format: "javascript/module-flat",
        },
      ],
    },
    // Tailwind 需要自定义 format
    tailwind: {
      transforms: ["attribute/cti", "name/kebab", "color/css"],
      buildPath: "generated/tailwind/",
      files: [
        {
          destination: "colors.js",
          format: "tailwind/colors",
        },
      ],
    },
  },
};

StyleDictionary.extend(config).buildAllPlatforms();
```

#### 3.2.3 创建自定义 Transform (可选)

```javascript
// config/transforms.js
module.exports = {
  "color/hex-rgb": (token) => {
    const hex = token.value.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r} ${g} ${b}`;
  },
};
```

### 步骤 3: 更新 package.json scripts

```json
{
  "scripts": {
    "build": "style-dictionary build --config config/style-dictionary.config.js",
    "watch": "style-dictionary build --config config/style-dictionary.config.js --watch",
    "lint": "tsc --noEmit"
  }
}
```

### 步骤 4: 创建 TypeScript 类型定义

#### 3.4.1 创建 `src/primitives.ts`

```typescript
export interface PrimitiveColorToken {
  $value: string;
  $type: "color";
  $description?: string;
}

export interface PrimitiveTypographyToken {
  $value: string | number;
  $type: "fontFamily" | "fontWeight" | "dimension";
  $description?: string;
}

// 从 JSON 自动生成的类型
export interface DesignTokens {
  color: {
    core: Record<string, PrimitiveColorToken>;
    accent: Record<string, PrimitiveColorToken>;
    neon: Record<string, PrimitiveColorToken>;
    category: Record<string, PrimitiveColorToken>;
  };
  font: {
    family: Record<string, PrimitiveTypographyToken>;
    weight: Record<string, PrimitiveTypographyToken>;
    size: Record<string, PrimitiveTypographyToken>;
  };
  spacing: Record<string, { $value: string; $type: "dimension" }>;
  shadow: Record<string, { $value: string; $type: "shadow" }>;
}
```

#### 3.4.2 创建 `src/semantic.ts`

```typescript
import type { DesignTokens } from "./primitives";

export type SemanticColorTokens = {
  bg: {
    base: string;
    surface: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: {
    default: string;
    subtle: string;
  };
};

export type SemanticTokens = {
  colors: SemanticColorTokens;
};
```

### 步骤 5: 改造 Tailwind 配置

#### 3.5.1 更新 `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
const tokens = require("./generated/tailwind/colors");

module.exports = {
  presets: [
    // 可以选择使用 preset 或直接引用生成的配置
    // require('./tailwind.preset.js')
  ],
  theme: {
    extend: {
      colors: tokens,
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(0, 0, 0, 0.3)",
        accent: "0 4px 20px rgba(0, 255, 148, 0.15)",
        glow: "0 0 40px rgba(0, 255, 148, 0.1)",
        card: "0 8px 32px rgba(0, 0, 0, 0.4)",
        float: "0 20px 60px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
```

### 步骤 6: 迁移使用方

#### 3.6.1 改造 `apps/web/tailwind.config.js`

**改造前:**

```javascript
// 完整重复定义所有颜色
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: { base: '#0a0f0d', surface: '#152821', ... },
        text: { primary: '#e8f5e9', ... },
        // ... 150+ 行重复代码
      }
    }
  }
};
```

**改造后:**

```javascript
const tokens = require("@nce/ui-tokens/generated/tailwind/colors");

module.exports = {
  presets: [require("@nce/ui-tokens/tailwind.preset.js")],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  // 只添加 web 特有的扩展
  theme: {
    extend: {
      // 保留 web 特定的字体配置
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
      },
    },
  },
};
```

#### 3.6.2 改造 `apps/web/src/index.css`

**改造前:**

```css
:root {
  --color-bg-base: #0a0f0d;
  --color-bg-surface: #152821;
  --color-bg-elevated: #1a3329;
  /* ... 50+ 行重复定义 */
}
```

**改造后:**

```css
@import "@nce/ui-tokens/generated/css/variables.css";

/* Web 特有的全局样式 */
:root {
  /* 只有 Web 需要的覆盖或扩展 */
  --grid-color: rgba(111, 227, 177, 0.03);
}

body {
  background-color: var(--color-bg-base);
  color: var(--color-text-primary);
}
```

#### 3.6.3 改造 `apps/mobile/tailwind.config.js`

```javascript
const tokens = require("@nce/ui-tokens/generated/rn/tokens");

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("@nce/ui-tokens/tailwind.preset.js")],
  theme: {
    extend: {
      // NativeWind 兼容性处理
      colors: {
        // 移除 /<alpha-value> 语法
        accent: {
          primary: "rgb(0 255 148)",
          danger: "rgb(255 68 68)",
        },
      },
    },
  },
};
```

### 步骤 7: 创建共享组件库

#### 3.7.1 迁移硬编码组件

```tsx
// packages/ui/src/components/Button.tsx
import { colors } from "@nce/ui-tokens";

export function Button({ variant = "primary", children }) {
  const variants = {
    primary: {
      backgroundColor: `rgb(var(${colors.accent.primary}) / 1)`,
    },
    danger: {
      backgroundColor: `rgb(var(${colors.accent.danger}) / 1)`,
    },
  };

  return <button style={variants[variant]}>{children}</button>;
}
```

---

## 四、迁移检查清单

### 4.1 Token 定义阶段

- [ ] 创建 `tokens/colors.json` (原始颜色)
- [ ] 创建 `tokens/semantic.json` (语义颜色)
- [ ] 创建 `tokens/typography.json`
- [ ] 创建 `tokens/spacing.json`
- [ ] 创建 `tokens/shadows.json`
- [ ] 创建 `tokens/themes.json`
- [ ] 统一颜色值 (决定使用 `#050505` 还是 `#0a0f0d`)

### 4.2 构建配置阶段

- [ ] 安装 style-dictionary
- [ ] 创建 `config/style-dictionary.config.js`
- [ ] 配置 CSS 输出
- [ ] 配置 JS 输出
- [ ] 配置 React Native 输出
- [ ] 配置 Tailwind 输出
- [ ] 更新 `package.json` scripts

### 4.3 类型定义阶段

- [ ] 创建 `src/primitives.ts`
- [ ] 创建 `src/semantic.ts`
- [ ] 创建 `src/index.ts` 统一导出

### 4.4 迁移使用方阶段

- [ ] 更新 `apps/web/tailwind.config.js` 使用 preset
- [ ] 更新 `apps/web/src/index.css` 导入 generated CSS
- [ ] 更新 `apps/mobile/tailwind.config.js` 使用 preset
- [ ] 更新 `apps/mobile/global.css` 导入 generated CSS
- [ ] 迁移 `apps/web/src/components/ui/` 中的硬编码颜色
- [ ] 迁移 `apps/mobile/src/components/` 中的硬编码颜色

### 4.5 验证阶段

- [ ] 运行 `pnpm build` 验证构建成功
- [ ] 检查 Web 页面视觉一致性
- [ ] 检查 Mobile 应用视觉一致性
- [ ] 运行 `pnpm lint` 确保类型正确
- [ ] 更新 AGENTS.md 文档

---

## 五、风险与注意事项

### 5.1 兼容性风险

| 风险                               | 缓解措施                                  |
| ---------------------------------- | ----------------------------------------- |
| NativeWind 不支持 `/<alpha-value>` | 在生成 RN tokens 时使用 `rgb(r g b)` 格式 |
| 现有组件硬编码颜色                 | 分批迁移，先保证核心组件                  |
| 暗色模式切换                       | 使用 CSS 变量支持媒体查询                 |

### 5.2 回滚计划

1. 保留原有 `src/colors.ts` 作为备份
2. 使用 Git 分支进行改造
3. 先在开发环境验证，再合并到主分支
4. 准备 `git revert` 预案

### 5.3 注意事项

1. **值统一**: 必须在三处定义中选择一个值并统一
2. **渐进式迁移**: 不需要一次性迁移所有组件
3. **测试覆盖**: 确保每个主题色都有对应的使用场景测试
4. **文档同步**: 更新 AGENTS.md 中的使用示例

---

## 六、文件变更清单

### 6.1 新增文件

```
packages/ui-tokens/
├── tokens/
│   ├── colors.json
│   ├── typography.json
│   ├── spacing.json
│   ├── shadows.json
│   └── themes.json
├── config/
│   └── style-dictionary.config.js
├── generated/
│   ├── css/variables.css
│   ├── js/tokens.ts
│   ├── rn/tokens.ts
│   └── tailwind/colors.js
├── src/
│   ├── primitives.ts
│   ├── semantic.ts
│   └── utils.ts
└── tailwind.preset.js (新增)
```

### 6.2 修改文件

```
packages/ui-tokens/
├── src/colors.ts (删除或标记废弃)
├── src/typography.ts (删除或标记废弃)
├── src/css-variables.ts (删除或标记废弃)
├── tailwind.config.js (简化)
└── package.json (添加 scripts)

apps/web/
├── tailwind.config.js (使用 preset)
└── src/index.css (导入 generated CSS)

apps/mobile/
├── tailwind.config.js (使用 preset)
└── global.css (导入 generated CSS)
```

### 6.3 删除文件 (迁移后)

```
packages/ui-tokens/
├── src/colors.ts (迁移后删除)
├── src/typography.ts (迁移后删除)
└── src/css-variables.ts (迁移后删除)
```

---

## 七、验收标准

1. ✅ 所有 tokens 定义在 `tokens/` 目录下
2. ✅ 使用 DTCG 标准格式 (`$value`, `$type`)
3. ✅ 支持 token 别名引用
4. ✅ 自动生成 CSS、JS、RN 三种输出
5. ✅ `apps/web` 和 `apps/mobile` 使用同一套 tokens
6. ✅ 消除三处重复定义
7. ✅ 颜色值统一
8. ✅ 完整的 TypeScript 类型
9. ✅ AGENTS.md 文档更新

---

## 八、相关资源

- [DTCG 标准规范](https://design-tokens.org/)
- [Style Dictionary 文档](https://amzn.github.io/style-dictionary/)
- [Awesome Design Tokens](https://github.com/sturobson/Awesome-Design-Tokens)
- [Figma Tokens 插件](https://tokens-studio.github.io/)

---

> 文档版本: 1.0
> 创建日期: 2026-02-01
> 负责团队: 前端架构组
