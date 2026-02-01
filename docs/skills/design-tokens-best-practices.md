# Design Tokens 最佳实践与行业标准

## 1. Design Tokens 概述

Design Tokens 是设计系统的原子单元，它们以平台无关的方式存储视觉设计决策（如颜色、字体、间距、阴影等），使得设计值可以在不同平台和技术栈之间保持一致性。Design Tokens 本质上是将设计决策抽象化、标准化和自动化的关键工具，它们桥接了设计师和开发者之间的鸿沟，确保产品视觉和体验的一致性。

Design Tokens 的核心价值体现在三个层面：首先是**一致性**，通过统一的设计值来源，消除不同页面、不同组件之间的视觉差异；其次是**可维护性**，当设计决策需要调整时，只需修改 Token 定义，所有引用该 Token 的地方自动更新；最后是**跨平台能力**，同一套 Token 可以输出为 CSS 变量、JavaScript 对象、iOS 和 Android 原生样式等，真正实现设计资产的复用。

现代设计系统的实践表明，采用结构化的 Token 管理方式可以显著提升团队协作效率。设计师可以在 Figma、Sketch 等设计工具中定义和管理 Tokens，开发者则通过代码消费这些 Tokens，双方基于同一套设计语言工作，减少沟通成本和设计实现的偏差。

## 2. DTCG 标准规范

### 2.1 DTCG 简介与背景

Design Tokens Community Group (DTCG) 是 W3C 旗下的一个社区小组，致力于制定 Design Tokens 的行业标准。该组织由 Salesforce、Adobe、Shopify、Microsoft 等公司的设计系统团队联合发起，目的是建立一套通用的 Token 格式规范，使得不同工具、平台和设计系统之间可以无缝交换和共享 Design Tokens。DTCG 规范的核心目标是解决 Design Tokens 生态系统中的碎片化问题，让设计师和开发者能够使用统一的语言和格式来描述和管理设计值。

DTCG 规范基于早期的「Design Tokens Format Module」草案，经过多轮社区讨论和实践验证，已经成为业界广泛认可的事实标准。该规范定义了 Tokens 的数据结构、命名约定、元数据要求和引用语法，为工具厂商（如 Style Dictionary、Figma Tokens 插件等）提供了实现参考。理解 DTCG 规范对于构建符合行业标准的设计系统至关重要，它不仅影响 Tokens 的设计方式，还决定了 Tokens 如何在不同系统之间流转和转换。

### 2.2 Token 格式规范

DTCG 规范定义了一套严格的 Token 数据结构，每个 Token 都是一个包含特定属性的 JSON 对象。这种结构化的设计使得 Tokens 具有自描述性，便于工具解析和用户理解。Token 的核心属性包括 `$type`、`$value` 和可选的 `$description`，这三个属性构成了 Tokens 的基础骨架。

```json
{
  "color": {
    "primary": {
      "$value": "#0066CC",
      "$type": "color",
      "$description": "主品牌色，用于主要操作按钮和链接"
    },
    "secondary": {
      "$value": "#635CFF",
      "$type": "color",
      "$description": "次要品牌色，用于强调和装饰元素"
    },
    "surface": {
      "$value": "#FFFFFF",
      "$type": "color",
      "$description": "表面背景色，用于卡片和模态框背景"
    }
  },
  "spacing": {
    "small": {
      "$value": "4px",
      "$type": "dimension",
      "$description": "小型间距，用于组件内部元素间距"
    },
    "medium": {
      "$value": "8px",
      "$type": "dimension",
      "$description": "中等间距，用于卡片内边距"
    },
    "large": {
      "$value": "16px",
      "$type": "dimension",
      "$description": "大型间距，用于区块之间间距"
    }
  },
  "typography": {
    "font-size": {
      "body": {
        "$value": "16px",
        "$type": "dimension"
      },
      "heading-1": {
        "$value": "32px",
        "$type": "dimension"
      }
    },
    "font-weight": {
      "regular": {
        "$value": "400",
        "$type": "number"
      },
      "bold": {
        "$value": "700",
        "$type": "number"
      }
    }
  },
  "border-radius": {
    "small": {
      "$value": "4px",
      "$type": "dimension"
    },
    "medium": {
      "$value": "8px",
      "$type": "dimension"
    }
  },
  "opacity": {
    "disabled": {
      "$value": "0.5",
      "$type": "number"
    }
  }
}
```

`$type` 属性是 DTCG 规范中最关键的属性之一，它定义了 Token 值的语义类型。规范定义了一系列标准的类型值，包括 `color`（颜色值，如十六进制、RGB、HSL）、`dimension`（尺寸值，如像素、rem）、`number`（纯数字，如透明度、权重）、`fontFamily`（字体族名称）、`fontWeight`（字重数值）、`duration`（时间值，如动画时长）、`cubicBezier`（贝塞尔曲线函数）等。使用正确的类型值对于确保 Tokens 在不同平台和工具之间正确转换至关重要，例如 `color` 类型的 Token 可以被转换为 CSS 变量、iOS UIColor 或 Android Color，而 `dimension` 类型则对应 CSS 的 `px`/`rem`、iOS 的 `CGFloat` 或 Android 的 `dp`。

`$description` 是一个可选但Highly Recommended的属性，它提供了 Token 的语义说明和使用指南。良好的描述可以帮助团队成员理解每个 Token 的设计意图、适用场景和注意事项。在大型设计系统中，清晰的描述还可以作为设计决策文档的一部分，帮助新成员快速理解设计系统的演进历史。

### 2.3 Token 命名规范

Token 命名是设计系统可维护性的关键因素之一，良好的命名规范可以显著提升 Tokens 的可发现性、可读性和一致性。DTCG 规范推荐使用**语义化命名**（Semantic Naming）而非**描述性命名**（Descriptive Naming），即 Token 名称应该表达「是什么」而不是「看起来是什么样」。例如，`color.background.primary` 比 `color.blue-500` 更好，因为它表达的是功能角色而非具体的颜色值。

命名结构应该遵循**从通用到具体**的层级顺序，从大类到小类逐层细分。推荐的层级结构是：`[类别].[子类别].[属性].[状态]`，其中类别表示 Tokens 所属的设计维度（如 color、typography、spacing），子类别表示更细分的用途（如 brand、neutral、surface），属性描述具体的视觉属性（如 background、text、border），状态表示交互状态（如 hover、active、disabled）。这种层级结构使得 Tokens 组织清晰，便于查找和使用。

```json
{
  "color": {
    "brand": {
      "primary": { "$value": "#0066CC", "$type": "color" },
      "secondary": { "$value": "#635CFF", "$type": "color" }
    },
    "neutral": {
      "100": { "$value": "#F5F5F5", "$type": "color" },
      "200": { "$value": "#E5E5E5", "$type": "color" },
      "300": { "$value": "#D4D4D4", "$type": "color" },
      "400": { "$value": "#A3A3A3", "$type": "color" },
      "500": { "$value": "#737373", "$type": "color" },
      "600": { "$value": "#525252", "$type": "color" },
      "700": { "$value": "#404040", "$type": "color" },
      "800": { "$value": "#262626", "$type": "color" },
      "900": { "$value": "#171717", "$type": "color" }
    },
    "semantic": {
      "success": { "$value": "#22C55E", "$type": "color" },
      "warning": { "$value": "#F59E0B", "$type": "color" },
      "error": { "$value": "#EF4444", "$type": "color" },
      "info": { "$value": "#3B82F6", "$type": "color" }
    },
    "surface": {
      "background": { "$value": "#FFFFFF", "$type": "color" },
      "elevated": { "$value": "#FFFFFF", "$type": "color" },
      "overlay": { "$value": "#000000", "$type": "color" }
    },
    "text": {
      "primary": { "$value": "#171717", "$type": "color" },
      "secondary": { "$value": "#525252", "$type": "color" },
      "disabled": { "$value": "#A3A3A3", "$type": "color" },
      "inverse": { "$value": "#FFFFFF", "$type": "color" }
    }
  },
  "typography": {
    "font-family": {
      "heading": { "$value": "'Inter', sans-serif", "$type": "fontFamily" },
      "body": { "$value": "'Inter', sans-serif", "$type": "fontFamily" },
      "mono": { "$value": "'JetBrains Mono', monospace", "$type": "fontFamily" }
    },
    "font-size": {
      "xs": { "$value": "12px", "$type": "dimension" },
      "sm": { "$value": "14px", "$type": "dimension" },
      "base": { "$value": "16px", "$type": "dimension" },
      "lg": { "$value": "18px", "$type": "dimension" },
      "xl": { "$value": "20px", "$type": "dimension" },
      "2xl": { "$value": "24px", "$type": "dimension" },
      "3xl": { "$value": "30px", "$type": "dimension" },
      "4xl": { "$value": "36px", "$type": "dimension" }
    },
    "font-weight": {
      "regular": { "$value": "400", "$type": "number" },
      "medium": { "$value": "500", "$type": "number" },
      "semibold": { "$value": "600", "$type": "number" },
      "bold": { "$value": "700", "$type": "number" }
    },
    "line-height": {
      "tight": { "$value": "1.25", "$type": "number" },
      "normal": { "$value": "1.5", "$type": "number" },
      "relaxed": { "$value": "1.75", "$type": "number" }
    }
  },
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
    "12": { "$value": "48px", "$type": "dimension" }
  },
  "border-radius": {
    "none": { "$value": "0px", "$type": "dimension" },
    "sm": { "$value": "4px", "$type": "dimension" },
    "md": { "$value": "8px", "$type": "dimension" },
    "lg": { "$value": "12px", "$type": "dimension" },
    "xl": { "$value": "16px", "$type": "dimension" },
    "full": { "$value": "9999px", "$type": "dimension" }
  },
  "shadow": {
    "sm": {
      "$value": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      "$type": "shadow"
    },
    "md": {
      "$value": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      "$type": "shadow"
    },
    "lg": {
      "$value": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      "$type": "shadow"
    }
  },
  "transition": {
    "duration": {
      "fast": { "$value": "150ms", "$type": "duration" },
      "normal": { "$value": "300ms", "$type": "duration" },
      "slow": { "$value": "500ms", "$type": "duration" }
    },
    "timing": {
      "ease": { "$value": "ease", "$type": "cubicBezier" },
      "ease-in": { "$value": "ease-in", "$type": "cubicBezier" },
      "ease-out": { "$value": "ease-out", "$type": "cubicBezier" },
      "ease-in-out": { "$value": "ease-in-out", "$type": "cubicBezier" }
    }
  }
}
```

命名时应避免使用缩写，保持名称的清晰和直观。例如，使用 `font-weight-bold` 而不是 `fw-bold`，使用 `text-color-primary` 而不是 `text-primary`。同时，名称应该全部使用小写字母和连字符（kebab-case），这是 CSS 社区的惯例，也是 DTCG 规范推荐的命名风格。

在大型设计系统中，建议为命名约定制定详细的文档，包括每个层级的含义、可用值列表、命名禁忌（如避免使用品牌名称、特定颜色名称等）。这有助于保持 Tokens 的长期一致性，并帮助新团队成员快速上手。

### 2.4 Token 引用与别名语法

Token 引用是 Design Tokens 系统的核心特性之一，它允许 Tokens 之间相互引用，实现设计值的复用和层级管理。通过引用，当底层 Token 的值发生变化时，所有引用它的上层 Token 会自动更新，无需手动修改多处定义。这种机制大大提升了设计系统的可维护性和一致性。

