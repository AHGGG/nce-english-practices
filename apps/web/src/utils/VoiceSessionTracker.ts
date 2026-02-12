const IDLE_THRESHOLD_MS = 60000;
const HEARTBEAT_INTERVAL_MS = 10000;

interface VoiceApiClient {
  post: (path: string, payload: Record<string, unknown>) => Promise<unknown>;
  put: (path: string, payload: Record<string, unknown>) => Promise<unknown>;
}

interface SourceInfo {
  sourceType?: string;
  sourceId?: string;
}

interface StartVoiceSessionResponse {
  session_id?: number;
}

export default class VoiceSessionTracker {
  private api: VoiceApiClient;
  private sessionId: number | null = null;
  private activeStartTime = Date.now();
  private totalActiveMs = 0;
  private isActive = true;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private wordLookupCount = 0;
  private wordsLookedUp: string[] = [];
  private gotItCount = 0;
  private exampleNavCount = 0;
  private audioPlayCount = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(api: VoiceApiClient) {
    this.api = api;
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  async start(sourceInfo: SourceInfo = {}) {
    try {
      const response = (await this.api.post("/api/voice-session/start", {
        source_type: sourceInfo.sourceType,
        source_id: sourceInfo.sourceId,
      })) as StartVoiceSessionResponse;

      if (response.session_id) {
        this.sessionId = response.session_id;
        this.startHeartbeat();
        document.addEventListener(
          "visibilitychange",
          this.handleVisibilityChange,
        );
        this.resetIdleTimer();
        console.log("[VoiceTracker] Session started:", this.sessionId);
      }

      return this.sessionId;
    } catch (error) {
      console.error("[VoiceTracker] Failed to start session:", error);
      return null;
    }
  }

  onWordLookup(word?: string) {
    this.wordLookupCount += 1;
    if (word && !this.wordsLookedUp.includes(word)) {
      this.wordsLookedUp.push(word);
    }
    this.onInteraction();
  }

  onGotIt() {
    this.gotItCount += 1;
    this.onInteraction();
  }

  onExampleNav() {
    this.exampleNavCount += 1;
    this.onInteraction();
  }

  onAudioPlay() {
    this.audioPlayCount += 1;
    this.onInteraction();
  }

  private onInteraction() {
    this.recordActiveTime();
    this.resetIdleTimer();
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
      await this.api.put("/api/voice-session/heartbeat", {
        session_id: this.sessionId,
        total_active_seconds: Math.round(this.totalActiveMs / 1000),
        word_lookup_count: this.wordLookupCount,
        words_looked_up: this.wordsLookedUp,
        got_it_count: this.gotItCount,
        example_navigation_count: this.exampleNavCount,
        audio_play_count: this.audioPlayCount,
      });
    } catch (error) {
      console.error("[VoiceTracker] Heartbeat failed:", error);
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

    if (!this.sessionId) return null;

    try {
      const response = await this.api.post("/api/voice-session/end", {
        session_id: this.sessionId,
        total_active_seconds: Math.round(this.totalActiveMs / 1000),
      });

      console.log("[VoiceTracker] Session ended");
      this.sessionId = null;
      return response;
    } catch (error) {
      console.error("[VoiceTracker] Failed to end session:", error);
      return null;
    }
  }
}
