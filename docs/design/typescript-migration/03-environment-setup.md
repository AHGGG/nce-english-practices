# 3. 环境准备

## 🛠️ 开发环境要求

### 必需软件

确保你的开发环境已安装以下软件：

| 软件       | 版本要求  | 检查命令            |
| ---------- | --------- | ------------------- |
| Node.js    | >= 18.0.0 | `node --version`    |
| pnpm       | >= 8.0.0  | `pnpm --version`    |
| Git        | >= 2.0.0  | `git --version`     |
| TypeScript | >= 5.0.0  | `npx tsc --version` |

### 编辑器推荐

**强烈推荐使用 Visual Studio Code**，并安装以下扩展：

1. **ESLint** (`dbaeumer.vscode-eslint`)
   - 实时显示代码问题
   - 自动修复部分问题

2. **TypeScript Vue Plugin (Volar)** (`Vue.vscode-typescript-vue-plugin`)
   - 增强 TypeScript 支持

3. **Error Lens** (`usernamehw.errorlens`)
   - 在代码行内显示错误
   - 提高调试效率

4. **Pretty TypeScript Errors** (`yoavbls.pretty-ts-errors`)
   - 美化 TypeScript 错误信息
   - 更易理解

### VS Code 配置

在项目根目录创建 `.vscode/settings.json`（如果不存在）：

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

---

## 📦 安装依赖

### 1. 克隆项目（如果还没有）

```bash
git clone <repository-url>
cd nce-english-practices
```

### 2. 安装依赖

```bash
# 根目录安装所有依赖
pnpm install
```

这会安装所有 workspace 的依赖，包括：

- `apps/web` - Web 端依赖
- `packages/api` - API 包依赖
- `packages/shared` - 共享包依赖
- 其他 packages

### 3. 验证安装

```bash
# 检查 TypeScript 是否正常工作
pnpm turbo typecheck

# 检查 ESLint 是否正常工作
pnpm turbo lint
```

如果看到类型错误，这是正常的（因为还有很多 JS 文件未迁移）。

---

## ⚙️ TypeScript 配置详解

### 当前配置

查看 `apps/web/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": true, // 允许导入 JS 文件
    "skipLibCheck": true, // 跳过库文件类型检查
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true, // 启用严格模式
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true, // 不生成输出文件（Vite 负责构建）
    "jsx": "react-jsx", // 使用新的 JSX 转换
    "checkJs": false, // 不检查 JS 文件（避免噪音）
    "paths": {
      "@/*": ["./src/*"] // 路径别名
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

### 配置说明

#### `strict: true` 包含的检查

启用 `strict: true` 会自动启用以下检查：

1. **`noImplicitAny`** - 禁止隐式 `any` 类型

   ```typescript
   // ❌ 错误
   function add(a, b) {
     return a + b;
   }

   // ✅ 正确
   function add(a: number, b: number) {
     return a + b;
   }
   ```

2. **`strictNullChecks`** - 严格的 null 检查

   ```typescript
   // ❌ 错误
   const user: User = null;

   // ✅ 正确
   const user: User | null = null;
   ```

3. **`strictFunctionTypes`** - 严格的函数类型检查
4. **`strictBindCallApply`** - 严格的 bind/call/apply 检查
5. **`strictPropertyInitialization`** - 严格的属性初始化检查
6. **`noImplicitThis`** - 禁止隐式 `this`
7. **`alwaysStrict`** - 始终使用严格模式

#### 其他重要配置

- **`allowJs: true`** - 允许 TS 和 JS 混用（迁移期间必需）
- **`checkJs: false`** - 不检查 JS 文件（避免大量错误）
- **`skipLibCheck: true`** - 跳过库文件检查（提高性能）
- **`noEmit: true`** - 不生成输出（Vite 负责构建）

### 可选的额外检查

如果你想更严格，可以添加以下配置：

```json
{
  "compilerOptions": {
    // ... 现有配置
    "noUnusedLocals": true, // 禁止未使用的局部变量
    "noUnusedParameters": true, // 禁止未使用的参数
    "noImplicitReturns": true, // 禁止隐式返回
    "noFallthroughCasesInSwitch": true // 禁止 switch 穿透
  }
}
```

**建议**: 初期不要启用这些，等迁移完成后再逐步启用。

---

## 🔍 ESLint 配置增强

### 当前配置

查看 `apps/web/eslint.config.js`：

```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"], // 只检查 JS 文件
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // ... 其他配置
  },
]);
```

### 添加 TypeScript 支持

需要安装 TypeScript ESLint 插件：

```bash
cd apps/web
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

然后更新 `eslint.config.js`：

```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),

  // JavaScript 文件配置
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },

  // TypeScript 文件配置（新增）
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: "./tsconfig.json",
      },
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // TypeScript 特定规则
      "@typescript-eslint/no-explicit-any": "warn", // 警告使用 any
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off", // 不强制返回类型
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // React Hooks 规则
      ...reactHooks.configs.recommended.rules,

      // React Refresh 规则
      "react-refresh/only-export-components": "warn",
    },
  },

  // 配置文件
  {
    files: ["vite.config.js", "postcss.config.js", "tailwind.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
```