DTCG 规范使用 `{ "引用": Token路径 }` 的语法来表示引用关系。引用的值应该是一个指向其他 Token 的路径字符串，路径使用点号分隔层级。例如，`{ "{color.brand.primary}"}` 引用了 `color.brand.primary` 这个 Token。引用的语法遵循特定的模式：被引用的 Token 路径需要用大括号包裹，开头的 `{` 和结尾的 `}` 是必须的。

```json
{
  "color": {
    "primitive": {
      "blue": {
        "50": { "$value": "#EFF6FF", "$type": "color" },
        "100": { "$value": "#DBEAFE", "$type": "color" },
        "200": { "$value": "#BFDBFE", "$type": "color" },
        "300": { "$value": "#93C5FD", "$type": "color" },
        "400": { "$value": "#60A5FA", "$type": "color" },
        "500": { "$value": "#3B82F6", "$type": "color" },
        "600": { "$value": "#2563EB", "$type": "color" },
        "700": { "$value": "#1D4ED8", "$type": "color" },
        "800": { "$value": "#1E40AF", "$type": "color" },
        "900": { "$value": "#1E3A8A", "$type": "color" }
      },
      "gray": {
        "50": { "$value": "#F9FAFB", "$type": "color" },
        "100": { "$value": "#F3F4F6", "$type": "color" },
        "200": { "$value": "#E5E7EB", "$type": "color" },
        "300": { "$value": "#D1D5DB", "$type": "color" },
        "400": { "$value": "#9CA3AF", "$type": "color" },
        "500": { "$value": "#6B7280", "$type": "color" },
        "600": { "$value": "#4B5563", "$type": "color" },
        "700": { "$value": "#374151", "$type": "color" },
        "800": { "$value": "#1F2937", "$type": "color" },
        "900": { "$value": "#111827", "$type": "color" }
      }
    },
    "semantic": {
      "background": {
        "default": { "$value": "{color.primitive.gray.50}", "$type": "color" },
        "muted": { "$value": "{color.primitive.gray.100}", "$type": "color" },
        "elevated": { "$value": "#FFFFFF", "$type": "color" }
      },
      "text": {
        "primary": { "$value": "{color.primitive.gray.900}", "$type": "color" },
        "secondary": {
          "$value": "{color.primitive.gray.600}",
          "$type": "color"
        },
        "muted": { "$value": "{color.primitive.gray.400}", "$type": "color" },
        "inverse": { "$value": "#FFFFFF", "$type": "color" }
      },
      "interactive": {
        "primary": { "$value": "{color.primitive.blue.600}", "$type": "color" },
        "primary-hover": {
          "$value": "{color.primitive.blue.700}",
          "$type": "color"
        },
        "primary-active": {
          "$value": "{color.primitive.blue.800}",
          "$type": "color"
        },
        "secondary": {
          "$value": "{color.primitive.gray.100}",
          "$type": "color"
        },
        "secondary-hover": {
          "$value": "{color.primitive.gray.200}",
          "$type": "color"
        }
      },
      "border": {
        "default": { "$value": "{color.primitive.gray.200}", "$type": "color" },
        "strong": { "$value": "{color.primitive.gray.300}", "$type": "color" }
      },
      "status": {
        "success": { "$value": "#22C55E", "$type": "color" },
        "warning": { "$value": "#F59E0B", "$type": "color" },
        "error": { "$value": "#EF4444", "$type": "color" },
        "info": { "$value": "#3B82F6", "$type": "color" }
      }
    },
    "component": {
      "button": {
        "primary": {
          "background": {
            "$value": "{color.semantic.interactive.primary}",
            "$type": "color"
          },
          "background-hover": {
            "$value": "{color.semantic.interactive.primary-hover}",
            "$type": "color"
          },
          "background-active": {
            "$value": "{color.semantic.interactive.primary-active}",
            "$type": "color"
          },
          "text": { "$value": "#FFFFFF", "$type": "color" },
          "border": { "$value": "transparent", "$type": "color" }
        },
        "secondary": {
          "background": {
            "$value": "{color.semantic.interactive.secondary}",
            "$type": "color"
          },
          "background-hover": {
            "$value": "{color.semantic.interactive.secondary-hover}",
            "$type": "color"
          },
          "text": { "$value": "{color.text.primary}", "$type": "color" },
          "border": { "$value": "{color.border.default}", "$type": "color" }
        }
      },
      "input": {
        "background": { "$value": "#FFFFFF", "$type": "color" },
        "background-disabled": {
          "$value": "{color.primitive.gray.100}",
          "$type": "color"
        },
        "text": { "$value": "{color.text.primary}", "$type": "color" },
        "text-disabled": { "$value": "{color.text.muted}", "$type": "color" },
        "border": { "$value": "{color.border.default}", "$type": "color" },
        "border-focus": {
          "$value": "{color.semantic.interactive.primary}",
          "$type": "color"
        },
        "placeholder": { "$value": "{color.text.muted}", "$type": "color" }
      }
    }
  }
}
```

引用机制的一个重要优势是**值的集中管理**。在上例中，所有需要使用蓝色 600 的地方都引用了 `{color.primitive.blue.600}`，当设计团队决定将品牌主色调从蓝色调整为紫色时，只需修改 `color.primitive.blue.600` 的值，整个系统中所有使用该 Token 的地方都会自动更新。这种机制也适用于组件级别的 Tokens，通过引用语义层 Tokens，组件获得了主题适应能力。

在定义引用时需要注意避免循环引用，例如 A 引用 B，B 引用 A，这会导致工具在解析时进入无限循环。此外，引用的层级深度应该适中，过深的引用链会增加维护难度和解析复杂度。建议引用链的深度不超过 3-4 层，并且每个 Token 的引用数量也应该控制在合理范围内。

### 2.5 Group 与嵌套结构

良好的 Token 组织和嵌套结构是设计系统可维护性的关键。DTCG 规范虽然不强制特定的组织方式，但推荐使用层级化的 JSON 结构来组织 Tokens，这种结构天然支持分类和子分类，便于管理和查找。Token 结构的设计应该反映设计系统的逻辑组织，使得 Tokens 的命名空间清晰、层级合理。

Token 组的组织应该遵循以下原则：**首先是高内聚**，将相关的 Tokens 放在同一个组内，如所有颜色相关的 Tokens 在 `color` 组下，所有排版相关的 Tokens 在 `typography` 组下；**其次是低耦合**，不同组之间的依赖应该尽量减少，通过语义层作为中间层来解耦；**最后是可扩展**，结构应该能够方便地添加新的 Tokens 或新的类别，而不需要大规模重构现有结构。

```json
{
  "color": {
    "$description": "颜色 Tokens，包含原色、语义色和组件色",
    "primitive": {
      "$description": "基础颜色值，不直接使用，通过语义色引用",
      "blue": {},
      "green": {},
      "red": {},
      "yellow": {},
      "gray": {},
      "purple": {}
    },
    "semantic": {
      "$description": "语义化颜色，基于 primitive 组合，表达功能含义",
      "background": {},
      "text": {},
      "border": {},
      "interactive": {},
      "status": {}
    },
    "component": {
      "$description": "组件特定颜色，基于 semantic 组合，组件直接使用",
      "button": {},
      "input": {},
      "card": {},
      "modal": {},
      "tooltip": {},
      "navigation": {}
    },
    "theme": {
      "$description": "主题变体，支持亮色/暗色主题切换",
      "light": {},
      "dark": {}
    }
  },
  "typography": {
    "$description": "排版 Tokens",
    "font-family": {},
    "font-size": {},
    "font-weight": {},
    "line-height": {},
    "letter-spacing": {},
    "paragraph-spacing": {}
  },
  "spacing": {
    "$description": "间距 Tokens",
    "scale": {},
    "layout": {}
  },
  "sizing": {
    "$description": "尺寸 Tokens",
    "icon": {},
    "avatar": {},
    "container": {}
  },
  "border": {
    "$description": "边框 Tokens",
    "width": {},
    "style": {},
    "radius": {}
  },
  "shadow": {
    "$description": "阴影 Tokens",
    "elevation": {},
    "focus": {}
  },
  "animation": {
    "$description": "动画和过渡 Tokens",
    "duration": {},
    "timing": {},
    "keyframe": {}
  },
  "z-index": {
    "$description": "层级 Tokens",
    "base": {},
    "dropdown": {},
    "modal": {},
    "tooltip": {},
    "toast": {}
  }
}
```

在 JSON 结构中，除了叶子节点的 Tokens 外，中间的组对象也可以添加元数据（如 `$description`、`$type` 等），这些元数据为 Tokens 提供了文档化的说明。Style Dictionary 和其他工具通常会识别这些元数据，并在生成的输出中保留或转换它们。

对于大型设计系统，建议将 Tokens 拆分到多个文件中，然后通过入口文件组合。这种方式类似于编程语言中的模块系统，每个文件负责一部分相关的 Tokens，便于团队协作和版本管理。常见的拆分策略包括：按类别拆分（color.json、typography.json、spacing.json 等）、按主题拆分（light.json、dark.json、high-contrast.json 等）、按使用场景拆分（core.json、semantic.json、component.json 等）。

## 3. Style Dictionary 使用指南

### 3.1 Style Dictionary 简介

Style Dictionary 是由 Amazon 开发的开源工具，它提供了一套完整的 Design Tokens 工作流，包括 Tokens 定义、转换、格式化输出等核心功能。Style Dictionary 的设计理念是「一次定义，多平台输出」，开发者只需在统一的 JSON 文件中定义 Tokens，工具会自动将它们转换为各种平台所需的格式，包括 CSS 变量、JavaScript 对象、iOS 的 Swift 代码、Android 的 XML 资源、React Native 的 StyleSheet 等。

Style Dictionary 的架构基于 **Transform** 和 **Format** 两个核心概念。Transform 负责将 Token 的原始值转换为特定平台的格式，例如将颜色值从十六进制转换为 RGBA，或将字体名称转换为平台特定的格式。Format 负责将转换后的 Tokens 组织成特定平台所需的输出格式，如 CSS 文件、JS 模块、Swift 类等。这种架构使得 Style Dictionary 具有高度的灵活性，开发者可以自定义 Transform 和 Format 来支持特殊的输出需求。

Style Dictionary 已经被众多知名公司采用，包括 Amazon、Shopify、Microsoft 等，其稳定性和可靠性得到了广泛验证。作为 Design Tokens 生态系统中最成熟的工具之一，Style Dictionary 不仅提供了开箱即用的功能，还拥有丰富的扩展生态，开发者可以编写自定义的 Transform 和 Format 来满足特定需求。

### 3.2 配置方法与项目结构

Style Dictionary 的配置通过一个 JSON 配置文件完成，通常命名为 `config.json` 或 `style-dictionary.config.js`。配置文件定义了 Tokens 的来源目录、输出的目标目录、使用的 Transforms 和 Formats、以及各种自定义选项。一个典型的项目结构应该包含 Tokens 源文件、配置文件和输出目录三个核心部分。

```
style-dictionary/
├── config.json                    # 配置文件
├── tokens/
│   ├── core/                      # 核心 Tokens（Primitive Tokens）
│   │   ├── color.json
│   │   ├── typography.json
│   │   ├── spacing.json
│   │   └── ...
│   ├── semantic/                  # 语义化 Tokens
│   │   ├── color.json
│   │   ├── typography.json
│   │   └── ...
│   └── component/                 # 组件 Tokens
│       ├── button.json
│       ├── input.json
│       └── ...
├── build/                         # 构建输出目录
│   ├── css/
│   │   └── variables.css
│   ├── js/
│   │   └── tokens.js
│   ├── ios/
│   │   └── StyleDictionaryColors.swift
│   └── android/
│       └── colors.xml
└── README.md
```

