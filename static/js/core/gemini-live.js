/**
 * Gemini Live API Client (Proxy Mode)
 * Connects to local backend /ws/voice which proxies to Gemini.
 * Mobile-compatible with fallbacks for older browsers.
 */
export class GeminiLiveClient {
    constructor(url = "") {
        // Construct WS URL from current host
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.wsUrl = url || `${protocol}//${window.location.host}/ws/voice`;
        
        this.ws = null;
        this.audioContext = null;
        this.workletNode = null;
        this.scriptProcessor = null; // Fallback for browsers without AudioWorklet
        this.source = null;
        this.stream = null;
        this.isConnected = false;
        
        // Output Audio Queue - for scheduling playback
        this.nextStartTime = 0;
        this.outputAudioContext = null; // Separate context for playback at 24kHz
        
        // Events
        this.onDisconnect = () => {};
        this.onAudioLevel = (level) => {};
        this.onTranscript = (text, isUser) => {};
        this.onError = (err) => {};
    }

    async connect({ systemInstruction, voiceName = "Puck" }) {
        console.log("Connecting to Voice Proxy:", this.wsUrl);
        
        try {
            // 1. First, initialize audio to ensure we have permission (before WS)
            await this.initAudio();
            
            // 2. Now connect WebSocket and wait for READY signal
            await this.connectWebSocket(systemInstruction, voiceName);
            
            // 3. Start streaming audio after WS is ready
            this.startStreaming();
            
            this.isConnected = true;
            console.log("Voice connection fully established");
            
        } catch (err) {
            console.error("Connection failed:", err);
            this.onError(err);
            this.disconnect();
            throw err;
        }
    }
    
    async initAudio() {
        // Check if we're in a secure context (HTTPS required for mic on mobile)
        if (!window.isSecureContext) {
            throw new Error("Voice requires HTTPS on mobile. Please use HTTPS or access from localhost.");
        }
        
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Your browser doesn't support microphone access. Please use a modern browser.");
        }
        
