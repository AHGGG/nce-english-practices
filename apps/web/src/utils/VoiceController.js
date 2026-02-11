export class VoiceController {
    constructor(onTranscript, onStateChange) {
      this.recognition = null;
      this.onTranscript = onTranscript; // Callback for final text
      this.onStateChange = onStateChange; // Callback for listening state
      this.isListening = false;
  
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false; // Turn-based
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
  
        this.recognition.onstart = () => {
          this.isListening = true;
          this.onStateChange(true);
        };
  
        this.recognition.onend = () => {
          this.isListening = false;
          this.onStateChange(false);
        };
  
        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            this.onTranscript(transcript);
          }
        };
  
        this.recognition.onerror = (event) => {
          console.error("Speech Recognition Error", event.error);
          this.isListening = false;
          this.onStateChange(false);
        };
      } else {
        console.warn("Speech Recognition API not supported");
      }
    }
  
    start() {
      if (this.recognition && !this.isListening) {
        try {
          this.recognition.start();
        } catch (e) {
          console.error("Failed to start", e);
        }
      }
    }
  
    stop() {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
      }
    }
  
    async playAudioBlob(blob) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          resolve();
          URL.revokeObjectURL(url);
        };
        audio.play().catch(e => {
            console.error("Audio Playback Error", e);
            resolve();
        });
      });
    }
  }