以下是一个完整的 `config.json` 配置示例，展示了 Style Dictionary 的常用配置选项：

```json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "build/css/",
      "files": [
        {
          "destination": "_variables.css",
          "format": "css/variables"
        }
      ]
    },
    "scss": {
      "transformGroup": "scss",
      "buildPath": "build/scss/",
      "files": [
        {
          "destination": "_variables.scss",
          "format": "scss/map-flat"
        }
      ]
    },
    "js": {
      "transformGroup": "js",
      "buildPath": "build/js/",
      "files": [
        {
          "destination": "tokens.js",
          "format": "javascript/module"
        },
        {
          "destination": "tokens.es5.js",
          "format": "javascript/commonJS"
        }
      ]
    },
    "react-native": {
      "transformGroup": "react-native",
      "buildPath": "build/react-native/",
      "files": [
        {
          "destination": "tokens.ts",
          "format": "javascript/module"
        }
      ]
    },
    "ios": {
      "transformGroup": "ios",
      "buildPath": "build/ios/",
      "files": [
        {
          "destination": "StyleDictionaryColors.swift",
          "format": "ios/swift/class.swift"
        },
        {
          "destination": "StyleDictionarySize.h",
          "format": "ios/static.h"
        }
      ]
    },
    "android": {
      "transformGroup": "android",
      "buildPath": "build/android/",
      "files": [
        {
          "destination": "colors.xml",
          "format": "android/resources"
        },
        {
          "destination": "dimens.xml",
          "format": "android/dimens"
        }
      ]
    }
  }
}
```

配置文件的 `source` 数组定义了 Tokens 源文件的位置，支持 glob 模式匹配。`platforms` 对象定义了各个目标平台的配置，每个平台配置包含 `transformGroup`（转换组，预定义的转换组合）、`buildPath`（输出目录）和 `files`（输出文件列表）三个核心属性。

### 3.3 Transform 系统详解

Transform 是 Style Dictionary 的核心机制之一，它负责将 Token 的原始值转换为特定平台所需的格式。Style Dictionary 内置了丰富的 Transforms，涵盖了颜色、尺寸、字体、边框等常见类型。每个 Transform 都有特定的用途和适用场景，理解这些 Transform 的工作原理对于有效使用 Style Dictionary 至关重要。

Transform 的配置可以在两个层面进行：**Transform Group** 级别和 **Transform** 级别。Transform Group 是预定义的 Transform 组合，针对特定平台优化，例如 `css` Transform Group 包含适用于 CSS 输出的所有 Transforms。Transform Group 适合快速配置，但对于特殊需求，可以直接指定具体的 Transform 来实现精细控制。

```json
{
  "platforms": {
    "css": {
      "transforms": [
        "attribute/cti", // 添加 customAttributes JSON-LD 属性
        "name/cti/kebab", // 将 Token 名称转换为 kebab-case
        "color/hex", // 将颜色转换为十六进制格式
        "dimension/rem", // 将尺寸转换为 rem 单位
        "typography/css", // 格式化排版值为 CSS 格式
        "shadow/css" // 格式化阴影值为 CSS 格式
      ]
    },
    "custom": {
      "transforms": [
        "attribute/cti",
        "name/cti/pascal", // PascalCase 命名
        "color/hexadecimal", // 强制十六进制格式
        "value/custom" // 自定义 Transform
      ]
    }
  }
}
```

以下是 Style Dictionary 内置的主要 Transform 分类及其说明：

**颜色转换 Transforms**：

- `color/hex`：将颜色值转换为十六进制格式（如 `#FF5733`）
- `color/hexrgba`：转换为十六进制加 alpha 通道的格式（如 `#FF5733CC`）
- `color/rgb`：转换为 RGB 格式（如 `rgb(255, 87, 51)`）
- `color/rgba`：转换为 RGBA 格式（如 `rgba(255, 87, 51, 0.8)`）
- `color/hsl`：转换为 HSL 格式（如 `hsl(14, 100%, 60%)`）
- `color/hsla`：转换为 HSLA 格式

**尺寸转换 Transforms**：

- `dimension/rem`：将像素值转换为 rem 单位
- `dimension/remToPx`：将 rem 值转换为像素值
- `dimension/base`：基于基准字体大小转换

**命名转换 Transforms**：

- `name/cti/kebab`：Category-Type-Item 格式的 kebab-case 命名
- `name/cti/camel`：Category-Type-Item 格式的 camelCase 命名
- `name/cti/pascal`：Category-Type-Item 格式的 PascalCase 命名
- `name/cti/snake`：Category-Type-Item 格式的 snake_case 命名

**属性 Transforms**：

- `attribute/cti`：添加包含 cti（Category-Type-Item）信息的 JSON-LD 属性

### 3.4 Format 系统详解

Format 负责将转换后的 Tokens 组织成特定平台所需的输出格式。Style Dictionary 提供了多种内置 Format，覆盖了主流平台的常见需求。同时，开发者可以编写自定义 Format 来满足特殊需求。Format 的配置通常在 `files` 数组中的每个文件配置里指定。

```json
{
  "platforms": {
    "css": {
      "files": [
        {
          "destination": "_variables.css",
          "format": "css/variables",
          "options": {
            "selector": ":root",
            "important": false
          }
        }
      ]
    },
    "scss": {
      "files": [
        {
          "destination": "_variables.scss",
          "format": "scss/map-flat",
          "options": {
            "outputReferences": true
          }
        }
      ]
    },
    "js": {
      "files": [
        {
          "destination": "tokens.js",
          "format": "javascript/module",
          "options": {
            "outputReferences": true
          }
        }
      ]
    }
  }
}
```

以下是 Style Dictionary 常用的 Format 分类及其用途：

**Web 平台 Formats**：

- `css/variables`：生成 CSS 自定义属性（CSS Variables）
- `scss/variables`：生成 SCSS 变量
- `scss/map-flat`：生成 SCSS flat map
- `less/variables`：生成 LESS 变量

**JavaScript 平台 Formats**：

- `javascript/module`：ES6 模块格式
- `javascript/commonJS`：CommonJS 模块格式
- `javascript/object`：普通 JavaScript 对象
- `typescript/module`：TypeScript 模块格式

**iOS 平台 Formats**：

- `ios/swift/class.swift`：Swift 类格式
- `ios/swift/enum.swift`：Swift 枚举格式
- `ios/static.h`：C 头文件格式

**Android 平台 Formats**：

- `android/resources`：Android resources.xml 格式
- `android/colors.xml`：Android colors.xml 格式
- `android/dimens.xml`：Android dimens.xml 格式

### 3.5 多平台输出配置

Style Dictionary 的强大之处在于能够从同一套 Tokens 定义中生成多种平台的输出。以下是针对不同平台的完整配置示例：

**CSS Variables 输出配置**：

```json
{
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "dist/css/",
      "prefix": "nce",
      "files": [
        {
          "destination": "variables.css",
          "format": "css/variables",
          "options": {
            "selector": ":root",
            "important": false,
            "outputReferences": true
          }
        }
      ]
    }
  }
}
```

**React Native 输出配置**：

```json
{
  "platforms": {
    "react-native": {
      "transformGroup": "react-native",
      "buildPath": "dist/rn/",
      "files": [
        {
          "destination": "tokens.ts",
          "format": "typescript/module",
          "options": {
            "outputReferences": true
          }
        }
      ]
    }
  }
}
```

**iOS Swift 输出配置**：

```json
{
  "platforms": {
    "ios": {
      "transformGroup": "ios",
      "buildPath": "dist/ios/StyleDictionary/",
      "files": [
        {
          "destination": "Colors.swift",
          "format": "ios/swift/class.swift",
          "options": {
            "className": "StyleDictionaryColors",
            "objectType": "color"
          }
        },
        {
          "destination": "Size.swift",
          "format": "ios/swift/class.swift",
          "options": {
            "className": "StyleDictionarySize",
            "objectType": "size"
          }
        },
        {
          "destination": "StyleDictionary.h",
          "format": "ios/static.h"
        }
      ]
    }
  }
}
```

**Android XML 输出配置**：

```json
{
  "platforms": {
    "android": {
      "transformGroup": "android",
      "buildPath": "dist/android/res/",
      "files": [
        {
          "destination": "values/colors.xml",
          "format": "android/resources",
          "options": {
            "resourceType": "color"
          }
        },
        {
          "destination": "values/dimens.xml",
          "format": "android/resources",
          "options": {
            "resourceType": "dimen"
          }
        },
        {
          "destination": "values/strings.xml",
          "format": "android/resources",
          "options": {
            "resourceType": "string"
          }
        }
      ]
    }
  }
}
```

### 3.6 自定义 Transform 开发

当内置的 Transforms 无法满足需求时，Style Dictionary 允许开发者编写自定义的 Transform。自定义 Transform 是一个函数，接收 Token 对象和配置选项，返回转换后的值。以下是几个常见的自定义 Transform 示例：

```javascript
// custom-transforms.js
const StyleDictionary = require("style-dictionary");

/**
 * 自定义颜色 Transform：将颜色转换为 iOS 的 UIColor initializer 格式
 */
StyleDictionary.registerTransform({
  name: "color/ios/uicolor",
  type: "value",
  matcher: function (token) {
    return token.type === "color";
  },
  transformer: function (token, options) {
    const value = token.value;
    // 将 #RRGGBBAA 转换为 CGFloat 数组
    const hex = value.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    return `[UIColor colorWithRed:${r.toFixed(3)} green:${g.toFixed(3)} blue:${b.toFixed(3)} alpha:${a.toFixed(3)}]`;
  },
});

/**
 * 自定义尺寸 Transform：基于主题模式转换值
 */
StyleDictionary.registerTransform({
  name: "dimension/theme-aware",
  type: "value",
  matcher: function (token) {
    return (
      token.type === "dimension" && token.attributes && token.attributes.theme
    );
  },
  transformer: function (token, options) {
    const theme = options.theme || "light";
    const value = token.value;
    // 根据主题返回不同的值
    if (token.attributes.theme === "spacing") {
      // 主题相关的间距调整逻辑
      return theme === "dark" ? value : value;
    }
    return value;
  },
});

/**
 * 自定义名称 Transform：添加前缀
 */
StyleDictionary.registerTransform({
  name: "name/prefix",
  type: "name",
  matcher: function (token) {
    return token.type === "color";
  },
  transformer: function (token, options) {
    const prefix = options.prefix || "theme";
    const path = token.path.join("-");
    return `${prefix}-${path}`;
  },
});

module.exports = {
  platforms: {
    custom: {
      transforms: ["attribute/cti", "name/prefix", "color/ios/uicolor"],
    },
  },
};
```

在配置文件中使用自定义 Transform：

```json
{
  "transforms": ["custom/color/ios/uicolor"],
  "source": ["tokens/**/*.json"],
  "platforms": {
    "ios": {
      "transformGroup": "ios",
      "files": [
        {
          "destination": "Colors.swift",
          "format": "ios/swift/class.swift"
        }
      ]
    }
  }
}
```

## 4. 知名设计系统实践分析

### 4.1 Shopify Polaris

Shopify 的 Polaris 设计系统是行业领先的 Design Tokens 实践案例之一，它展示了如何在大型电商平台中系统化地应用 Tokens 来维护品牌一致性和开发效率。Polaris 的 Tokens 设计遵循严格的层级结构，从原色（Primitives）到语义化 Tokens（Semantics），再到组件级 Tokens（Components），形成了清晰的依赖链条。

