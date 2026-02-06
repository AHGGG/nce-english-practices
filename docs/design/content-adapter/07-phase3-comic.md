# 07 - Phase 3: Comic Support (Future)

> Phase 3 实现计划 - 漫画支持

## 1. Overview

| 项目         | 内容                                    |
| ------------ | --------------------------------------- |
| **目标**     | 支持漫画内容类型（图片 + OCR 文字识别） |
| **预计周期** | TBD                                     |
| **依赖**     | Phase 1, Phase 2 完成                   |
| **风险**     | 高（OCR 准确性、性能）                  |

> **注意**: 本文档为预研性质，具体实现细节待需求明确后补充。

## 2. Features (Planned)

### 2.1 Core Features

- [ ] 漫画图片浏览
- [ ] OCR 文字识别
- [ ] 文字区域点击查词
- [ ] 阅读进度追踪

### 2.2 Nice-to-Have

- [ ] 翻页动画
- [ ] 双页模式
- [ ] 缩放手势
- [ ] OCR 结果缓存

## 3. Technical Considerations

### 3.1 OCR Service Options

| 方案                      | 优点               | 缺点           |
| ------------------------- | ------------------ | -------------- |
| **DeepSeek Vision**       | 准确度高、支持坐标 | 成本高、延迟大 |
| **Tesseract**             | 免费、本地运行     | 准确度一般     |
| **PaddleOCR**             | 免费、准确度好     | 需要部署       |
| **云服务 (Azure/Google)** | 准确度高           | 成本、隐私     |

**建议**: 先用 DeepSeek Vision 验证可行性，后续考虑本地方案。

### 3.2 Coordinate System

```
┌─────────────────────────────────────┐
│                                     │
│   使用百分比坐标系：                  │
│                                     │
│   x_percent = x / image_width * 100 │
│   y_percent = y / image_height * 100│
│                                     │
│   优点：                             │
│   - 响应式适配                       │
│   - 缩放时位置稳定                   │
│                                     │
└─────────────────────────────────────┘
```

### 3.3 Data Model Preview

```python
# app/models/comic_schemas.py

class BoundingBox(BaseModel):
    """OCR 文字边界框（百分比坐标）"""
    x_percent: float
    y_percent: float
    width_percent: float
    height_percent: float

class TextRegion(BaseModel):
    """OCR 识别的文字区域"""
    id: str
    text: str
    bounds: BoundingBox
    confidence: float = 1.0
    reading_order: int = 0

class ComicPage(BaseModel):
    """漫画页面"""
    page_index: int
    image_url: str
    text_regions: List[TextRegion] = []
    full_text: Optional[str] = None
```

## 4. Architecture Preview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ComicProvider                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   fetch(comic_id, page_index)                                   │
│   ├── 读取图片                                                   │
│   ├── 调用 OCR 服务（可选）                                      │
│   ├── 缓存 OCR 结果                                              │
│   └── 返回 ContentBundle                                         │
│                                                                  │
│   get_page_image(comic_id, page_index)                          │
│   └── 返回图片二进制                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ComicRenderer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    Image Container                       │   │
│   │   ┌─────────────────────────────────────────────────┐   │   │
│   │   │                                                  │   │   │
│   │   │              Comic Page Image                    │   │   │
│   │   │                                                  │   │   │
│   │   │   ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │   │
│   │   │   │ OCR Text │  │ OCR Text │  │ OCR Text │     │   │   │
│   │   │   │ Region 1 │  │ Region 2 │  │ Region 3 │     │   │   │
│   │   │   └──────────┘  └──────────┘  └──────────┘     │   │   │
│   │   │                                                  │   │   │
│   │   └─────────────────────────────────────────────────┘   │   │
│   │                                                          │   │
│   │   OCR Overlay Layer (position: absolute)                │   │
│   │   - 透明背景                                             │   │
│   │   - 点击穿透到图片                                       │   │
│   │   - 文字区域可点击查词                                   │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Implementation Outline

### 5.1 Backend

1. 创建 `app/models/comic_schemas.py`
2. 创建 `app/services/content_providers/comic_provider.py`
3. 创建 `app/services/ocr/ocr_service.py`
4. 创建 `app/api/routers/comic.py`
5. 注册 Provider

### 5.2 Frontend

1. 创建 `ComicContentRenderer.tsx`
2. 创建 `OcrOverlayLayer.tsx`
3. 创建 `useComicReader` hook
4. 注册 Renderer

## 6. Open Questions

- [ ] OCR 服务选型
- [ ] OCR 结果缓存策略
- [ ] 漫画格式支持范围（CBZ/CBR/目录）
- [ ] 阅读方向（左→右 vs 右→左）
- [ ] 移动端手势支持

## 7. Dependencies

- Phase 1: Renderer 抽象
- Phase 2: 验证架构可行性
- OCR 服务选型确定

---

_Next: [08-migration-guide.md](./08-migration-guide.md) - 迁移指南_
