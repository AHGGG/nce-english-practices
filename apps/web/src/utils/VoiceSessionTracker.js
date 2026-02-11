/**
 * VoiceSessionTracker - Tracks voice learning sessions
 * 
 * Signals tracked:
 * - Time: active vs idle time
 * - Interactions:
 *   - word_lookup (HUH?)
 *   - got_it (Got it)
 *   - example_navigation (Arrow keys/buttons)
 *   - audio_play (Replay)
 * 
 * Usage:
 * const tracker = new VoiceSessionTracker(api);
 * await tracker.start({ sourceType, sourceId });
 * tracker.onWordLookup(word);
 * tracker.onGotIt();
 * tracker.onAudioPlay();
 * tracker.onExampleNav();
 * await tracker.end();
 */

const IDLE_THRESHOLD_MS = 60000;  // 60 seconds = idle (voice mode allows longer pauses)
const HEARTBEAT_INTERVAL_MS = 10000; // Send heartbeat every 10 seconds

export default class VoiceSessionTracker {
    constructor(api) {
        this.api = api;
        this.sessionId = null;
        
        // Time tracking
        this.activeStartTime = Date.now();
        this.totalActiveMs = 0;
        this.isActive = true;
        this.idleTimer = null;
        
        // Interaction tracking
        this.wordLookupCount = 0;
        this.wordsLookedUp = [];
        this.gotItCount = 0;
        this.exampleNavCount = 0;
        this.audioPlayCount = 0;
        
        // Heartbeat
        this.heartbeatInterval = null;
        
        // Visibility tracking
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }
    
    /**
     * Start tracking session
     * @param {Object} sourceInfo - { sourceType, sourceId }
     */
    async start(sourceInfo = {}) {
        try {
            const response = await this.api.post('/api/voice-session/start', {
                source_type: sourceInfo.sourceType,
                source_id: sourceInfo.sourceId
            });
            
            if (response.session_id) {
                this.sessionId = response.session_id;
                
                // Start heartbeat
                this.startHeartbeat();
                
                // Add visibility listener
                document.addEventListener('visibilitychange', this.handleVisibilityChange);
                
                // Start idle timer
                this.resetIdleTimer();
                
                console.log('[VoiceTracker] Session started:', this.sessionId);
            }
            
            return this.sessionId;
        } catch (error) {
            console.error('[VoiceTracker] Failed to start session:', error);
            return null;
        }
    }
    
    /**
     * Called on HUH? click
     */
    onWordLookup(word) {
        this.wordLookupCount++;
        if (word && !this.wordsLookedUp.includes(word)) {
            this.wordsLookedUp.push(word);
        }
        this.onInteraction();
    }
    
    /**
     * Called on Got It click
     */
    onGotIt() {
        this.gotItCount++;
        this.onInteraction();
    }
    
    /**
     * Called on Example navigation (arrows)
     */
    onExampleNav() {
        this.exampleNavCount++;
        this.onInteraction();
    }
    
    /**
     * Called on Audio play/replay
     */
    onAudioPlay() {
        this.audioPlayCount++;
        this.onInteraction();
    }
    
    /**
     * Generic interaction handler
     */
    onInteraction() {
        this.recordActiveTime();
        this.resetIdleTimer();
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
            await this.api.put('/api/voice-session/heartbeat', {
                session_id: this.sessionId,
                total_active_seconds: Math.round(this.totalActiveMs / 1000),
                word_lookup_count: this.wordLookupCount,
                words_looked_up: this.wordsLookedUp,
                got_it_count: this.gotItCount,
                example_navigation_count: this.exampleNavCount,
                audio_play_count: this.audioPlayCount
            });
        } catch (error) {
            console.error('[VoiceTracker] Heartbeat failed:', error);
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
        
        if (!this.sessionId) return null;
        
        try {
            const response = await this.api.post('/api/voice-session/end', {
                session_id: this.sessionId,
                total_active_seconds: Math.round(this.totalActiveMs / 1000)
            });
            
            console.log('[VoiceTracker] Session ended');
            this.sessionId = null; // Prevent further calls
            return response;
        } catch (error) {
            console.error('[VoiceTracker] Failed to end session:', error);
            return null;
        }
    }
}