Polaris 的颜色系统采用了「Design Tokens Format Module」规范，并在此基础上进行了扩展。他们的颜色 Tokens 命名非常语义化，使用功能性的名称而非描述性的颜色名称。例如，Polaris 使用 `surface` 而非 `white` 来命名背景色，使用 `text` 而非 `gray` 来命名文字颜色。这种命名策略使得系统更容易适应主题切换和品牌重塑。

```json
{
  "color": {
    "surface": {
      "foreground": {
        "primary": { "$value": "#192a36", "$type": "color" },
        "secondary": { "$value": "#6d7885", "$type": "color" },
        "disabled": { "$value": "#919eab", "$type": "color" },
        "subdued": { "$value": "#637381", "$type": "color" }
      },
      "background": {
        "primary": { "$value": "#ffffff", "$type": "color" },
        "secondary": { "$value": "#f4f6f8", "$type": "color" },
        "subdued": { "$value": "#d9d9d9", "$type": "color" },
        "disabled": { "$value": "#e0e0e0", "$type": "color" }
      },
      "border": {
        "primary": { "$value": "#dfe3e8", "$type": "color" },
        "secondary": { "$value": "#c4cdd5", "$type": "color" }
      }
    },
    "action": {
      "primary": {
        "default": { "$value": "#008060", "$type": "color" },
        "hover": { "$value": "#006e52", "$type": "color" },
        "active": { "$value": "#005c45", "$type": "color" }
      },
      "secondary": { "$value": "#e4e5e7", "$type": "color" }
    },
    "critical": {
      "surface": { "$value": "#fed7d9", "$type": "color" },
      "text": { "$value": "#d82c0d", "$type": "color" },
      "border": { "$value": "#ffbdad", "$type": "color" }
    },
    "warning": {
      "surface": { "$value": "#ffea8a", "$type": "color" },
      "text": { "$value": "#b98900", "$type": "color" },
      "border": { "$value": "#f4d35e", "$type": "color" }
    },
    "positive": {
      "surface": { "$value": "#bbecc2", "$type": "color" },
      "text": { "$value": "#108043", "$type": "color" },
      "border": { "$value": "#94d7a6", "$type": "color" }
    },
    "highlight": {
      "surface": { "$value": "#e0f5ff", "$type": "color" },
      "text": { "$value": "#006fbf", "$type": "color" }
    }
  }
}
```

Polaris 的另一个亮点是其完善的自动化构建流程。他们使用 Style Dictionary 来管理 Tokens 的转换和发布，每次 Tokens 的变更都会自动触发构建流程，生成各个平台的输出文件。这种自动化的方式确保了设计系统和代码库之间的同步，减少了手动更新的错误。

### 4.2 Material Design

Google 的 Material Design 是最早系统化使用 Design Tokens 的设计系统之一，其设计语言影响了无数产品和设计系统。Material Design 的 Tokens 系统被称为「MD Design Tokens」，它在 DTCG 规范的基础上进行了扩展，增加了更多的元数据和平台特定的信息。

Material Design 的 Tokens 命名采用了非常清晰的三级结构：`[category].[token]`，如 `sys.color.primary`、`sys.typescale.bodyLarge` 等。这种简洁的命名方式使得 Tokens 易于查找和使用。Material 3（Material You）进一步简化了系统，引入了基于「角色」的 Tokens，如 `primary`、`onPrimary`、`primaryContainer` 等，这些 Tokens 自动适应亮色和暗色主题。

```json
{
  "sys": {
    "color": {
      "primary": {
        "$value": "#006A67",
        "$type": "color",
        "$description": "主品牌色，用于关键交互元素"
      },
      "onPrimary": {
        "$value": "#FFFFFF",
        "$type": "color",
        "$description": "主色之上的文字和图标颜色"
      },
      "primaryContainer": {
        "$value": "#6FF7F1",
        "$type": "color",
        "$description": "主色容器背景"
      },
      "onPrimaryContainer": {
        "$value": "#00201F",
        "$type": "color",
        "$description": "主色容器之上的文字颜色"
      },
      "secondary": {
        "$value": "#4A6362",
        "$type": "color",
        "$description": "次要强调色"
      },
      "secondaryContainer": {
        "$value": "#CCE8E6",
        "$type": "color"
      },
      "tertiary": {
        "$value": "#426277",
        "$type": "color"
      },
      "tertiaryContainer": {
        "$value": "#C8E6FF",
        "$type": "color"
      },
      "error": {
        "$value": "#BA1A1A",
        "$type": "color"
      },
      "errorContainer": {
        "$value": "#FFDAD6",
        "$type": "color"
      },
      "background": {
        "$value": "#FAFDFC",
        "$type": "color"
      },
      "surface": {
        "$value": "#FAFDFC",
        "$type": "color"
      },
      "surfaceVariant": {
        "$value": "#DAE5E3",
        "$type": "color"
      },
      "outline": {
        "$value": "#3F4948",
        "$type": "color"
      }
    },
    "typescale": {
      "displayLarge": {
        "$value": "57px",
        "$type": "dimension"
      },
      "displayMedium": {
        "$value": "45px",
        "$type": "dimension"
      },
      "displaySmall": {
        "$value": "36px",
        "$type": "dimension"
      },
      "headlineLarge": {
        "$value": "32px",
        "$type": "dimension"
      },
      "headlineMedium": {
        "$value": "28px",
        "$type": "dimension"
      },
      "headlineSmall": {
        "$value": "24px",
        "$type": "dimension"
      },
      "titleLarge": {
        "$value": "22px",
        "$type": "dimension"
      },
      "titleMedium": {
        "$value": "16px",
        "$type": "dimension"
      },
      "titleSmall": {
        "$value": "14px",
        "$type": "dimension"
      },
      "bodyLarge": {
        "$value": "16px",
        "$type": "dimension"
      },
      "bodyMedium": {
        "$value": "14px",
        "$type": "dimension"
      },
      "bodySmall": {
        "$value": "12px",
        "$type": "dimension"
      },
      "labelLarge": {
        "$value": "14px",
        "$type": "dimension"
      },
      "labelMedium": {
        "$value": "12px",
        "$type": "dimension"
      },
      "labelSmall": {
        "$value": "11px",
        "$type": "dimension"
      }
    },
    "shape": {
      "none": { "$value": "0px", "$type": "dimension" },
      "small": { "$value": "4px", "$type": "dimension" },
      "medium": { "$value": "4px", "$type": "dimension" },
      "large": { "$value": "0px", "$type": "dimension" },
      "full": { "$value": "9999px", "$type": "dimension" }
    },
    "elevation": {
      "level0": { "$value": "none", "$type": "shadow" },
      "level1": {
        "$value": "0px 1px 3px 1px rgba(0,0,0,0.15), 0px 1px 2px 0px rgba(0,0,0,0.3)",
        "$type": "shadow"
      },
      "level2": {
        "$value": "0px 2px 6px 2px rgba(0,0,0,0.15), 0px 1px 2px 0px rgba(0,0,0,0.3)",
        "$type": "shadow"
      },
      "level3": {
        "$value": "0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px 0px rgba(0,0,0,0.3)",
        "$type": "shadow"
      },
      "level4": {
        "$value": "0px 8px 12px 4px rgba(0,0,0,0.15), 0px 4px 4px 0px rgba(0,0,0,0.3)",
        "$type": "shadow"
      },
      "level5": {
        "$value": "0px 12px 16px 5px rgba(0,0,0,0.15), 0px 5px 6px 0px rgba(0,0,0,0.3)",
        "$type": "shadow"
      }
    },
    "motion": {
      "duration": {
        "short1": { "$value": "250ms", "$type": "duration" },
        "short2": { "$value": "200ms", "$type": "duration" },
        "medium1": { "$value": "400ms", "$type": "duration" },
        "medium2": { "$value": "450ms", "$type": "duration" },
        "long1": { "$value": "500ms", "$type": "duration" },
        "long2": { "$value": "600ms", "$type": "duration" }
      },
      "easing": {
        "standard": {
          "accelerate": {
            "$value": "cubic-bezier(0.4, 0, 1, 1)",
            "$type": "cubicBezier"
          },
          "decelerate": {
            "$value": "cubic-bezier(0, 0, 0.2, 1)",
            "$type": "cubicBezier"
          }
        },
        "emphasized": {
          "accelerate": {
            "$value": "cubic-bezier(0.2, 0, 0, 1)",
            "$type": "cubicBezier"
          },
          "decelerate": {
            "$value": "cubic-bezier(0, 0, 0.2, 1)",
            "$type": "cubicBezier"
          }
        }
      }
    }
  }
}
```

Material Design 的 Tokens 系统还包含完善的**状态 Tokens**，用于表示不同的交互状态和场景。例如，`primary` 表示默认状态，`onPrimary` 表示在主色之上的内容颜色，`primaryContainer` 表示主色容器等。这种设计模式使得组件可以根据不同的状态自动切换颜色，而无需开发者手动处理状态逻辑。

### 4.3 Radix UI

Radix UI 是一个专注于无头组件库的设计系统，它采用了一种独特的 Tokens 组织方式，特别强调**复合属性**（Composite Tokens）的使用。Radix UI 的 Tokens 不是简单的键值对，而是可以包含多个子属性的复合结构，这使得组件可以一次性获取所有相关的样式值。

Radix UI 的另一个特点是其**主题系统**的设计。他们将主题定义为 Tokens 的变体，每个主题包含一套完整的颜色、字体、阴影等 Tokens。这种方式使得主题切换变得简单直接，只需切换引用的 Tokens 集合即可。

