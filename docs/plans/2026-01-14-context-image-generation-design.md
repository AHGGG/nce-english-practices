# Context-Aware Image Generation for Word Learning

为缺少视觉上下文的单词/短语自动生成辅助理解的图片。

## 设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 触发机制 | LLM 判断是否适合图片解释 | 精准过滤，只为具象词生成 |
| 判断时机 | Context Explanation 流程中 | 复用上下文信息，减少延迟 |
| 文生图 API | 智谱 GLM-Image | 国内服务，已有集成经验 |
| 缓存策略 | word + context_hash | 相同上下文复用，不同上下文新生成 |
| 图片存储 | PostgreSQL BYTEA | 便于备份和 Docker 部署 |

---

## 整体流程

```
用户点击单词/Collocation
          ↓
   useWordExplainer 触发
          ↓
  ┌───────────────────────────────────┐
  │  GET /api/dictionary/explain      │
  │  (现有的上下文解释 API)            │
  │                                   │
  │  新增: LLM 判断是否需要图片        │
  │  返回: { ..., needs_image: bool,  │
  │          image_prompt: string }   │
  └───────────────────────────────────┘
          ↓ (如果 needs_image = true)
  ┌───────────────────────────────────┐
  │  1. 查询缓存 (word + context_hash)│
  │  2. 命中 → 返回已有图片            │
  │  3. 未命中 → 调用 GLM-Image API   │
  │  4. 保存到 PostgreSQL             │
  │  5. 返回图片 URL                   │
  └───────────────────────────────────┘
          ↓
   前端渲染图片 (在解释区域下方)
```

---

## Proposed Changes

### Backend

#### [NEW] `app/models/orm.py` - 新增 ORM 模型

```python
class GeneratedImage(Base):
    __tablename__ = "generated_images"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    word = Column(String(100), nullable=False, index=True)
    context_hash = Column(String(64), nullable=False, index=True)
    sentence = Column(Text, nullable=False)
    image_prompt = Column(Text, nullable=False)
    image_data = Column(LargeBinary, nullable=False)
    mime_type = Column(String(20), default="image/png")
    model = Column(String(50), default="cogview-4")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("ix_generated_images_word_context", "word", "context_hash"),
    )
```

---

#### [NEW] `app/services/image_generation.py` - 图片生成服务

```python
class ImageGenerationService:
    """GLM-Image API 调用 + 缓存管理"""
    
    async def get_or_generate_image(
        self,
        word: str,
        sentence: str,
        image_prompt: str,
        db: AsyncSession
    ) -> Optional[bytes]:
        """查询缓存或生成新图片"""
        context_hash = self._compute_hash(sentence)
        
        # 1. 查询缓存
        cached = await self._get_cached(word, context_hash, db)
        if cached:
            return cached.image_data
        
        # 2. 调用 API
        image_bytes = await self._call_glm_image(image_prompt)
        
        # 3. 保存缓存
        await self._save_to_db(word, context_hash, sentence, image_prompt, image_bytes, db)
        
        return image_bytes
    
    async def _call_glm_image(self, prompt: str) -> bytes:
        """调用智谱 GLM-Image API"""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://open.bigmodel.cn/api/paas/v4/images/generations",
                headers={"Authorization": f"Bearer {ZHIPU_API_KEY}"},
                json={
                    "model": "cogview-4",
                    "prompt": prompt,
                    "size": "1024x1024",
                    "quality": "standard"
                }
            )
            data = resp.json()
            image_url = data["data"][0]["url"]
            
            # 下载图片
            img_resp = await client.get(image_url)
            return img_resp.content
```

---

#### [MODIFY] `app/api/routers/sentence_study.py` - 修改解释 API

在 context explanation 返回中增加：
- `needs_image: bool`
- `image_prompt: Optional[str]`

---

#### [NEW] `app/api/routers/images.py` - 图片 API

```python
@router.get("/generated-images/{word}")
async def get_generated_image(
    word: str,
    context_hash: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """获取缓存的生成图片"""
    image = await image_service.get_cached(word, context_hash, db)
    if not image:
        raise HTTPException(404, "Image not found")
    return Response(content=image.image_data, media_type=image.mime_type)

@router.post("/generated-images/generate")
async def generate_image(
    request: GenerateImageRequest,
    db: AsyncSession = Depends(get_db)
):
    """生成并缓存图片"""
    image_bytes = await image_service.get_or_generate_image(
        request.word, request.sentence, request.image_prompt, db
    )
    context_hash = image_service.compute_hash(request.sentence)
    return {"image_url": f"/api/generated-images/{request.word}?context_hash={context_hash}"}
```

---

### Frontend

#### [MODIFY] `frontend/src/hooks/useWordExplainer.js`

增加图片生成逻辑：
1. 解释返回 `needs_image=true` 时，调用 `/api/generated-images/generate`
2. 返回 `imageUrl` 供组件渲染

---

#### [MODIFY] `frontend/src/components/reading/WordInspector.jsx`

在解释区域下方增加图片显示：
```jsx
{imageUrl && (
  <div className="mt-4">
    <img src={imageUrl} alt={`Illustration for ${word}`} className="rounded-lg" />
    <p className="text-xs text-text-muted mt-1">📷 AI 生成 · 帮助理解</p>
  </div>
)}
```

---

## LLM Prompt 设计

### 判断是否需要图片 + 生成 Prompt

```
作为英语学习助手，分析以下单词在句子中的含义。

单词: {word}
句子: {sentence}

1. 提供简明的中文解释。

2. 判断：这个词/短语是否适合用图片辅助理解？
   适合：具象名词、动作动词、描述外观的形容词
   不适合：抽象概念、语法词、常见简单词

3. 如果适合，生成英文图片描述 prompt（50词以内）。

返回 JSON:
{
  "explanation": "中文解释...",
  "needs_image": true/false,
  "image_prompt": "A dramatic aerial view of..." // 仅当 needs_image=true
}
```

---

## 环境配置

`.env` 新增：
```
ZHIPU_API_KEY=your_zhipu_api_key
```

---

## Verification Plan

### Automated Tests

```bash
# 测试图片生成服务
uv run pytest tests/test_image_generation.py -v

# 测试 API 端点
uv run pytest tests/test_image_api.py -v
```

### Manual Verification

1. 启动服务器，点击 "deforestation" 等具象词
2. 确认 LLM 返回 `needs_image: true`
3. 确认图片生成并显示
4. 再次点击同一词（同一句子），确认使用缓存
5. 点击抽象词如 "democracy"，确认不触发图片生成
