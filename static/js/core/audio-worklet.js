class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048;
        this.buffer = new Int16Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];

            // Downsample and convert Float32 to Int16 (PCM)
            // Input is usually 44.1kHz or 48kHz. We want to stream it.
            // For simplicity, we just send chunks. The main thread will resample if needed 
            // OR we rely on Gemini managing standard rates.
            // Gemini Multimodal Live prefers 16kHz or 24kHz.
            // However, doing high-quality resampling in Worklet is complex without a library.
            // We'll pass raw float data to Main Thread, and Main Thread can use an OfflineAudioContext 
            // or simple linear interpolation to downsample before sending.
            
            // Actually, sending Float32 to main thread is fine for low volume.
            // Let's keep it simple: Just pass the float32 buffer to the main thread.
            
            this.port.postMessage(channelData);
        }
        return true;
    }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