```json
{
  "colors": {
    "tomato": {
      "1": { "$value": "#fff4f3", "$type": "color" },
      "2": { "$value": "#ffe3dd", "$type": "color" },
      "3": { "$value": "#ffcbc4", "$type": "color" },
      "4": { "$value": "#ffb3a6", "$type": "color" },
      "5": { "$value": "#fd8d7b", "$type": "color" },
      "6": { "$value": "#f66651", "$type": "color" },
      "7": { "$value": "#e74435", "$type": "color" },
      "8": { "$value": "#de3a2a", "$type": "color" },
      "9": { "$value": "#d9261f", "$type": "color" },
      "10": { "$value": "#ba160a", "$type": "color" },
      "11": { "$value": "#a8130a", "$type": "color" },
      "12": { "$value": "#420b07", "$type": "color" }
    },
    "crimson": { "$type": "color", "$value": {} },
    "sky": { "$type": "color", "$value": {} },
    "mint": { "$type": "color", "$value": {} },
    "lime": { "$type": "color", "$value": {} },
    "yellow": { "$type": "color", "$value": {} },
    "amber": { "$type": "color", "$value": {} },
    "orange": { "$type": "color", "$value": {} },
    "gold": { "$type": "color", "$value": {} },
    "bronze": { "$type": "color", "$value": {} },
    "gray": {
      "1": { "$value": "#fcfcfc", "$type": "color" },
      "2": { "$value": "#f8f8f8", "$type": "color" },
      "3": { "$value": "#f3f3f3", "$type": "color" },
      "4": { "$value": "#ededed", "$type": "color" },
      "5": { "$value": "#e6e6e6", "$type": "color" },
      "6": { "$value": "#d4d4d4", "$type": "color" },
      "7": { "$value": "#a3a3a3", "$type": "color" },
      "8": { "$value": "#737373", "$type": "color" },
      "9": { "$value": "#525252", "$type": "color" },
      "10": { "$value": "#404040", "$type": "color" },
      "11": { "$value": "#262626", "$type": "color" },
      "12": { "$value": "#121212", "$type": "color" }
    }
  },
  "spacing": {
    "1": { "$value": "4px", "$type": "dimension" },
    "2": { "$value": "8px", "$type": "dimension" },
    "3": { "$value": "12px", "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" },
    "5": { "$value": "20px", "$type": "dimension" },
    "6": { "$value": "24px", "$type": "dimension" },
    "7": { "$value": "28px", "$type": "dimension" },
    "8": { "$value": "32px", "$type": "dimension" },
    "9": { "$value": "36px", "$type": "dimension" },
    "10": { "$value": "40px", "$type": "dimension" },
    "11": { "$value": "44px", "$type": "dimension" },
    "12": { "$value": "48px", "$type": "dimension" },
    "13": { "$value": "52px", "$type": "dimension" },
    "14": { "$value": "56px", "$type": "dimension" },
    "15": { "$value": "60px", "$type": "dimension" },
    "16": { "$value": "64px", "$type": "dimension" },
    "20": { "$value": "80px", "$type": "dimension" },
    "24": { "$value": "96px", "$type": "dimension" },
    "28": { "$value": "112px", "$type": "dimension" },
    "32": { "$value": "128px", "$type": "dimension" }
  },
  "radii": {
    "1": { "$value": "4px", "$type": "dimension" },
    "2": { "$value": "6px", "$type": "dimension" },
    "3": { "$value": "8px", "$type": "dimension" },
    "4": { "$value": "12px", "$type": "dimension" },
    "5": { "$value": "16px", "$type": "dimension" },
    "6": { "$value": "20px", "$type": "dimension" },
    "7": { "$value": "24px", "$type": "dimension" },
    "8": { "$value": "9999px", "$type": "dimension" },
    "full": { "$value": "9999px", "$type": "dimension" }
  },
  "fontSizes": {
    "1": { "$value": "11px", "$type": "dimension" },
    "2": { "$value": "13px", "$type": "dimension" },
    "3": { "$value": "15px", "$type": "dimension" },
    "4": { "$value": "17px", "$type": "dimension" },
    "5": { "$value": "19px", "$type": "dimension" },
    "6": { "$value": "21px", "$type": "dimension" },
    "7": { "$value": "24px", "$type": "dimension" },
    "8": { "$value": "28px", "$type": "dimension" },
    "9": { "$value": "36px", "$type": "dimension" }
  },
  "fonts": {
    "normal": {
      "$value": "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
      "$type": "fontFamily"
    },
    "mono": {
      "$value": "JetBrains Mono, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
      "$type": "fontFamily"
    }
  },
  "fontWeights": {
    "regular": { "$value": "400", "$type": "number" },
    "medium": { "$value": "500", "$type": "number" },
    "semibold": { "$value": "600", "$type": "number" },
    "bold": { "$value": "700", "$type": "number" }
  },
  "lineHeights": {
    "1": { "$value": "1", "$type": "number" },
    "2": { "$value": "1.1", "$type": "number" },
    "3": { "$value": "1.25", "$type": "number" },
    "4": { "$value": "1.5", "$type": "number" },
    "5": { "$value": "1.75", "$type": "number" },
    "tight": { "$value": "1.1", "$type": "number" }
  },
  "letterSpacings": {
    "tighter": { "$value": "-0.05em", "$type": "dimension" },
    "tight": { "$value": "-0.025em", "$type": "dimension" },
    "normal": { "$value": "0", "$type": "dimension" },
    "wide": { "$value": "0.025em", "$type": "dimension" },
    "wider": { "$value": "0.05em", "$type": "dimension" },
    "widest": { "$value": "0.1em", "$type": "dimension" }
  },
  "sizes": {
    "1": { "$value": "4px", "$type": "dimension" },
    "2": { "$value": "8px", "$type": "dimension" },
    "3": { "$value": "12px", "$type": "dimension" },
    "4": { "$value": "16px", "$type": "dimension" },
    "5": { "$value": "20px", "$type": "dimension" },
    "6": { "$value": "24px", "$type": "dimension" },
    "7": { "$value": "28px", "$type": "dimension" },
    "8": { "$value": "32px", "$type": "dimension" },
    "9": { "$value": "36px", "$type": "dimension" },
    "10": { "$value": "44px", "$type": "dimension" },
    "11": { "$value": "52px", "$type": "dimension" },
    "12": { "$value": "64px", "$type": "dimension" },
    "14": { "$value": "72px", "$type": "dimension" },
    "16": { "$value": "96px", "$type": "dimension" },
    "20": { "$value": "128px", "$type": "dimension" }
  }
}
```

Radix UI 的设计系统还特别关注**对比度**的可访问性要求，他们的颜色设计确保了 WCAG 2.1 AA 级别的对比度标准。这种对可访问性的关注体现了现代设计系统的责任意识。

### 4.4 Tailwind CSS

Tailwind CSS 采用了与前述设计系统不同的方法，它直接内置了 Design Tokens 作为实用类（Utility Classes），用户通过组合这些类来构建界面。Tailwind 的设计系统基于「约束式设计」（Constrained Design）的理念，提供了有限但足够的选项供用户选择，而不是无限的自定义空间。

Tailwind 的配置文件 `tailwind.config.js` 实际上就是一个 Design Tokens 定义文件，它包含了颜色、字体、间距、阴影等所有设计决策的集合。用户可以扩展或覆盖这些 Tokens 来定制自己的设计系统。

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    colors: {
      // 原色（Primitive Tokens）
      gray: {
        50: "#f9fafb",
        100: "#f3f4f6",
        200: "#e5e7eb",
        300: "#d1d5db",
        400: "#9ca3af",
        500: "#6b7280",
        600: "#4b5563",
        700: "#374151",
        800: "#1f2937",
        900: "#111827",
      },
      blue: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6",
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        950: "#172554",
      },
      green: {
        50: "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        300: "#86efac",
        400: "#4ade80",
        500: "#22c55e",
        600: "#16a34a",
        700: "#15803d",
        800: "#166534",
        900: "#14532d",
      },
      red: {
        50: "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#f87171",
        500: "#ef4444",
        600: "#dc2626",
        700: "#b91c1c",
        800: "#991b1b",
        900: "#7f1d1d",
      },
      // 语义色（Semantic Tokens）
      primary: {
        DEFAULT: "#3b82f6",
        hover: "#2563eb",
        active: "#1d4ed8",
      },
      secondary: {
        DEFAULT: "#6b7280",
        hover: "#4b5563",
        active: "#374151",
      },
      success: {
        DEFAULT: "#22c55e",
        light: "#dcfce7",
        dark: "#15803d",
      },
      warning: {
        DEFAULT: "#f59e0b",
        light: "#fef3c7",
        dark: "#b45309",
      },
      error: {
        DEFAULT: "#ef4444",
        light: "#fee2e2",
        dark: "#b91c1c",
      },
    },
    spacing: {
      0: "0px",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      5: "20px",
      6: "24px",
      8: "32px",
      10: "40px",
      12: "48px",
      16: "64px",
      20: "80px",
      24: "96px",
    },
    fontSize: {
      xs: ["12px", { lineHeight: "16px" }],
      sm: ["14px", { lineHeight: "20px" }],
      base: ["16px", { lineHeight: "24px" }],
      lg: ["18px", { lineHeight: "28px" }],
      xl: ["20px", { lineHeight: "28px" }],
      "2xl": ["24px", { lineHeight: "32px" }],
      "3xl": ["30px", { lineHeight: "36px" }],
      "4xl": ["36px", { lineHeight: "40px" }],
      "5xl": ["48px", { lineHeight: "1" }],
    },
    fontFamily: {
      sans: ["Inter", "system-ui", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeight: {
      none: "1",
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
    borderRadius: {
      none: "0",
      sm: "4px",
      DEFAULT: "8px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      "2xl": "24px",
      full: "9999px",
    },
    boxShadow: {
      sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
      xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    },
    extend: {
      colors: {
        // 可以在此添加额外的颜色 Tokens
      },
      spacing: {
        // 可以在此添加额外的间距 Tokens
        18: "72px",
        22: "88px",
      },
    },
  },
  plugins: [],
};
```

Tailwind 的另一个重要特性是**暗色模式支持**。通过配置 `darkMode: 'class'`，开发者可以定义暗色模式下的颜色 Tokens，然后通过添加 `dark:` 前缀的类来应用这些值。这种设计模式体现了 Tokens 的「主题适应能力」。

### 4.5 Chakra UI

Chakra UI 是一个现代化的 React UI 组件库，它采用了基于主题的 Design Tokens 系统。Chakra UI 的设计系统强调**可组合性**和**可定制性**，允许开发者通过主题配置来完全自定义 Tokens。

Chakra UI 的 Tokens 结构采用了「语义优先」的设计理念，将 Tokens 分为 `semanticTokens`（语义 Tokens）和 `tokens`（基础 Tokens）两部分。语义 Tokens 可以引用基础 Tokens，并根据主题模式（亮色/暗色）返回不同的值。

```javascript
// theme.js
import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    // 基础 Tokens（Primitive Tokens）
    brand: {
      50: "#e6f2ff",
      100: "#b3d9ff",
      200: "#80bfff",
      300: "#4da6ff",
      400: "#1a8cff",
      500: "#0073e6",
      600: "#005bb3",
      700: "#004280",
      800: "#002a4d",
      900: "#00111a",
    },
    // 语义 Tokens（Semantic Tokens）
    semantic: {
      success: {
        light: "green.500",
        dark: "green.300",
      },
      warning: {
        light: "yellow.500",
        dark: "yellow.300",
      },
      error: {
        light: "red.500",
        dark: "red.300",
      },
    },
  },
  semanticTokens: {
    colors: {
      "chakra-body-text": {
        _light: "gray.800",
        _dark: "whiteAlpha.900",
      },
      "chakra-body-bg": {
        _light: "white",
        _dark: "gray.800",
      },
      "chakra-border-color": {
        _light: "gray.200",
        _dark: "whiteAlpha.300",
      },
      "chakra-placeholder-color": {
        _light: "gray.500",
        _dark: "whiteAlpha.400",
      },
    },
  },
  spacing: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },
  fontSizes: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
    "5xl": "48px",
    "6xl": "60px",
  },
  fontWeights: {
    hairline: "100",
    thin: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
  lineHeights: {
    normal: "normal",
    none: "1",
    shorter: "1.25",
    short: "1.375",
    base: "1.5",
    tall: "1.625",
    taller: "2",
  },
  radii: {
    none: "0",
    sm: "4px",
    base: "8px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "24px",
    full: "9999px",
  },
  shadows: {
    xs: "0 0 0 1px rgba(0, 0, 0, 0.05)",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    outline: "0 0 0 3px rgba(66, 153, 225, 0.6)",
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "semibold",
        borderRadius: "md",
      },
      sizes: {
        sm: {
          fontSize: "sm",
          px: 4,
          py: 2,
        },
        md: {
          fontSize: "md",
          px: 6,
          py: 3,
        },
        lg: {
          fontSize: "lg",
          px: 8,
          py: 4,
        },
      },
      variants: {
        solid: {
          bg: "blue.500",
          color: "white",
          _hover: {
            bg: "blue.600",
            _disabled: {
              bg: "blue.500",
            },
          },
        },
        outline: {
          borderColor: "gray.200",
          color: "gray.600",
          _hover: {
            bg: "gray.50",
          },
        },
      },
      defaultProps: {
        size: "md",
        variant: "solid",
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderRadius: "md",
            borderColor: "gray.200",
            _focus: {
              borderColor: "blue.500",
              boxShadow: "outline",
            },
          },
        },
        filled: {
          field: {
            bg: "gray.100",
            borderRadius: "md",
            _hover: {
              bg: "gray.200",
            },
            _focus: {
              bg: "white",
              borderColor: "blue.500",
            },
          },
        },
      },
      defaultProps: {
        variant: "outline",
      },
    },
  },
});

