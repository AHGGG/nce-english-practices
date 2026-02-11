"""
Context Resource Schemas - Pydantic models for multi-modal learning contexts.
"""

from enum import Enum
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ContextType(str, Enum):
    """语境资源类型"""

    DICTIONARY_EXAMPLE = "dictionary_example"  # 词典例句
    STORY = "story"  # LLM生成的故事
    AUDIO_CLIP = "audio_clip"  # 独立音频片段
    VIDEO_CLIP = "video_clip"  # 视频片段 (Phase 2)
    CUSTOM = "custom"  # 用户自定义


class LearningStatus(str, Enum):
    """学习状态"""

    UNSEEN = "unseen"  # 未接触
    LEARNING = "learning"  # 学习中
    MASTERED = "mastered"  # 已掌握


class ContextResourceBase(BaseModel):
    """语境资源基础模型"""

    word: str = Field(..., description="关联的单词")
    sense_label: Optional[str] = Field(
        None, description="义项标签 (e.g., 'v. to cook gently')"
    )
    context_type: ContextType = Field(..., description="语境类型")
    text_content: str = Field(..., description="文字内容 (例句/Story片段)")
    source: str = Field(
        ..., description="来源 (dictionary name / 'ai_generated' / URL)"
    )
    audio_url: Optional[str] = Field(None, description="语音URL (如果预生成)")


class ContextResourceCreate(ContextResourceBase):
    """创建语境资源的请求模型"""

    pass


class ContextResource(ContextResourceBase):
    """语境资源完整模型 (包含ID)"""

    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ContextResourceWithAudio(ContextResource):
    """带有音频信息的语境资源"""

    audio_available: bool = True
    audio_endpoint: Optional[str] = None  # /api/context/{id}/audio


class ContextLearningRecordBase(BaseModel):
    """学习记录基础模型"""

    context_id: int
    user_id: str = "default_user"
    status: LearningStatus = LearningStatus.UNSEEN


class ContextLearningRecordCreate(ContextLearningRecordBase):
    """创建学习记录的请求模型"""

    pass


class ContextLearningRecord(ContextLearningRecordBase):
    """学习记录完整模型"""

    id: int
    last_practiced_at: Optional[datetime] = None
    practice_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class WordContextProgress(BaseModel):
    """单词语境学习进度统计"""

    word: str
    total: int = 0
    mastered: int = 0
    learning: int = 0
    unseen: int = 0
    contexts: List[ContextResource] = Field(default_factory=list)


class ExtractContextRequest(BaseModel):
    """从词典提取语境的请求"""

    word: str
    save_to_db: bool = True


class UpdateLearningStatusRequest(BaseModel):
    """更新学习状态的请求"""

    status: LearningStatus
    user_id: str = "default_user"
