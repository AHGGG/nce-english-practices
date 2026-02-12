# 11. FAQ 常见问题

> 迁移过程中的常见疑问和解答。

## 🤔 通用问题

### Q1: 我需要多少 TypeScript 经验才能开始？

**A**: 基础的 TypeScript 知识即可。你需要了解：

- 基本类型（string, number, boolean）
- 接口（interface）
- 类型别名（type）
- 泛型基础

如果你不熟悉，建议先阅读 [TypeScript 官方教程](https://www.typescriptlang.org/docs/handbook/intro.html) 的前几章。

---

### Q2: 迁移会影响现有功能吗？

**A**: 不会。TypeScript 是 JavaScript 的超集，编译后就是普通的 JavaScript。只要类型定义正确，功能不会改变。

**注意**: 迁移后要进行功能测试，确保没有引入 bug。

---

### Q3: 我可以跳过某些文件吗？

**A**: 可以，但不建议。TypeScript 的价值在于整个项目的类型安全。如果跳过某些文件，会导致：

- 类型链断裂
- 失去类型检查的保护
- 后续维护困难

**建议**: 按照文档的顺序逐步迁移，不要跳过。

---

### Q4: 迁移需要多长时间？

**A**: 取决于你的经验和投入时间：

- **有经验的开发者**: 2-3 周（全职）
- **初学者**: 3-4 周（全职）
- **兼职**: 1-2 个月

**建议**: 不要急于求成，保证质量比速度更重要。

---

### Q5: 我应该一次迁移多个文件吗？

**A**: 不建议。每次只迁移一个文件，原因：

- 容易定位问题
- 便于代码审查
- 方便回滚
- 降低风险

**例外**: 非常简单的文件（如常量定义）可以批量迁移。

---

## 🔧 技术问题

### Q6: 为什么我的类型检查这么慢？

**A**: 可能的原因和解决方案：

1. **项目太大** - 使用增量编译

   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "incremental": true,
       "tsBuildInfoFile": ".tsbuildinfo"
     }
   }
   ```

2. **检查了 node_modules** - 确保排除

   ```json
   {
     "exclude": ["node_modules", "dist"]
   }
   ```

3. **VS Code 扩展冲突** - 禁用不必要的扩展

---

### Q7: 如何处理第三方库没有类型定义的情况？

**A**: 三种方案：

**方案 1: 安装类型定义包**（推荐）

```bash
pnpm add -D @types/library-name
```

**方案 2: 创建类型声明文件**

```typescript
// types/library-name.d.ts
declare module "library-name" {
  export function someFunction(): void;
}
```

**方案 3: 临时使用 any**（不推荐）

```typescript
// @ts-ignore
import library from "library-name";
```

---

### Q8: 什么时候应该使用 `any`？

**A**: 尽量避免使用 `any`，但以下情况可以考虑：

1. **第三方库没有类型定义**
2. **类型过于复杂，难以定义**
3. **临时解决方案，后续会修复**

**重要**: 使用 `any` 时必须添加注释说明原因。

```typescript
// TODO: Add proper type for this API response
const data: any = await fetchData();
```

---

### Q9: `interface` 和 `type` 有什么区别？

**A**: 主要区别：

| 特性     | interface             | type            |
| -------- | --------------------- | --------------- |
| 扩展     | 可以被扩展（extends） | 可以被交叉（&） |
| 声明合并 | 支持                  | 不支持          |
| 联合类型 | 不支持                | 支持            |
| 元组     | 不支持                | 支持            |

**建议**:

- 定义对象形状时使用 `interface`
- 定义联合类型、元组时使用 `type`
- 保持项目一致性

```typescript
// ✅ 使用 interface 定义对象
interface User {
  id: string;
  name: string;
}

// ✅ 使用 type 定义联合类型
type Status = "idle" | "loading" | "success" | "error";

// ✅ 使用 type 定义元组
type Point = [number, number];
```

---

### Q10: 如何处理动态属性？

**A**: 使用索引签名：

```typescript
// ✅ 字符串索引
interface Dictionary {
  [key: string]: string;
}

// ✅ 数字索引
interface NumberArray {
  [index: number]: number;
}

// ✅ 结合固定属性
interface Config {
  apiUrl: string;
  timeout: number;
  [key: string]: any; // 其他动态属性
}
```

---

## 📦 项目相关

### Q11: 为什么要先迁移 API 层？

**A**: 因为 API 层是最底层的代码，被其他模块依赖。先迁移 API 层可以：

- 建立类型安全的数据流
- 为上层组件提供类型定义
- 减少后续迁移的工作量

---

### Q12: 大文件应该如何处理？

**A**: 对于超过 500 行的文件，建议：

**选项 A: 先迁移，保持结构**

- 优点: 快速完成
- 缺点: 可能遗留技术债

**选项 B: 先重构，再迁移**

- 优点: 代码质量更高
- 缺点: 耗时更长

**选项 C: 边迁移边重构**

- 优点: 平衡质量和速度
- 缺点: 需要更多经验

**建议**: 对于 `NegotiationInterface.jsx` (1487 行) 这样的巨型文件，使用选项 B。

---

### Q13: 如何处理循环依赖？

**A**: 使用 `import type`：

```typescript
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
```

或者提取类型到单独文件：

```typescript
// types.ts
export interface A {
  /* ... */
}
export interface B {
  /* ... */
}

// A.ts
import type { A, B } from "./types";