export default theme;
```

Chakra UI 的 `semanticTokens` 是其设计系统的一个亮点功能。通过语义 Tokens，组件可以根据当前主题模式自动选择合适的颜色值。例如，`chakra-body-bg` 在亮色模式下返回白色，在暗色模式下返回 `gray.800`。这种设计使得组件开发者无需关心主题切换的逻辑，只需使用语义化的 Token 名称即可。

## 5. Semantic Tokens 与 Primitive Tokens

### 5.1 核心区别与设计理念

Primitive Tokens（基础 Tokens，也称为 Design Tokens 或 Core Tokens）和 Semantic Tokens（语义 Tokens）是 Design Tokens 系统中两个核心概念，它们代表了不同的抽象层次和使用场景。Primitive Tokens 定义了最基础的设计值，如具体的颜色十六进制值、具体的字体大小像素值等，这些值通常直接来自设计稿，不包含任何语义信息。Semantic Tokens 则是在 Primitive Tokens 基础上构建的抽象层，它们表达了设计决策的**意图**和**用途**，而非具体的视觉值。

Primitive Tokens 的设计理念是**保持稳定**。由于这些 Tokens 直接对应具体的视觉设计值，当品牌需要重新设计或调整视觉风格时，Primitive Tokens 通常会发生变化。例如，当公司决定将主色调从蓝色改为紫色时，所有的 `color.blue.500` 等 Primitive Tokens 都需要更新。

Semantic Tokens 的设计理念是**保持语义稳定**。这些 Tokens 表达的是「是什么」而非「看起来是什么样」。例如，`color.background.primary` 表达的是「主要背景色」这个概念，无论品牌主色调如何变化，这个语义都不变。这意味着使用 Semantic Tokens 的组件代码在主题切换或品牌重塑时通常**不需要修改**。

```json
{
  "primitive": {
    "color": {
      "blue": {
        "50": { "$value": "#EFF6FF", "$type": "color" },
        "100": { "$value": "#DBEAFE", "$type": "color" },
        "200": { "$value": "#BFDBFE", "$type": "color" },
        "300": { "$value": "#93C5FD", "$type": "color" },
        "400": { "$value": "#60A5FA", "$type": "color" },
        "500": { "$value": "#3B82F6", "$type": "color" },
        "600": { "$value": "#2563EB", "$type": "color" },
        "700": { "$value": "#1D4ED8", "$type": "color" },
        "800": { "$value": "#1E40AF", "$type": "color" },
        "900": { "$value": "#1E3A8A", "$type": "color" }
      },
      "gray": {
        "50": { "$value": "#F9FAFB", "$type": "color" },
        "100": { "$value": "#F3F4F6", "$type": "color" },
        "200": { "$value": "#E5E7EB", "$type": "color" },
        "300": { "$value": "#D1D5DB", "$type": "color" },
        "400": { "$value": "#9CA3AF", "$type": "color" },
        "500": { "$value": "#6B7280", "$type": "color" },
        "600": { "$value": "#4B5563", "$type": "color" },
        "700": { "$value": "#374151", "$type": "color" },
        "800": { "$value": "#1F2937", "$type": "color" },
        "900": { "$value": "#111827", "$type": "color" }
      },
      "red": {
        "500": { "$value": "#EF4444", "$type": "color" },
        "600": { "$value": "#DC2626", "$type": "color" }
      },
      "green": {
        "500": { "$value": "#22C55E", "$type": "color" },
        "600": { "$value": "#16A34A", "$type": "color" }
      },
      "yellow": {
        "500": { "$value": "#EAB308", "$type": "color" },
        "600": { "$value": "#CA8A04", "$type": "color" }
      }
    },
    "spacing": {
      "1": { "$value": "4px", "$type": "dimension" },
      "2": { "$value": "8px", "$type": "dimension" },
      "3": { "$value": "12px", "$type": "dimension" },
      "4": { "$value": "16px", "$type": "dimension" },
      "5": { "$value": "20px", "$type": "dimension" },
      "6": { "$value": "24px", "$type": "dimension" },
      "8": { "$value": "32px", "$type": "dimension" },
      "10": { "$value": "40px", "$type": "dimension" },
      "12": { "$value": "48px", "$type": "dimension" }
    },
    "font-size": {
      "xs": { "$value": "12px", "$type": "dimension" },
      "sm": { "$value": "14px", "$type": "dimension" },
      "base": { "$value": "16px", "$type": "dimension" },
      "lg": { "$value": "18px", "$type": "dimension" },
      "xl": { "$value": "20px", "$type": "dimension" },
      "2xl": { "$value": "24px", "$type": "dimension" },
      "3xl": { "$value": "30px", "$type": "dimension" },
      "4xl": { "$value": "36px", "$type": "dimension" }
    },
    "radius": {
      "sm": { "$value": "4px", "$type": "dimension" },
      "md": { "$value": "8px", "$type": "dimension" },
      "lg": { "$value": "12px", "$type": "dimension" }
    }
  },
  "semantic": {
    "color": {
      "background": {
        "default": { "$value": "{primitive.color.gray.50}", "$type": "color" },
        "muted": { "$value": "{primitive.color.gray.100}", "$type": "color" },
        "elevated": { "$value": "#FFFFFF", "$type": "color" }
      },
      "text": {
        "primary": { "$value": "{primitive.color.gray.900}", "$type": "color" },
        "secondary": {
          "$value": "{primitive.color.gray.600}",
          "$type": "color"
        },
        "muted": { "$value": "{primitive.color.gray.400}", "$type": "color" },
        "inverse": { "$value": "#FFFFFF", "$type": "color" }
      },
      "interactive": {
        "primary": { "$value": "{primitive.color.blue.600}", "$type": "color" },
        "primary-hover": {
          "$value": "{primitive.color.blue.700}",
          "$type": "color"
        },
        "primary-active": {
          "$value": "{primitive.color.blue.800}",
          "$type": "color"
        }
      },
      "status": {
        "success": {
          "$value": "{primitive.color.green.500}",
          "$type": "color"
        },
        "warning": {
          "$value": "{primitive.color.yellow.500}",
          "$type": "color"
        },
        "error": { "$value": "{primitive.color.red.500}", "$type": "color" }
      },
      "border": {
        "default": { "$value": "{primitive.color.gray.200}", "$type": "color" },
        "strong": { "$value": "{primitive.color.gray.300}", "$type": "color" }
      }
    },
    "spacing": {
      "container": {
        "sm": { "$value": "{primitive.spacing.4}", "$type": "dimension" },
        "md": { "$value": "{primitive.spacing.6}", "$type": "dimension" },
        "lg": { "$value": "{primitive.spacing.8}", "$type": "dimension" }
      },
      "element": {
        "sm": { "$value": "{primitive.spacing.2}", "$type": "dimension" },
        "md": { "$value": "{primitive.spacing.3}", "$type": "dimension" },
        "lg": { "$value": "{primitive.spacing.4}", "$type": "dimension" }
      }
    },
    "typography": {
      "heading": {
        "h1": { "$value": "{primitive.font-size.4xl}", "$type": "dimension" },
        "h2": { "$value": "{primitive.font-size.3xl}", "$type": "dimension" },
        "h3": { "$value": "{primitive.font-size.2xl}", "$type": "dimension" },
        "h4": { "$value": "{primitive.font-size.xl}", "$type": "dimension" }
      },
      "body": {
        "large": { "$value": "{primitive.font-size.lg}", "$type": "dimension" },
        "medium": {
          "$value": "{primitive.font-size.base}",
          "$type": "dimension"
        },
        "small": { "$value": "{primitive.font-size.sm}", "$type": "dimension" }
      }
    },
    "shape": {
      "card": { "$value": "{primitive.radius.md}", "$type": "dimension" },
      "button": { "$value": "{primitive.radius.sm}", "$type": "dimension" },
      "badge": { "$value": "{primitive.radius.full}", "$type": "dimension" }
    }
  }
}
```

### 5.2 使用场景与最佳实践

Primitive Tokens 适用于以下场景：**一是作为其他 Tokens 的构建块**，语义层和组件层 Tokens 引用 Primitive Tokens 来构建更复杂的值；**二是直接定义颜色标尺**，如灰度色阶、品牌色阶等，这些通常是设计系统的底层资产；**三是与第三方库或旧代码交互**，当需要与不遵循语义化命名约定的代码集成时，使用具体的 Primitive 值更清晰。

Semantic Tokens 适用于以下场景：**一是定义组件的直接样式**，组件应该始终使用 Semantic Tokens，这样组件代码可以在品牌变化时保持稳定；**二是定义主题变量**，如亮色/暗色主题的核心差异应该通过语义 Tokens 来定义；**三是定义跨组件的设计模式**，如成功状态、错误状态、警告状态等应该在语义层统一定义。

在组织层级结构时，建议采用三层架构：**Primitive Layer**（基础层）定义原始值，**Semantic Layer**（语义层）定义功能含义，**Component Layer**（组件层）定义具体组件的使用方式。这种分层架构的好处是清晰的关注点分离和易于维护的重构。

```
Primitive Layer (基础层)
├── color/
│   ├── blue/ (50-900)
│   ├── gray/ (50-900)
│   └── ...
├── typography/
│   ├── font-size/
│   └── font-weight/
└── spacing/ (1-12)
    │
    ▼
Semantic Layer (语义层) - 引用 Primitive Layer
├── color/
│   ├── background/ → 引用 color.gray.*
│   ├── text/ → 引用 color.gray.*
│   ├── interactive/ → 引用 color.blue.*
│   └── status/ → 引用 color.*
├── typography/
│   ├── heading/ → 引用 typography.*
│   └── body/ → 引用 typography.*
└── spacing/ → 引用 spacing.*
    │
    ▼
Component Layer (组件层) - 引用 Semantic Layer
├── button/
│   ├── background → 引用 color.interactive.primary
│   ├── text → 引用 color.text.inverse
│   └── padding → 引用 spacing.element.*
├── input/
│   └── ...
└── card/
    └── ...
```

### 5.3 主题系统设计

现代设计系统通常需要支持多主题切换，如亮色/暗色模式、高对比度模式、品牌主题等。Design Tokens 的主题系统设计应该支持这种需求，同时保持 Tokens 的语义稳定性。

```json
{
  "themes": {
    "light": {
      "semantic": {
        "color": {
          "background": {
            "default": { "$value": "#FFFFFF", "$type": "color" },
            "muted": { "$value": "#F3F4F6", "$type": "color" }
          },
          "text": {
            "primary": { "$value": "#111827", "$type": "color" },
            "secondary": { "$value": "#6B7280", "$type": "color" }
          }
        }
      }
    },
    "dark": {
      "semantic": {
        "color": {
          "background": {
            "default": { "$value": "#1F2937", "$type": "color" },
            "muted": { "$value": "#374151", "$type": "color" }
          },
          "text": {
            "primary": { "$value": "#F9FAFB", "$type": "color" },
            "secondary": { "$value": "#9CA3AF", "$type": "color" }
          }
        }
      }
    }
  }
}
```

主题系统的实现可以通过以下策略：**方案一是条件引用**，在语义层 Tokens 中定义主题相关的条件引用；**方案二是主题变体文件**，为每个主题创建独立的 Tokens 文件，通过配置选择加载；**方案三是运行时切换**，在应用层面根据当前主题动态选择合适的 Tokens 值。

## 6. 多平台适配策略

### 6.1 Web 平台（CSS Variables）

CSS Variables（自定义属性）是 Web 平台上实现 Design Tokens 的最佳方式。CSS Variables 可以在运行时通过 JavaScript 修改，支持媒体查询和 `prefers-color-scheme` 媒体特性，且与 CSS 预处理器（如 SCSS）不同，CSS Variables 具有真正的运行时能力。

```css
:root {
  /* Primitive Tokens */
  --color-blue-50: #eff6ff;
  --color-blue-100: #dbeafe;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  --color-red-500: #ef4444;
  --color-green-500: #22c55e;
  --color-yellow-500: #eab308;

  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-8: 32px;

  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;
  --font-size-4xl: 36px;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Semantic Tokens */
  --color-background-default: var(--color-gray-50);
  --color-background-muted: var(--color-gray-100);
  --color-background-elevated: #ffffff;

  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  --color-text-muted: var(--color-gray-500);
  --color-text-inverse: #ffffff;

  --color-interactive-primary: var(--color-blue-600);
  --color-interactive-primary-hover: var(--color-blue-700);
  --color-interactive-primary-active: var(--color-blue-800);

  --color-border-default: var(--color-gray-200);
  --color-border-strong: var(--color-gray-300);

  --color-status-success: var(--color-green-500);
  --color-status-warning: var(--color-yellow-500);
  --color-status-error: var(--color-red-500);
}

