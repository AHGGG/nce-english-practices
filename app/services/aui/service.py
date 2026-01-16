from app.services.aui.story import StoryMixin
from app.services.aui.vocabulary import VocabularyMixin
from app.services.aui.demos.general import GeneralDemosMixin
from app.services.aui.demos.interactive import InteractiveDemosMixin
from app.services.aui.demos.dashboard import DashboardDemosMixin


class AUIStreamingService(
    StoryMixin,
    VocabularyMixin,
    GeneralDemosMixin,
    InteractiveDemosMixin,
    DashboardDemosMixin,
):
    """
    Service to generate streaming AUI events.
    Wraps separate functional mixins for modularity.
    """

    pass


# Singleton instance
aui_streaming_service = AUIStreamingService()