// B.ts
import type { A, B } from "./types";
```

---

### Q14: 为什么我的导入路径报错？

**A**: 可能的原因：

1. **忘记配置路径别名**

   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

2. **使用了文件扩展名**

   ```typescript
   // ❌ 错误
   import { User } from "./types.ts";

   // ✅ 正确
   import { User } from "./types";
   ```

3. **大小写不匹配**

   ```typescript
   // ❌ 错误（文件名是 User.ts）
   import { User } from "./user";

   // ✅ 正确
   import { User } from "./User";
   ```

---

## 🎨 最佳实践

### Q15: 应该为所有函数添加返回类型吗？

**A**: 不一定。建议：

**简单函数** - 可以省略（类型推断）

```typescript
function add(a: number, b: number) {
  return a + b; // 推断为 number
}
```

**复杂函数** - 建议显式声明

```typescript
async function fetchData(): Promise<ApiResponse<User[]>> {
  // ...
}
```

**公共 API** - 必须显式声明

```typescript
export function publicFunction(): ReturnType {
  // ...
}
```

---

### Q16: 如何组织类型定义？

**A**: 建议的组织方式：

```
src/
├── types/
│   ├── global.d.ts      # 全局类型
│   ├── api.d.ts         # API 类型
│   ├── components.d.ts  # 组件类型
│   ├── utils.ts         # 类型工具
│   └── schema.d.ts      # OpenAPI 生成的类型
├── api/
│   └── auth.ts          # 可以包含局部类型
└── components/
    └── Card.tsx         # 可以包含局部类型
```

**原则**:

- 全局类型放在 `types/` 目录
- 局部类型放在使用它的文件中
- 共享类型提取到 `types/` 目录

---

### Q17: 应该使用 `FC` 类型吗？

**A**: 不推荐。原因：

```typescript
// ❌ 不推荐
const Card: FC<CardProps> = ({ title, children }) => {
  // ...
};

// ✅ 推荐
const Card = ({ title, children }: CardProps) => {
  // ...
};
```

**原因**:

- `FC` 类型会自动添加 `children` 属性
- 可能导致类型不准确
- 社区趋势是不使用 `FC`

---

### Q18: 如何处理可选属性？

**A**: 使用 `?` 标记：

```typescript
interface User {
  id: string;
  name: string;
  email?: string; // 可选
  phone?: string; // 可选
}

// 使用时检查
if (user.email) {
  sendEmail(user.email);
}

// 或使用可选链
const email = user.email?.toLowerCase();
```

---

## 🐛 调试问题

### Q19: 如何调试类型错误？

**A**: 步骤：

1. **查看完整错误信息**

   ```bash
   pnpm typecheck
   ```

2. **使用 VS Code 悬停查看类型**
   - 将鼠标悬停在变量上
   - 查看推断的类型

3. **简化问题**
   - 将复杂类型拆分
   - 逐步添加类型

4. **使用 TypeScript Playground**
   - 在线测试类型
   - 隔离问题

---

### Q20: 类型检查通过但运行时报错？

**A**: 可能的原因：

1. **类型断言错误**

   ```typescript
   // 类型断言不会进行运行时检查
   const user = data as User; // 如果 data 不是 User，运行时会出错
   ```

2. **API 返回数据不匹配**

   ```typescript
   // 后端返回的数据可能与类型定义不一致
   const user = await apiGet<User>("/api/users/1");
   ```

3. **第三方库行为不符合类型定义**

**解决方案**: 添加运行时验证

```typescript
function isUser(data: unknown): data is User {
  return (
    typeof data === "object" && data !== null && "id" in data && "name" in data
  );
}

const data = await fetchData();
if (isUser(data)) {
  // 安全使用
}
```

---

## 📚 学习资源

### Q21: 有哪些学习 TypeScript 的资源？

**A**: 推荐资源：

**官方文档**:

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

**React + TypeScript**:

- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [React 官方 TypeScript 文档](https://react.dev/learn/typescript)

**在线工具**:

- [TypeScript Playground](https://www.typescriptlang.org/play)
- [TS AST Viewer](https://ts-ast-viewer.com/)

**视频教程**:

- [TypeScript Course for Beginners](https://www.youtube.com/watch?v=BwuLxPH8IDs)

---

## 🆘 获取帮助

### Q22: 遇到无法解决的问题怎么办？

**A**: 按以下顺序尝试：

1. **查阅本文档** - 大部分问题都有解答
2. **搜索错误信息** - Google/Stack Overflow
3. **查看 TypeScript 官方文档**
4. **简化问题** - 创建最小可复现示例
5. **提问** - Stack Overflow/GitHub Discussions
6. **联系项目维护者**

**提问技巧**:

- 提供完整的错误信息
- 提供最小可复现示例
- 说明你已经尝试过的解决方案
- 说明你的环境（Node.js 版本、TypeScript 版本等）

---

## 🎉 完成后

### Q23: 迁移完成后应该做什么？

**A**: 建议的后续工作：

1. **全面测试** - 确保所有功能正常
2. **性能测试** - 确保没有性能下降
3. **代码审查** - 让其他人审查你的代码
4. **文档更新** - 更新项目文档
5. **团队分享** - 分享迁移经验

---

### Q24: 如何保持类型定义的更新？

**A**: 建议：

1. **自动生成** - 使用 `openapi-typescript` 自动生成 API 类型

   ```bash
   pnpm gen:types
   ```

2. **定期检查** - 定期运行类型检查

   ```bash
   pnpm typecheck
   ```

3. **CI/CD 集成** - 在 CI/CD 中添加类型检查

   ```yaml
   # .github/workflows/ci.yml
   - name: Type check
     run: pnpm turbo typecheck
   ```

4. **代码审查** - 在 PR 中检查类型定义

---

## 💡 提示

如果你的问题不在这里，可以：

- 查看 [常见陷阱](09-common-pitfalls.md)
- 查看 [实战示例](./10-practical-examples.md)
- 搜索 TypeScript 官方文档
- 在 Stack Overflow 提问

祝你迁移顺利！🎉
