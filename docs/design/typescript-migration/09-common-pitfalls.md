# 9. 常见陷阱与解决方案

> 这里列出了 TypeScript 迁移过程中最常见的问题和解决方案。

## 🎯 类型相关

### 陷阱 1: 事件处理器类型错误

#### 问题

```typescript
// ❌ 错误 - 类型太宽泛
const handleClick = (e: Event) => {
  e.preventDefault(); // 可能没有 preventDefault
};

// ❌ 错误 - 类型太窄
const handleClick = (e: MouseEvent) => {
  e.preventDefault(); // 这是浏览器的 MouseEvent，不是 React 的
};
```

#### 解决方案

使用 React 的事件类型，并指定元素类型：

```typescript
// ✅ 正确
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();
  e.currentTarget.disabled = true; // 类型安全
};

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value; // 类型安全
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    // ...
  }
};
```

#### 常用事件类型速查

| 事件     | 类型                     | 元素示例                                  |
| -------- | ------------------------ | ----------------------------------------- |
| 点击     | `React.MouseEvent<T>`    | `HTMLButtonElement`, `HTMLDivElement`     |
| 输入变化 | `React.ChangeEvent<T>`   | `HTMLInputElement`, `HTMLTextAreaElement` |
| 表单提交 | `React.FormEvent<T>`     | `HTMLFormElement`                         |
| 键盘     | `React.KeyboardEvent<T>` | `HTMLInputElement`                        |
| 焦点     | `React.FocusEvent<T>`    | `HTMLInputElement`                        |

---

### 陷阱 2: Ref 类型错误

#### 问题

```typescript
// ❌ 错误 - 缺少初始值
const ref = useRef<HTMLDivElement>();

// ❌ 错误 - 类型不匹配
const ref = useRef<HTMLDivElement>(undefined);

// ❌ 错误 - 使用错误的元素类型
const ref = useRef<HTMLElement>(null);
// 后续使用时可能缺少特定方法
```

#### 解决方案

```typescript
// ✅ 正确 - 指定元素类型并初始化为 null
const divRef = useRef<HTMLDivElement>(null);
const inputRef = useRef<HTMLInputElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);

// 使用时检查 null
useEffect(() => {
  if (divRef.current) {
    divRef.current.scrollIntoView();
  }
}, []);

// 或使用可选链
divRef.current?.focus();
```

#### 常用元素类型速查

| 元素         | 类型                  |
| ------------ | --------------------- |
| `<div>`      | `HTMLDivElement`      |
| `<input>`    | `HTMLInputElement`    |
| `<button>`   | `HTMLButtonElement`   |
| `<form>`     | `HTMLFormElement`     |
| `<textarea>` | `HTMLTextAreaElement` |
| `<select>`   | `HTMLSelectElement`   |
| `<a>`        | `HTMLAnchorElement`   |
| `<img>`      | `HTMLImageElement`    |
| `<video>`    | `HTMLVideoElement`    |
| `<audio>`    | `HTMLAudioElement`    |

---

### 陷阱 3: useState 泛型类型

#### 问题

```typescript
// ❌ 错误 - 类型推断不准确
const [user, setUser] = useState(null); // 类型: null
// 后续无法赋值为 User 对象

// ❌ 错误 - 初始值类型不匹配
const [items, setItems] = useState<Item[]>(); // undefined 不是 Item[]
```

#### 解决方案

```typescript
// ✅ 正确 - 使用联合类型
const [user, setUser] = useState<User | null>(null);

// ✅ 正确 - 数组初始化
const [items, setItems] = useState<Item[]>([]);

// ✅ 正确 - 对象初始化
const [form, setForm] = useState<FormData>({
  name: "",
  email: "",
});

// ✅ 正确 - 布尔值（可以省略类型）
const [loading, setLoading] = useState(false); // 推断为 boolean

// ✅ 正确 - 字符串（可以省略类型）
const [text, setText] = useState(""); // 推断为 string
```

---

### 陷阱 4: API 响应类型

#### 问题

```typescript
// ❌ 错误 - 没有指定返回类型
const data = await apiGet("/api/users");
// data 的类型是 unknown

// ❌ 错误 - 使用 any
const data: any = await apiGet("/api/users");
// 失去类型安全
```

#### 解决方案

```typescript
// ✅ 正确 - 使用泛型指定类型
const user = await apiGet<User>("/api/users/1");
const users = await apiGet<User[]>("/api/users");

// ✅ 正确 - 使用类型断言（如果确定类型）
const data = (await apiGet("/api/users")) as User[];

// ✅ 正确 - 定义函数返回类型
async function fetchUser(id: string): Promise<User> {
  return apiGet<User>(`/api/users/${id}`);
}
```

---

### 陷阱 5: Children Props

#### 问题

```typescript
// ❌ 错误 - 使用 any
interface Props {
  children: any;
}

// ❌ 错误 - 类型太窄
interface Props {
  children: JSX.Element; // 只能是单个元素
}

// ❌ 错误 - 类型太窄
interface Props {
  children: string; // 只能是字符串
}
```

#### 解决方案

```typescript
// ✅ 正确 - 使用 ReactNode
import type { ReactNode } from "react";

interface Props {
  children: ReactNode; // 可以是任何可渲染的内容
}

// ✅ 正确 - 可选 children
interface Props {
  children?: ReactNode;
}

// ✅ 正确 - 特定类型的 children
interface Props {
  children: React.ReactElement<ChildProps>; // 必须是特定组件
}
```

---

## 🔧 实践相关

### 陷阱 6: 忘记更新导入路径

#### 问题

