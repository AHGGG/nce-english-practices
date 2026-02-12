# 8. 迁移检查清单

> 每个文件迁移时都应该遵循这个清单，确保质量和一致性。

## 📋 迁移前检查

在开始迁移一个文件之前，确保：

- [ ] **依赖已迁移** - 该文件导入的其他模块已经迁移或有类型定义
- [ ] **了解功能** - 理解该文件的功能和作用
- [ ] **代码质量良好** - 没有明显的 bug 或技术债
- [ ] **有时间完成** - 预留足够时间完成整个迁移流程

### 检查依赖

使用以下命令查找文件的导入：

```bash
# 查看文件导入了哪些模块
grep -E "^import.*from" apps/web/src/api/auth.js

# 查找哪些文件导入了这个模块
grep -r "from.*api/auth" apps/web/src
```

---

## 🔄 迁移步骤

### 步骤 1: 重命名文件

使用 Git 重命名文件（保留历史记录）：

```bash
# .js → .ts
git mv apps/web/src/api/auth.js apps/web/src/api/auth.ts

# .jsx → .tsx
git mv apps/web/src/components/ui/Dialog.jsx apps/web/src/components/ui/Dialog.tsx
```

**为什么用 `git mv`？**

- 保留 Git 历史记录
- 方便代码审查
- 便于回滚

### 步骤 2: 添加类型导入

在文件顶部添加类型导入：

```typescript
// 导入 React 类型
import type { ReactNode, FC } from "react";

// 导入 API 类型
import type { User, PodcastFeed } from "@/types/api";

// 导入组件类型
import type { CardProps } from "@/types/components";
```

**注意**: 使用 `import type` 而不是 `import`，这样类型不会被打包到最终代码中。

### 步骤 3: 为函数参数添加类型

#### 普通函数

```typescript
// ❌ Before
function add(a, b) {
  return a + b;
}

// ✅ After
function add(a: number, b: number): number {
  return a + b;
}
```

#### 箭头函数

```typescript
// ❌ Before
const greet = (name) => {
  return `Hello, ${name}!`;
};

// ✅ After
const greet = (name: string): string => {
  return `Hello, ${name}!`;
};
```

#### 异步函数

```typescript
// ❌ Before
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// ✅ After
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

### 步骤 4: 为函数返回值添加类型

**简单函数** - 可以省略（类型推断）：

```typescript
// 可以省略返回类型（TypeScript 会推断）
function add(a: number, b: number) {
  return a + b; // 推断为 number
}
```

**复杂函数** - 建议显式声明：

```typescript
// 建议显式声明返回类型
async function fetchData(): Promise<ApiResponse<User[]>> {
  // ...
}
```

### 步骤 5: 为 Props 定义 interface

#### 函数组件

```typescript
// ❌ Before
export const Card = ({ title, children, className }) => {
  return (
    <div className={className}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
};

// ✅ After
interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const Card: FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={className}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
};
```

**或者使用解构（推荐）**：

```typescript
export const Card = ({ title, children, className }: CardProps) => {
  return (
    <div className={className}>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
};
```

### 步骤 6: 为 State 添加泛型类型

```typescript
// ❌ Before
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(false);
const [items, setItems] = useState([]);

// ✅ After
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState<boolean>(false);
const [items, setItems] = useState<Item[]>([]);
```

### 步骤 7: 为事件处理器添加类型

```typescript
// ❌ Before
const handleClick = (e) => {
  e.preventDefault();
  // ...
};

const handleChange = (e) => {
  setValue(e.target.value);
};

// ✅ After
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  // ...
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};
```

### 步骤 8: 为 Ref 添加类型

```typescript
// ❌ Before
const inputRef = useRef();
const divRef = useRef(null);

// ✅ After
const inputRef = useRef<HTMLInputElement>(null);
const divRef = useRef<HTMLDivElement>(null);
```

### 步骤 9: 处理 `any` 类型

尽量避免使用 `any`，如果必须使用，添加注释说明原因：

```typescript
// ❌ Bad
const data: any = await fetchData();

// ✅ Good - 使用具体类型
const data: User = await fetchData();

// ⚠️ Acceptable - 临时使用，添加 TODO
// TODO: Add proper type for this API response
const data: any = await fetchData();
```

### 步骤 10: 处理 `null`/`undefined`

使用联合类型明确表示可能为空的值：

```typescript
// ❌ Before
let user = null;