/* Dark Theme */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background-default: var(--color-gray-800);
    --color-background-muted: var(--color-gray-700);
    --color-background-elevated: var(--color-gray-800);

    --color-text-primary: var(--color-gray-50);
    --color-text-secondary: var(--color-gray-400);
    --color-text-muted: var(--color-gray-500);

    --color-border-default: var(--color-gray-700);
    --color-border-strong: var(--color-gray-600);
  }
}

/* High Contrast Mode */
@media (prefers-contrast: more) {
  :root {
    --color-text-primary: #000000;
    --color-text-secondary: #000000;
    --color-border-default: #000000;
  }
}
```

对于需要手动切换主题的场景，可以使用类名选择器：

```css
[data-theme="light"] {
  --color-background-default: #ffffff;
  --color-text-primary: #111827;
}

[data-theme="dark"] {
  --color-background-default: #1f2937;
  --color-text-primary: #f9fafb;
}
```

在 JavaScript 中使用 CSS Variables：

```javascript
// tokens.css.js - 从 Style Dictionary 生成的 CSS Variables
const tokens = {
  colors: {
    primitive: {
      blue: {
        50: "#EFF6FF",
        500: "#3B82F6",
        600: "#2563EB",
        700: "#1D4ED8",
      },
      gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        500: "#6B7280",
        600: "#4B5563",
        800: "#1F2937",
        900: "#111827",
      },
    },
    semantic: {
      background: {
        default: "var(--color-primitive-gray-50)",
      },
      text: {
        primary: "var(--color-primitive-gray-900)",
      },
    },
  },
};

// 设置主题
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// 获取 Token 值
function getTokenValue(tokenPath) {
  const path = tokenPath.split(".");
  let value = tokens;
  for (const key of path) {
    value = value[key];
  }
  return value;
}
```

### 6.2 React Native 平台

React Native 不支持 CSS Variables，需要使用 JavaScript 对象或 TypeScript 常量来定义 Tokens。在 React Native 中，通常使用 StyleSheet.create 方法来创建样式，Tokens 可以直接作为样式值的来源。

```typescript
// tokens.ts - React Native Design Tokens
export const tokens = {
  colors: {
    primitive: {
      blue: {
        50: "#EFF6FF",
        100: "#DBEAFE",
        500: "#3B82F6",
        600: "#2563EB",
        700: "#1D4ED8",
      },
      gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        500: "#6B7280",
        600: "#4B5563",
        800: "#1F2937",
        900: "#111827",
      },
    },
    semantic: {
      background: {
        default: "#FFFFFF",
        muted: "#F3F4F6",
        elevated: "#FFFFFF",
      },
      text: {
        primary: "#111827",
        secondary: "#6B7280",
        muted: "#9CA3AF",
        inverse: "#FFFFFF",
      },
      interactive: {
        primary: "#2563EB",
        primaryHover: "#1D4ED8",
        primaryActive: "#1E40AF",
      },
      status: {
        success: "#22C55E",
        warning: "#EAB308",
        error: "#EF4444",
      },
      border: {
        default: "#E5E7EB",
        strong: "#D1D5DB",
      },
    },
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    6: 24,
    8: 32,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
};

export type Tokens = typeof tokens;

// Theme interface
export interface Theme {
  colors: {
    background: {
      default: string;
      muted: string;
      elevated: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    interactive: {
      primary: string;
      primaryHover: string;
      primaryActive: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
    };
    border: {
      default: string;
      strong: string;
    };
  };
  spacing: typeof tokens.spacing;
  fontSize: typeof tokens.fontSize;
  borderRadius: typeof tokens.borderRadius;
}

// Light Theme
export const lightTheme: Theme = {
  colors: {
    background: {
      default: tokens.colors.semantic.background.default,
      muted: tokens.colors.semantic.background.muted,
      elevated: tokens.colors.semantic.background.elevated,
    },
    text: {
      primary: tokens.colors.semantic.text.primary,
      secondary: tokens.colors.semantic.text.secondary,
      muted: tokens.colors.semantic.text.muted,
      inverse: tokens.colors.semantic.text.inverse,
    },
    interactive: {
      primary: tokens.colors.semantic.interactive.primary,
      primaryHover: tokens.colors.semantic.interactive.primaryHover,
      primaryActive: tokens.colors.semantic.interactive.primaryActive,
    },
    status: {
      success: tokens.colors.semantic.status.success,
      warning: tokens.colors.semantic.status.warning,
      error: tokens.colors.semantic.status.error,
    },
    border: {
      default: tokens.colors.semantic.border.default,
      strong: tokens.colors.semantic.border.strong,
    },
  },
  spacing: tokens.spacing,
  fontSize: tokens.fontSize,
  borderRadius: tokens.borderRadius,
};

// Dark Theme
export const darkTheme: Theme = {
  colors: {
    background: {
      default: "#1F2937",
      muted: "#374151",
      elevated: "#1F2937",
    },
    text: {
      primary: "#F9FAFB",
      secondary: "#9CA3AF",
      muted: "#6B7280",
      inverse: "#111827",
    },
    interactive: {
      primary: "#60A5FA",
      primaryHover: "#93C5FD",
      primaryActive: "#BFDBFE",
    },
    status: {
      success: "#4ADE80",
      warning: "#FDE047",
      error: "#F87171",
    },
    border: {
      default: "#374151",
      strong: "#4B5563",
    },
  },
  spacing: tokens.spacing,
  fontSize: tokens.fontSize,
  borderRadius: tokens.borderRadius,
};
```

在 React Native 组件中使用 Tokens：

```typescript
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { tokens, Theme } from './tokens';

interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary';
  theme?: Theme;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  theme = tokens,
}) => {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: isPrimary
            ? theme.colors.interactive.primary
            : theme.colors.background.default,
          borderColor: theme.colors.border.default,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: isPrimary
              ? theme.colors.text.inverse
              : theme.colors.text.primary,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[5],
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: tokens.fontSize.base,
    fontWeight: '600',
  },
});
```

### 6.3 iOS 平台

iOS 平台通常使用 Swift 或 Objective-C 开发，Design Tokens 需要转换为平台特定的数据结构和 API。iOS 中常用的方式包括生成 Swift 类、枚举、常量或扩展 UIColor/UIFont。

```swift
// StyleDictionaryColors.swift
import UIKit

public struct StyleDictionaryColor {
    public let red: CGFloat
    public let green: CGFloat
    public let blue: CGFloat
    public let alpha: CGFloat

    public init(red: CGFloat, green: CGFloat, blue: CGFloat, alpha: CGFloat = 1.0) {
        self.red = red
        self.green = green
        self.blue = blue
        self.alpha = alpha
    }

    public var uiColor: UIColor {
        return UIColor(red: red / 255.0, green: green / 255.0, blue: blue / 255.0, alpha: alpha)
    }

    public var cgColor: CGColor {
        return uiColor.cgColor
    }
}

public struct StyleDictionaryColors {
    public struct Primitive {
        public struct Blue {
            public static let color50 = StyleDictionaryColor(red: 239, green: 246, blue: 255)
            public static let color100 = StyleDictionaryColor(red: 219, green: 234, blue: 254)
            public static let color200 = StyleDictionaryColor(red: 191, green: 219, blue: 254)
            public static let color500 = StyleDictionaryColor(red: 59, green: 130, blue: 246)
            public static let color600 = StyleDictionaryColor(red: 37, green: 99, blue: 235)
            public static let color700 = StyleDictionaryColor(red: 29, green: 78, blue: 216)
        }

        public struct Gray {
            public static let color50 = StyleDictionaryColor(red: 249, green: 250, blue: 251)
            public static let color100 = StyleDictionaryColor(red: 243, green: 244, blue: 246)
            public static let color200 = StyleDictionaryColor(red: 229, green: 231, blue: 235)
            public static let color500 = StyleDictionaryColor(red: 107, green: 114, blue: 128)
            public static let color600 = StyleDictionaryColor(red: 75, green: 85, blue: 99)
            public static let color800 = StyleDictionaryColor(red: 31, green: 41, blue: 55)
            public static let color900 = StyleDictionaryColor(red: 17, green: 24, blue: 39)
        }

        public struct Red {
            public static let color500 = StyleDictionaryColor(red: 239, green: 68, blue: 68)
        }

        public struct Green {
            public static let color500 = StyleDictionaryColor(red: 34, green: 197, blue: 94)
        }

        public struct Yellow {
            public static let color500 = StyleDictionaryColor(red: 234, green: 179, blue: 8)
        }
    }

    public struct Semantic {
        public struct Background {
            public static let default = StyleDictionaryColors.Primitive.Gray.color50
            public static let muted = StyleDictionaryColors.Primitive.Gray.color100
            public static let elevated = StyleDictionaryColor(red: 255, green: 255, blue: 255)
        }

        public struct Text {
            public static let primary = StyleDictionaryColors.Primitive.Gray.color900
            public static let secondary = StyleDictionaryColors.Primitive.Gray.color600
            public static let muted = StyleDictionaryColors.Primitive.Gray.color500
            public static let inverse = StyleDictionaryColor(red: 255, green: 255, blue: 255)
        }

        public struct Interactive {
            public static let primary = StyleDictionaryColors.Primitive.Blue.color600
            public static let primaryHover = StyleDictionaryColors.Primitive.Blue.color700
            public static let primaryActive = StyleDictionaryColors.Primitive.Blue.color800
        }

        public struct Status {
            public static let success = StyleDictionaryColors.Primitive.Green.color500
            public static let warning = StyleDictionaryColors.Primitive.Yellow.color500
            public static let error = StyleDictionaryColors.Primitive.Red.color500
        }

        public struct Border {
            public static let default = StyleDictionaryColors.Primitive.Gray.color200
            public static let strong = StyleDictionaryColors.Primitive.Gray.color300
        }
    }
}

// UIColor Extension for convenient usage
public extension UIColor {
    static let colorPrimitiveBlue50 = StyleDictionaryColors.Primitive.Blue.color50.uiColor
    static let colorPrimitiveBlue500 = StyleDictionaryColors.Primitive.Blue.color500.uiColor
    static let colorPrimitiveBlue600 = StyleDictionaryColors.Primitive.Blue.color600.uiColor
    static let colorPrimitiveBlue700 = StyleDictionaryColors.Primitive.Blue.color700.uiColor
    static let colorPrimitiveGray50 = StyleDictionaryColors.Primitive.Gray.color50.uiColor
    static let colorPrimitiveGray100 = StyleDictionaryColors.Primitive.Gray.color100.uiColor
    static let colorPrimitiveGray200 = StyleDictionaryColors.Primitive.Gray.color200.uiColor
    static let colorPrimitiveGray500 = StyleDictionaryColors.Primitive.Gray.color500.uiColor
    static let colorPrimitiveGray600 = StyleDictionaryColors.Primitive.Gray.color600.uiColor
    static let colorPrimitiveGray800 = StyleDictionaryColors.Primitive.Gray.color800.uiColor
    static let colorPrimitiveGray900 = StyleDictionaryColors.Primitive.Gray.color900.uiColor

