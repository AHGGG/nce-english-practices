class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.index = 0;
    }

    process(inputs) {
        const input = inputs[0];

        if (input && input.length > 0) {
            const channelData = input[0];

            // Passthrough for monitoring (optional)
            // output[0].set(channelData);

            // Buffer logic for sending to main thread
            for (let i = 0; i < channelData.length; i++) {
                this.buffer[this.index++] = channelData[i];
                if (this.index >= this.bufferSize) {
                    this.port.postMessage(this.buffer); // Send full buffer
                    this.index = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