```typescript
// 文件已重命名为 .ts，但导入还是 .js
import { apiGet } from "./auth.js"; // ❌ 错误
```

#### 解决方案

```typescript
// ✅ 正确 - TypeScript 导入不需要扩展名
import { apiGet } from "./auth";

// ✅ 正确 - 使用路径别名
import { apiGet } from "@/api/auth";
```

#### 批量查找和替换

```bash
# 查找所有 .js 导入
grep -r "from.*\.js" apps/web/src

# 使用 sed 批量替换（谨慎使用）
find apps/web/src -name "*.ts" -o -name "*.tsx" | xargs sed -i "s/from '\(.*\)\.js'/from '\1'/g"
```

---

### 陷阱 7: 类型定义文件位置错误

#### 问题

```typescript
// ❌ 错误 - 类型定义在 .ts 文件中
// types.ts
export interface User {
  id: string;
  name: string;
}

// 导入时需要运行时代码
import { User } from "./types"; // 会被打包
```

#### 解决方案

```typescript
// ✅ 正确 - 使用 .d.ts 文件
// types.d.ts
export interface User {
  id: string;
  name: string;
}

// 或使用 type-only import
import type { User } from "./types";
```

---

### 陷阱 8: 循环依赖

#### 问题

```typescript
// A.ts
import { B } from "./B";
export class A {
  b: B;
}

// B.ts
import { A } from "./A";
export class B {
  a: A;
}

// Error: Circular dependency
```

#### 解决方案

```typescript
// ✅ 方案 1: 使用 type-only import
// A.ts
import type { B } from "./B";
export class A {
  b: B;
}

// B.ts
import type { A } from "./A";
export class B {
  a: A;
}

// ✅ 方案 2: 提取类型到单独文件
// types.ts
export interface A {
  b: B;
}
export interface B {
  a: A;
}

// A.ts
import type { A, B } from "./types";
export class AImpl implements A {
  b: B;
}
```

---

### 陷阱 9: 第三方库类型缺失

#### 问题

```typescript
// ❌ 错误 - 库没有类型定义
import someLibrary from "some-library";
// Error: Could not find a declaration file for module 'some-library'
```

#### 解决方案

```typescript
// ✅ 方案 1: 安装类型定义包
pnpm add -D @types/some-library

// ✅ 方案 2: 创建类型声明文件
// types/some-library.d.ts
declare module 'some-library' {
  export function someFunction(): void;
  export default someLibrary;
}

// ✅ 方案 3: 临时使用 any（不推荐）
// @ts-ignore
import someLibrary from 'some-library';
```

---

### 陷阱 10: 类型断言滥用

#### 问题

```typescript
// ❌ 错误 - 过度使用 as
const user = data as User;
const items = response as Item[];
const value = input as string;
```

#### 解决方案

```typescript
// ✅ 正确 - 使用类型守卫
function isUser(data: unknown): data is User {
  return (
    typeof data === "object" && data !== null && "id" in data && "name" in data
  );
}

if (isUser(data)) {
  // data 的类型现在是 User
  console.log(data.name);
}

// ✅ 正确 - 使用泛型
const user = await apiGet<User>("/api/users/1");

// ✅ 正确 - 只在确定类型时使用断言
const element = document.getElementById("root") as HTMLDivElement;
```

---

## 🐛 调试技巧

### 技巧 1: 查看推断类型

在 VS Code 中，将鼠标悬停在变量上可以看到推断的类型。

```typescript
const user = { id: "1", name: "John" };
// 悬停在 user 上，看到: const user: { id: string; name: string; }
```

### 技巧 2: 使用 `satisfies` 运算符

```typescript
// 确保对象满足类型，但保留字面量类型
const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
} satisfies Config;

// config.apiUrl 的类型是 'https://api.example.com'（字面量类型）
// 而不是 string
```

### 技巧 3: 使用 `// @ts-expect-error`

```typescript
// 预期会有类型错误（用于测试）
// @ts-expect-error
const result = someFunction("invalid");

// 如果没有错误，TypeScript 会警告
```

### 技巧 4: 临时禁用检查

```typescript
// 临时禁用下一行的类型检查
// @ts-ignore
const result = problematicCode();

// 更好的方式：添加 TODO 注释
// @ts-ignore - TODO: Fix type for problematicCode
const result = problematicCode();
```

---

## 📚 参考资源

### 官方文档

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### 类型查询工具

- [TypeScript Playground](https://www.typescriptlang.org/play) - 在线测试 TypeScript
- [TS AST Viewer](https://ts-ast-viewer.com/) - 查看 TypeScript AST

### VS Code 扩展

- **Error Lens** - 在代码行内显示错误
- **Pretty TypeScript Errors** - 美化错误信息
- **TypeScript Importer** - 自动导入类型

---

## 🆘 遇到问题怎么办？

### 1. 查看错误信息

TypeScript 的错误信息通常很详细，仔细阅读可以找到问题所在。

### 2. 查阅本文档

大部分常见问题都在这里有解决方案。

### 3. 搜索错误信息

将错误信息复制到 Google 搜索，通常能找到解决方案。

### 4. 查看类型定义

在 VS Code 中，按住 Ctrl（Mac: Cmd）点击类型名称，可以跳转到类型定义。

### 5. 简化问题

将问题简化到最小可复现示例，更容易找到原因。

### 6. 寻求帮助

如果实在无法解决，可以：

- 查看 TypeScript 官方文档
- 在 Stack Overflow 提问
- 联系项目维护者

---

## 下一步

查看 [实战示例](./10-practical-examples.md) 了解完整的迁移示例。