    static let colorSemanticBackgroundDefault = StyleDictionaryColors.Semantic.Background.default.uiColor
    static let colorSemanticBackgroundMuted = StyleDictionaryColors.Semantic.Background.muted.uiColor
    static let colorSemanticTextPrimary = StyleDictionaryColors.Semantic.Text.primary.uiColor
    static let colorSemanticTextSecondary = StyleDictionaryColors.Semantic.Text.secondary.uiColor
    static let colorSemanticInteractivePrimary = StyleDictionaryColors.Semantic.Interactive.primary.uiColor
    static let colorSemanticStatusSuccess = StyleDictionaryColors.Semantic.Status.success.uiColor
    static let colorSemanticStatusError = StyleDictionaryColors.Semantic.Status.error.uiColor
}

// 在 UIView 中使用
class MyButton: UIButton {
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupStyles()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupStyles()
    }

    private func setupStyles() {
        backgroundColor = .colorSemanticInteractivePrimary
        setTitleColor(.colorSemanticTextInverse, for: .normal)
        layer.cornerRadius = 8
        titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .semibold)
    }
}
```

### 6.4 Android 平台

Android 平台使用 XML 资源文件来定义颜色、尺寸、字符串等。Design Tokens 需要转换为 Android XML 格式，可以在 `res/values/` 目录下定义 `colors.xml`、`dimens.xml` 等文件。

```xml
<!-- res/values/colors.xml -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Primitive Colors -->
    <color name="color_primitive_blue_50">#EFF6FF</color>
    <color name="color_primitive_blue_100">#DBEAFE</color>
    <color name="color_primitive_blue_200">#BFDBFE</color>
    <color name="color_primitive_blue_500">#3B82F6</color>
    <color name="color_primitive_blue_600">#2563EB</color>
    <color name="color_primitive_blue_700">#1D4ED8</color>

    <color name="color_primitive_gray_50">#F9FAFB</color>
    <color name="color_primitive_gray_100">#F3F4F6</color>
    <color name="color_primitive_gray_200">#E5E7EB</color>
    <color name="color_primitive_gray_500">#6B7280</color>
    <color name="color_primitive_gray_600">#4B5563</color>
    <color name="color_primitive_gray_800">#1F2937</color>
    <color name="color_primitive_gray_900">#111827</color>

    <color name="color_primitive_red_500">#EF4444</color>
    <color name="color_primitive_green_500">#22C55E</color>
    <color name="color_primitive_yellow_500">#EAB308</color>

    <!-- Semantic Colors -->
    <color name="color_semantic_background_default">@color/color_primitive_gray_50</color>
    <color name="color_semantic_background_muted">@color/color_primitive_gray_100</color>
    <color name="color_semantic_background_elevated">#FFFFFF</color>

    <color name="color_semantic_text_primary">@color/color_primitive_gray_900</color>
    <color name="color_semantic_text_secondary">@color/color_primitive_gray_600</color>
    <color name="color_semantic_text_muted">@color/color_primitive_gray_500</color>
    <color name="color_semantic_text_inverse">#FFFFFF</color>

    <color name="color_semantic_interactive_primary">@color/color_primitive_blue_600</color>
    <color name="color_semantic_interactive_primary_hover">@color/color_primitive_blue_700</color>
    <color name="color_semantic_interactive_primary_active">@color/color_primitive_blue_800</color>

    <color name="color_semantic_status_success">@color/color_primitive_green_500</color>
    <color name="color_semantic_status_warning">@color/color_primitive_yellow_500</color>
    <color name="color_semantic_status_error">@color/color_primitive_red_500</color>

    <color name="color_semantic_border_default">@color/color_primitive_gray_200</color>
    <color name="color_semantic_border_strong">@color/color_primitive_gray_300</color>
</resources>
```

```xml
<!-- res/values/dimens.xml -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Spacing -->
    <dimen name="spacing_1">4dp</dimen>
    <dimen name="spacing_2">8dp</dimen>
    <dimen name="spacing_3">12dp</dimen>
    <dimen name="spacing_4">16dp</dimen>
    <dimen name="spacing_5">20dp</dimen>
    <dimen name="spacing_6">24dp</dimen>
    <dimen name="spacing_8">32dp</dimen>
    <dimen name="spacing_10">40dp</dimen>
    <dimen name="spacing_12">48dp</dimen>

    <!-- Font Sizes (sp = scaled pixels for text) -->
    <dimen name="font_size_xs">12sp</dimen>
    <dimen name="font_size_sm">14sp</dimen>
    <dimen name="font_size_base">16sp</dimen>
    <dimen name="font_size_lg">18sp</dimen>
    <dimen name="font_size_xl">20sp</dimen>
    <dimen name="font_size_2xl">24sp</dimen>
    <dimen name="font_size_3xl">30sp</dimen>
    <dimen name="font_size_4xl">36sp</dimen>

    <!-- Border Radius -->
    <dimen name="border_radius_sm">4dp</dimen>
    <dimen name="border_radius_md">8dp</dimen>
    <dimen name="border_radius_lg">12dp</dimen>
    <dimen name="border_radius_full">9999dp</dimen>

    <!-- Elevation -->
    <dimen name="elevation_sm">2dp</dimen>
    <dimen name="elevation_md">4dp</dimen>
    <dimen name="elevation_lg">8dp</dimen>
</resources>
```

```xml
<!-- res/values-night/colors.xml (Dark Theme) -->
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Semantic Colors - Dark Theme -->
    <color name="color_semantic_background_default">#1F2937</color>
    <color name="color_semantic_background_muted">#374151</color>
    <color name="color_semantic_background_elevated">#1F2937</color>

    <color name="color_semantic_text_primary">#F9FAFB</color>
    <color name="color_semantic_text_secondary">#9CA3AF</color>
    <color name="color_semantic_text_muted">#6B7280</color>

    <color name="color_semantic_border_default">#374151</color>
    <color name="color_semantic_border_strong">#4B5563</color>
</resources>
```

在 Android 代码中使用 Tokens：

```kotlin
// Theme.kt
import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_interactive_primary
    ),
    onPrimary = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_text_inverse
    ),
    secondary = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_primitive_gray_500
    ),
    background = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_background_default
    ),
    surface = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_background_elevated
    ),
    onBackground = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_text_primary
    ),
    onSurface = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_text_primary
    ),
    error = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_status_error
    ),
)

private val DarkColorScheme = darkColorScheme(
    primary = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_primitive_blue_400
    ),
    onPrimary = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_text_inverse
    ),
    secondary = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_primitive_gray_400
    ),
    background = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_background_default
    ),
    surface = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_background_elevated
    ),
    onBackground = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_text_primary
    ),
    onSurface = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_semantic_text_primary
    ),
    error = androidx.core.content.ContextCompat.getColor(
        MyApp.context, R.color.color_primitive_red_400
    ),
)

@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
```

### 6.5 统一策略与工具链

在多平台项目中，保持 Design Tokens 的一致性是一个挑战。建议采用以下统一策略：**首先使用 Style Dictionary 作为核心构建工具**，它可以从单一来源生成所有平台的输出；**其次建立 Tokens 的单一事实来源**，所有 Tokens 定义存储在一个地方，避免不同平台各自维护导致的差异；**最后实现自动化同步**，将 Tokens 生成集成到 CI/CD 流程中，确保设计变更能够自动同步到所有平台。

完整的 Style Dictionary 多平台配置示例：

```json
{
  "source": ["tokens/**/*.json"],
  "platforms": {
    "css": {
      "transformGroup": "css",
      "buildPath": "dist/css/",
      "prefix": "nce",
      "files": [
        {
          "destination": "variables.css",
          "format": "css/variables"
        }
      ]
    },
    "scss": {
      "transformGroup": "scss",
      "buildPath": "dist/scss/",
      "files": [
        {
          "destination": "_variables.scss",
          "format": "scss/map-flat"
        }
      ]
    },
    "js": {
      "transformGroup": "js",
      "buildPath": "dist/js/",
      "files": [
        {
          "destination": "tokens.js",
          "format": "javascript/module",
          "options": { "outputReferences": true }
        },
        {
          "destination": "tokens.d.ts",
          "format": "typescript/module-declarations"
        }
      ]
    },
    "react-native": {
      "transformGroup": "react-native",
      "buildPath": "dist/rn/",
      "files": [
        {
          "destination": "tokens.ts",
          "format": "javascript/module",
          "options": { "outputReferences": true }
        }
      ]
    },
    "ios": {
      "transformGroup": "ios",
      "buildPath": "dist/ios/StyleDictionary/",
      "files": [
        {
          "destination": "Colors.swift",
          "format": "ios/swift/class.swift",
          "options": { "className": "StyleDictionaryColors" }
        },
        {
          "destination": "Sizes.swift",
          "format": "ios/swift/class.swift",
          "options": { "className": "StyleDictionarySizes" }
        },
        {
          "destination": "StyleDictionary.h",
          "format": "ios/static.h"
        }
      ]
    },
    "android": {
      "transformGroup": "android",
      "buildPath": "dist/android/res/",
      "files": [
        {
          "destination": "values/colors.xml",
          "format": "android/resources"
        },
        {
          "destination": "values/dimens.xml",
          "format": "android/dimens"
        },
        {
          "destination": "values-night/colors.xml",
          "format": "android/resources"
        }
      ]
    }
  }
}
```

## 7. 最佳实践总结

### 7.1 Tokens 架构设计原则

设计良好的 Tokens 架构应该遵循以下核心原则：**分层架构**，从 Primitive 层到 Semantic 层再到 Component 层，每层都有明确的职责和边界；**语义化命名**，使用表达功能意图的名称而非描述外观的名称，如 `interactive.primary` 而非 `blue-600`；**引用优先**，尽量通过引用组合来构建复杂的 Tokens，而非直接使用硬编码的值；**主题适应**，在语义层设计时就考虑主题切换的需求，使用条件引用或主题变体来支持多主题。

### 7.2 工具链与工作流

建立高效的 Tokens 工作流需要以下工具链支持：**版本控制**，将 Tokens 定义纳入 Git 版本控制，与设计文件保持同步；**自动化构建**，使用 Style Dictionary 或类似工具自动化生成各平台输出；**设计工具集成**，使用 Figma Tokens 插件等工具实现设计与代码的同步；**CI/CD 集成**，将 Tokens 构建集成到持续集成流程中，确保设计变更能够自动触发代码更新。

### 7.3 团队协作与治理

成功的 Design Tokens 系统需要良好的团队协作和治理机制：**明确所有权**，指定 Tokens 的维护者和审批流程；**文档规范**，编写详细的 Tokens 使用指南和命名规范文档；**变更管理**，建立 Tokens 变更的评审机制，确保变更不会破坏现有组件；**定期审计**，定期审查 Tokens 的使用情况和冗余，保持系统的整洁和一致。

Design Tokens 是现代设计系统的核心基础设施，通过遵循行业标准和最佳实践，团队可以建立一套可维护、可扩展、跨平台的设计资产体系。这不仅提升了开发效率，更确保了产品体验的一致性和品牌形象的统一性。