### ESLint 规则说明

| 规则                                               | 级别  | 说明                         |
| -------------------------------------------------- | ----- | ---------------------------- |
| `@typescript-eslint/no-explicit-any`               | warn  | 警告使用 `any`（不阻止编译） |
| `@typescript-eslint/no-unused-vars`                | error | 禁止未使用的变量             |
| `@typescript-eslint/explicit-function-return-type` | off   | 不强制函数返回类型（可选）   |

---

## 🔧 必要的工具和脚本

### 1. 类型检查脚本

在 `apps/web/package.json` 中添加（如果没有）：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch"
  }
}
```

使用方法：

```bash
# 一次性检查
pnpm turbo typecheck

# 监听模式（实时检查）
cd apps/web
pnpm typecheck:watch
```

### 2. 文件重命名脚本

创建 `scripts/rename-to-ts.ps1`（Windows PowerShell）：

```powershell
# 用法: .\scripts\rename-to-ts.ps1 apps/web/src/api/auth.js
param([string]$file)

if (-not $file) {
    Write-Host "Usage: .\scripts\rename-to-ts.ps1 <file-path>"
    exit 1
}

if (-not (Test-Path $file)) {
    Write-Host "File not found: $file"
    exit 1
}

$newFile = $file -replace '\.jsx$', '.tsx' -replace '\.js$', '.ts'

if ($file -eq $newFile) {
    Write-Host "File is already TypeScript: $file"
    exit 0
}

Write-Host "Renaming: $file -> $newFile"
git mv $file $newFile

Write-Host "Done! Don't forget to update imports in other files."
```

创建 `scripts/rename-to-ts.sh`（Linux/Mac）：

```bash
#!/bin/bash
# 用法: ./scripts/rename-to-ts.sh apps/web/src/api/auth.js

if [ -z "$1" ]; then
    echo "Usage: ./scripts/rename-to-ts.sh <file-path>"
    exit 1
fi

file="$1"

if [ ! -f "$file" ]; then
    echo "File not found: $file"
    exit 1
fi

newFile="${file%.jsx}.tsx"
newFile="${newFile%.js}.ts"

if [ "$file" = "$newFile" ]; then
    echo "File is already TypeScript: $file"
    exit 0
fi

echo "Renaming: $file -> $newFile"
git mv "$file" "$newFile"

echo "Done! Don't forget to update imports in other files."
```

使用方法：

```bash
# Windows
.\scripts\rename-to-ts.ps1 apps/web/src/api/auth.js

# Linux/Mac
chmod +x scripts/rename-to-ts.sh
./scripts/rename-to-ts.sh apps/web/src/api/auth.js
```

### 3. 查找导入引用脚本

创建 `scripts/find-imports.ps1`：

```powershell
# 用法: .\scripts\find-imports.ps1 api/auth
param([string]$module)

if (-not $module) {
    Write-Host "Usage: .\scripts\find-imports.ps1 <module-name>"
    exit 1
}

Write-Host "Searching for imports of '$module'..."
Get-ChildItem -Path "apps/web/src" -Recurse -Include *.js,*.jsx,*.ts,*.tsx |
    Select-String -Pattern "from ['\`"].*$module" |
    ForEach-Object { "$($_.Filename):$($_.LineNumber): $($_.Line.Trim())" }
```

使用方法：

```bash
# 查找所有导入 api/auth 的文件
.\scripts\find-imports.ps1 api/auth
```

---

## ✅ 验证环境

运行以下命令验证环境配置正确：

```bash
# 1. 检查依赖安装
pnpm install

# 2. 检查 TypeScript 编译
cd apps/web
pnpm typecheck

# 3. 检查 ESLint
pnpm lint

# 4. 启动开发服务器
pnpm dev
```

如果所有命令都能正常运行（即使有类型错误），说明环境配置成功。

---

## 🆘 常见问题

### Q1: `pnpm install` 失败

**可能原因**: Node.js 版本过低

**解决方案**:

```bash
# 检查 Node.js 版本
node --version

# 如果低于 18.0.0，升级 Node.js
# Windows: 下载安装包 https://nodejs.org/
# Mac: brew install node
# Linux: nvm install 18
```

### Q2: TypeScript 找不到模块

**可能原因**: 路径别名配置问题

**解决方案**:

1. 检查 `tsconfig.json` 中的 `paths` 配置
2. 重启 VS Code
3. 运行 `pnpm install` 重新安装依赖

### Q3: ESLint 不工作

**可能原因**: VS Code 扩展未安装或配置错误

**解决方案**:

1. 安装 ESLint 扩展
2. 重启 VS Code
3. 检查 `.vscode/settings.json` 配置

### Q4: 类型检查太慢

**可能原因**: 项目太大，检查所有文件耗时

**解决方案**:

1. 使用 `--incremental` 模式
2. 在 `tsconfig.json` 中添加：
   ```json
   {
     "compilerOptions": {
       "incremental": true,
       "tsBuildInfoFile": ".tsbuildinfo"
     }
   }
   ```

---

## 下一步

环境准备完成后，开始 [Phase 1: 基础设施与类型定义](04-phase1-infrastructure.md)。
