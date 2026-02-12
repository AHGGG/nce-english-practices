const IDLE_THRESHOLD_MS = 30000;
const JUMP_THRESHOLD = 5;
const HEARTBEAT_INTERVAL_MS = 10000;

interface ArticleSentence {
  text?: string;
}

interface ArticleBlock {
  type?: string;
  sentences?: string[];
}

interface ReadingArticle {
  id?: string;
  source_id?: string;
  source_type?: string;
  title?: string;
  blocks?: ArticleBlock[];
  sentences?: Array<string | ArticleSentence>;
}

interface ReadingApiClient {
  post: (path: string, payload: Record<string, unknown>) => Promise<unknown>;
  put: (path: string, payload: Record<string, unknown>) => Promise<unknown>;
}

interface StartResponse {
  success?: boolean;
  session_id?: number;
}

export default class ReadingTracker {
  private api: ReadingApiClient;
  private article: ReadingArticle;
  private sessionId: number | null = null;
  private lastSentenceIdx = 0;
  private maxSentenceReached = 0;
  private activeStartTime = Date.now();
  private totalActiveMs = 0;
  private totalIdleMs = 0;
  private isActive = true;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private jumpCount = 0;
  private wordClickCount = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(article: ReadingArticle, api: ReadingApiClient) {
    this.api = api;
    this.article = article;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  async start() {
    try {
      let sentences: string[] = [];
      if (this.article.blocks && this.article.blocks.length > 0) {
        this.article.blocks.forEach((block) => {
          if (block.type === "paragraph" && block.sentences) {
            sentences.push(...block.sentences);
          }
        });
      } else if (this.article.sentences) {
        sentences = this.article.sentences.map((sentence) =>
          typeof sentence === "string" ? sentence : sentence.text || "",
        );
      }

      const totalWords = sentences.reduce(
        (sum, sentence) => sum + sentence.split(/\s+/).filter(Boolean).length,
        0,
      );

      const response = (await this.api.post("/api/reading/start", {
        source_type: this.article.source_type || "epub",
        source_id: this.article.id || this.article.source_id,
        article_title: this.article.title || "",
        total_word_count: totalWords,
        total_sentences: sentences.length,
      })) as StartResponse;

      if (response.success && response.session_id) {
        this.sessionId = response.session_id;
        this.startHeartbeat();
        document.addEventListener(
          "visibilitychange",
          this.handleVisibilityChange,
        );
        this.resetIdleTimer();
        console.log("[ReadingTracker] Session started:", this.sessionId);
      }

      return this.sessionId;
    } catch (error) {
      console.error("[ReadingTracker] Failed to start session:", error);
      return null;
    }
  }

  onSentenceView(idx: number | string) {
    const parsedIdx = typeof idx === "string" ? Number.parseInt(idx, 10) : idx;
    if (Number.isNaN(parsedIdx) || parsedIdx === this.lastSentenceIdx) return;

    const delta = Math.abs(parsedIdx - this.lastSentenceIdx);
    if (delta > JUMP_THRESHOLD) {
      this.jumpCount += 1;
      console.log(
        "[ReadingTracker] Jump detected:",
        this.lastSentenceIdx,
        "->",
        parsedIdx,
      );
    }

    this.lastSentenceIdx = parsedIdx;
    this.maxSentenceReached = Math.max(this.maxSentenceReached, parsedIdx);
    this.recordActiveTime();
    this.resetIdleTimer();
  }

  onInteraction() {
    this.recordActiveTime();
    this.resetIdleTimer();
  }

  onWordClick() {
    this.wordClickCount += 1;
    this.recordActiveTime();
    this.resetIdleTimer();

    if (this.sessionId) {
      void this.api
        .post("/api/reading/word-click", { session_id: this.sessionId })
        .catch((error) => {
          console.error("[ReadingTracker] Word click failed:", error);
        });
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      this.recordActiveTime();
      this.isActive = false;
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
    } else {
      this.isActive = true;
      this.activeStartTime = Date.now();
      this.resetIdleTimer();
    }
  }

  private recordActiveTime() {
    if (!this.isActive) return;
    const now = Date.now();
    this.totalActiveMs += now - this.activeStartTime;
    this.activeStartTime = now;
  }

  private resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.recordActiveTime();
      this.isActive = false;
      this.totalIdleMs += IDLE_THRESHOLD_MS;
    }, IDLE_THRESHOLD_MS);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      void this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private async sendHeartbeat() {
    if (!this.sessionId) return;

    this.recordActiveTime();
    try {
      await this.api.put("/api/reading/heartbeat", {
        session_id: this.sessionId,
        max_sentence_reached: this.maxSentenceReached,
        total_active_seconds: Math.round(this.totalActiveMs / 1000),
        total_idle_seconds: Math.round(this.totalIdleMs / 1000),
        scroll_jump_count: this.jumpCount,
      });
    } catch (error) {
      console.error("[ReadingTracker] Heartbeat failed:", error);
    }
  }

  async end() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    this.recordActiveTime();

    if (!this.sessionId) {
      console.log("[ReadingTracker] No session to end");
      return null;
    }

    try {
      const response = await this.api.post("/api/reading/end", {
        session_id: this.sessionId,
        max_sentence_reached: this.maxSentenceReached,
        total_active_seconds: Math.round(this.totalActiveMs / 1000),
        total_idle_seconds: Math.round(this.totalIdleMs / 1000),
        scroll_jump_count: this.jumpCount,
      });

      console.log("[ReadingTracker] Session ended:", response);
      return response;
    } catch (error) {
      console.error("[ReadingTracker] Failed to end session:", error);
      return null;
    }
  }

  getStats() {
    return {
      sessionId: this.sessionId,
      maxSentenceReached: this.maxSentenceReached,
      totalActiveSeconds: Math.round(this.totalActiveMs / 1000),
      totalIdleSeconds: Math.round(this.totalIdleMs / 1000),
      jumpCount: this.jumpCount,
      wordClickCount: this.wordClickCount,
    };
  }
}