        // Create AudioContext for INPUT (16kHz for Gemini)
        // Note: Mobile browsers may not support custom sample rates
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ 
                sampleRate: 16000 
            });
        } catch (e) {
            // Fallback: use default sample rate
            console.warn("16kHz not supported, using default sample rate");
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume if suspended (required by browsers for user gesture)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        // Create separate AudioContext for OUTPUT (24kHz from Gemini)
        try {
            this.outputAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.outputAudioContext.state === 'suspended') {
                await this.outputAudioContext.resume();
            }
        } catch (e) {
            // Use same context for output
            this.outputAudioContext = this.audioContext;
        }
        
        // Get microphone permission
        this.stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log("Audio initialized, sample rate:", this.audioContext.sampleRate);
    }

    connectWebSocket(systemInstruction, voiceName) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            
            // Create a secondary promise for the "server_ready" signal
            this._readyResolver = null;
            this._readyPromise = new Promise((res) => { this._readyResolver = res; });
            
            const timeout = setTimeout(() => {
                reject(new Error("WebSocket connection timeout"));
            }, 10000);
            
            this.ws.onopen = () => {
                console.log("Proxy WS Connected, sending Handshake...");
                // Handshake with backend
                this.ws.send(JSON.stringify({
                    voiceName: voiceName,
                    systemInstruction: systemInstruction
                }));
            };

            this.ws.onmessage = async (event) => {
                const msg = await this.handleMessage(event.data);
                if (msg && msg.type === 'server_ready') {
                    console.log("Server Ready Signal Received");
                    clearTimeout(timeout);
                    resolve(); // Resolve the main connection promise now
                }
            };

            this.ws.onerror = (err) => {
                clearTimeout(timeout);
                console.error("Proxy WS Error", err);
                reject(err);
            };

            this.ws.onclose = () => {
                console.log("Proxy WS Closed");
                if (this.isConnected) {
                    this.disconnect();
                }
            };
        });
    }
    
    async startStreaming() {
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        
        // Try AudioWorklet first (better performance, lower latency)
        if (this.audioContext.audioWorklet) {
            try {
                await this.audioContext.audioWorklet.addModule('/static/js/core/audio-worklet.js');
                this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
                
                this.workletNode.port.onmessage = (event) => {
                    this.processAudioData(event.data);
                };
                
                this.source.connect(this.workletNode);
                console.log("Using AudioWorklet for recording");
                return;
            } catch (e) {
                console.warn("AudioWorklet failed, using ScriptProcessor fallback:", e);
            }
        }
        
        // Fallback: ScriptProcessorNode (deprecated but widely supported)
        const bufferSize = 4096;
        this.scriptProcessor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        
        this.scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            // Clone the data since it's a view that gets recycled
            this.processAudioData(new Float32Array(inputData));
        };
        
        this.source.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);
        console.log("Using ScriptProcessor fallback for recording");
    }
    
    processAudioData(float32Data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        // Resample if needed (if AudioContext sample rate != 16000)
        let processedData = float32Data;
        if (this.audioContext.sampleRate !== 16000) {
            processedData = this.resample(float32Data, this.audioContext.sampleRate, 16000);
        }
        
        // Convert Float32 to Int16 PCM
        const int16Array = new Int16Array(processedData.length);
        for (let i = 0; i < processedData.length; i++) {
            let s = Math.max(-1, Math.min(1, processedData[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to Base64
        const bytes = new Uint8Array(int16Array.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        // Send to backend
        this.ws.send(JSON.stringify({
            type: 'audio',
            data: base64
        }));
        
        // Calculate audio level for visualization
        let sum = 0;
        for (let i = 0; i < float32Data.length; i += 50) {
            sum += Math.abs(float32Data[i]);
        }
        const avg = sum / (float32Data.length / 50);
        this.onAudioLevel(avg);
    }
    
    resample(data, fromRate, toRate) {
        if (fromRate === toRate) return data;
        
        const ratio = fromRate / toRate;
        const newLength = Math.round(data.length / ratio);
        const result = new Float32Array(newLength);
        
        for (let i = 0; i < newLength; i++) {
            const pos = i * ratio;
            const index = Math.floor(pos);
            const frac = pos - index;
            
            if (index + 1 < data.length) {
                result[i] = data[index] * (1 - frac) + data[index + 1] * frac;
            } else {
                result[i] = data[index];
            }
        }
        
        return result;
    }

    async handleMessage(data) {
        let msg;
        try {
            msg = JSON.parse(data);
        } catch(e) { 
            console.error("Parse Error", e); 
            return null; 
        }

        if (msg.type === 'server_ready') {
            return msg;
        } else if (msg.type === 'audio') {
            this.playAudioResponse(msg.data);
        } else if (msg.type === 'transcript') {
            console.log("Transcript:", msg.text);
            this.onTranscript(msg.text, msg.isUser);
        } else if (msg.type === 'interrupted') {
            console.log("Interrupted by VAD");
            this.clearAudioQueue();
        } else if (msg.type === 'turnComplete') {
            // Turn complete
        }
        return msg;
    }
    
    playAudioResponse(base64Data) {
        const ctx = this.outputAudioContext;
        if (!ctx) return;

        try {
            // Decode Base64 -> bytes -> Int16 -> Float32
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
                float32[i] = int16[i] / 32768.0;
            }
            
            // Create audio buffer at 24kHz (Gemini output rate)
            const buffer = ctx.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            
            // Schedule playback to avoid gaps
            const currentTime = ctx.currentTime;
            const startTime = Math.max(currentTime, this.nextStartTime);
            
            source.start(startTime);
            this.nextStartTime = startTime + buffer.duration;
            
        } catch (e) {
            console.error("Audio playback error:", e);
        }
    }
    
    clearAudioQueue() {
        this.nextStartTime = this.outputAudioContext ? this.outputAudioContext.currentTime : 0;
    }

    disconnect() {
        this.isConnected = false;
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }
        
        if (this.scriptProcessor) {
            this.scriptProcessor.disconnect();
            this.scriptProcessor = null;
        }
        
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // Close audio contexts
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close().catch(() => {});
        }
        if (this.outputAudioContext && this.outputAudioContext !== this.audioContext && this.outputAudioContext.state !== 'closed') {
            this.outputAudioContext.close().catch(() => {});
        }
        
        this.onDisconnect();
    }
}