// ✅ After
let user: User | null = null;

// 使用可选链
const name = user?.name;

// 使用空值合并
const displayName = user?.name ?? "Guest";
```

---

## ✅ 迁移后检查

### 1. 类型检查

```bash
cd apps/web
pnpm typecheck
```

**期望结果**: 没有新增类型错误。

### 2. ESLint 检查

```bash
cd apps/web
pnpm lint
```

**期望结果**: 没有新增 ESLint 错误。

### 3. 功能测试

手动测试相关功能，确保：

- [ ] 页面能正常加载
- [ ] 交互功能正常
- [ ] 没有控制台错误
- [ ] 数据能正常显示

### 4. 更新导入引用

查找并更新其他文件中的导入：

```bash
# 查找导入该文件的其他文件
grep -r "from.*api/auth" apps/web/src

# 更新导入路径（如果需要）
# 例如: from './auth.js' → from './auth'
```

**注意**: TypeScript 导入不需要文件扩展名。

### 5. 提交代码

每个文件单独提交，便于回滚：

```bash
git add apps/web/src/api/auth.ts
git commit -m "refactor(web): migrate api/auth.js to TypeScript"
```

**提交信息格式**:

```
refactor(web): migrate <file-path> to TypeScript

- Add type definitions for all functions
- Add Props interface for components
- Add event handler types
- No functional changes
```

---

## 📝 迁移模板

### API 函数模板

```typescript
// apps/web/src/api/example.ts
import { apiGet, apiPost } from "./auth";
import type { User, ApiResponse } from "@/types/api";

/**
 * 获取用户信息
 */
export const getUser = async (id: string): Promise<User> => {
  return apiGet<User>(`/api/users/${id}`);
};

/**
 * 创建用户
 */
export const createUser = async (data: Partial<User>): Promise<User> => {
  return apiPost<User>("/api/users", data);
};
```

### 组件模板

```typescript
// apps/web/src/components/Example.tsx
import type { FC, ReactNode } from 'react';

interface ExampleProps {
  title: string;
  children?: ReactNode;
  onClose?: () => void;
}

export const Example: FC<ExampleProps> = ({ title, children, onClose }) => {
  return (
    <div>
      <h2>{title}</h2>
      {children}
      {onClose && <button onClick={onClose}>Close</button>}
    </div>
  );
};
```

### Hook 模板

```typescript
// apps/web/src/hooks/useExample.ts
import { useState, useEffect } from "react";
import type { User } from "@/types/api";

interface UseExampleReturn {
  data: User | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useExample = (id: string): UseExampleReturn => {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchUser(id);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  return { data, loading, error, refetch: fetchData };
};
```

---

## ⚠️ 常见错误

### 错误 1: 忘记添加类型导入

```typescript
// ❌ 错误
const user: User = { ... }; // Error: Cannot find name 'User'

// ✅ 正确
import type { User } from '@/types/api';
const user: User = { ... };
```

### 错误 2: 使用错误的事件类型

```typescript
// ❌ 错误
const handleClick = (e: Event) => { ... }; // 太宽泛

// ✅ 正确
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
```

### 错误 3: Ref 类型错误

```typescript
// ❌ 错误
const ref = useRef<HTMLDivElement>(); // 缺少初始值

// ✅ 正确
const ref = useRef<HTMLDivElement>(null);
```

### 错误 4: 忘记处理 null

```typescript
// ❌ 错误
const name = user.name; // Error: Object is possibly 'null'

// ✅ 正确
const name = user?.name;
// 或
const name = user ? user.name : "Guest";
```

---

## 🎯 质量标准

一个合格的迁移应该满足：

- ✅ 所有函数参数有类型
- ✅ 复杂函数有返回类型
- ✅ 组件 Props 有 interface
- ✅ State 有泛型类型
- ✅ 事件处理器有正确类型
- ✅ Ref 有正确类型
- ✅ 无 `any` 类型（除非必要且有注释）
- ✅ 无类型错误
- ✅ 无 ESLint 错误
- ✅ 功能正常

---

## 下一步

查看 [常见陷阱与解决方案](09-common-pitfalls.md) 了解更多细节。
