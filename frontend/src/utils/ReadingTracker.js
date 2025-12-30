/**
 * ReadingTracker - Tracks reading sessions with mixed signals
 * 
 * Signals tracked:
 * - Time: active vs idle time
 * - Scroll: sequential vs jump reading
 * - Interactions: word clicks
 * 
 * Usage:
 * const tracker = new ReadingTracker(article, api);
 * await tracker.start();
 * tracker.onSentenceView(idx);
 * tracker.onInteraction();
 * tracker.onWordClick();
 * await tracker.end();
 */

const IDLE_THRESHOLD_MS = 30000;  // 30 seconds = idle
const JUMP_THRESHOLD = 5;         // Jump > 5 sentences = skip
const HEARTBEAT_INTERVAL_MS = 10000; // Send heartbeat every 10 seconds

export default class ReadingTracker {
    constructor(article, api) {
        this.api = api;
        this.article = article;
        this.sessionId = null;
        
        // Position tracking
        this.lastSentenceIdx = 0;
        this.maxSentenceReached = 0;
        
        // Time tracking
        this.activeStartTime = Date.now();
        this.totalActiveMs = 0;
        this.totalIdleMs = 0;
        this.isActive = true;
        this.idleTimer = null;
        
        // Behavior tracking
        this.jumpCount = 0;
        this.wordClickCount = 0;
        
        // Heartbeat
        this.heartbeatInterval = null;
        
        // Visibility tracking
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }
    
    /**
     * Start tracking session
     */
    async start() {
        try {
            // Calculate article stats
            const sentences = this.article.sentences || [];
            const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0);
            
            const response = await this.api.post('/api/reading/start', {
                source_type: this.article.source_type || 'rss',
                source_id: this.article.id || this.article.source_id,
                article_title: this.article.title || '',
                total_word_count: totalWords,
                total_sentences: sentences.length
            });
            
            if (response.success) {
                this.sessionId = response.session_id;
                
                // Start heartbeat
                this.startHeartbeat();
                
                // Add visibility listener
                document.addEventListener('visibilitychange', this.handleVisibilityChange);
                
                // Start idle timer
                this.resetIdleTimer();
                
                console.log('[ReadingTracker] Session started:', this.sessionId);
            }
            
            return this.sessionId;
        } catch (error) {
            console.error('[ReadingTracker] Failed to start session:', error);
            return null;
        }
    }
    
    /**
     * Called when a sentence becomes visible
     */
    onSentenceView(idx) {
        if (idx === this.lastSentenceIdx) return;
        
        const delta = Math.abs(idx - this.lastSentenceIdx);
        
        if (delta > JUMP_THRESHOLD) {
            this.jumpCount++;
            console.log('[ReadingTracker] Jump detected:', this.lastSentenceIdx, '->', idx);
        }
        
        this.lastSentenceIdx = idx;
        this.maxSentenceReached = Math.max(this.maxSentenceReached, idx);
        
        this.recordActiveTime();
        this.resetIdleTimer();
    }
    
    /**
     * Called on any user interaction (scroll, click, etc.)
     */
    onInteraction() {
        this.recordActiveTime();
        this.resetIdleTimer();
    }
    
    /**
     * Called when user clicks a word for definition
     */
    onWordClick() {
        this.wordClickCount++;
        this.recordActiveTime();
        this.resetIdleTimer();
        
        // Also notify backend for accurate tracking
        if (this.sessionId) {
            this.api.post('/api/reading/word-click', { session_id: this.sessionId })
                .catch(err => console.error('[ReadingTracker] Word click failed:', err));
        }
    }
    
    /**
     * Handle visibility change (tab switch)
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Tab hidden - pause active tracking
            this.recordActiveTime();
            this.isActive = false;
            if (this.idleTimer) {
                clearTimeout(this.idleTimer);
                this.idleTimer = null;
            }
        } else {
            // Tab visible - resume tracking
            this.isActive = true;
            this.activeStartTime = Date.now();
            this.resetIdleTimer();
        }
    }
    
    /**
     * Record active time since last measurement
     */
    recordActiveTime() {
        if (this.isActive) {
            const now = Date.now();
            this.totalActiveMs += now - this.activeStartTime;
            this.activeStartTime = now;
        }
    }
    
    /**
     * Reset idle timer
     */
    resetIdleTimer() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        
        this.idleTimer = setTimeout(() => {
            // User is idle
            this.recordActiveTime();
            this.isActive = false;
            this.totalIdleMs += IDLE_THRESHOLD_MS;
        }, IDLE_THRESHOLD_MS);
    }
    
    /**
     * Start sending periodic heartbeats
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, HEARTBEAT_INTERVAL_MS);
    }
    
    /**
     * Send heartbeat to backend
     */
    async sendHeartbeat() {
        if (!this.sessionId) return;
        
        this.recordActiveTime();
        
        try {
            await this.api.put('/api/reading/heartbeat', {
                session_id: this.sessionId,
                max_sentence_reached: this.maxSentenceReached,
                total_active_seconds: Math.round(this.totalActiveMs / 1000),
                total_idle_seconds: Math.round(this.totalIdleMs / 1000),
                scroll_jump_count: this.jumpCount
            });
        } catch (error) {
            console.error('[ReadingTracker] Heartbeat failed:', error);
        }
    }
    
    /**
     * End tracking session
     */
    async end() {
        // Stop heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Stop idle timer
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
        
        // Remove visibility listener
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Record final active time
        this.recordActiveTime();
        
        if (!this.sessionId) {
            console.log('[ReadingTracker] No session to end');
            return null;
        }
        
        try {
            const response = await this.api.post('/api/reading/end', {
                session_id: this.sessionId,
                max_sentence_reached: this.maxSentenceReached,
                total_active_seconds: Math.round(this.totalActiveMs / 1000),
                total_idle_seconds: Math.round(this.totalIdleMs / 1000),
                scroll_jump_count: this.jumpCount
            });
            
            console.log('[ReadingTracker] Session ended:', response);
            return response;
        } catch (error) {
            console.error('[ReadingTracker] Failed to end session:', error);
            return null;
        }
    }
    
    /**
     * Get current stats (for debugging)
     */
    getStats() {
        return {
            sessionId: this.sessionId,
            maxSentenceReached: this.maxSentenceReached,
            totalActiveSeconds: Math.round(this.totalActiveMs / 1000),
            totalIdleSeconds: Math.round(this.totalIdleMs / 1000),
            jumpCount: this.jumpCount,
            wordClickCount: this.wordClickCount
        };
    }
}
