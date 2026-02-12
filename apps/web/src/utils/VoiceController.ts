interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResult[];
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export class VoiceController {
  private recognition: SpeechRecognitionLike | null = null;
  private onTranscript: (text: string) => void;
  private onStateChange: (isListening: boolean) => void;
  private isListening = false;

  constructor(
    onTranscript: (text: string) => void,
    onStateChange: (isListening: boolean) => void,
  ) {
    this.onTranscript = onTranscript;
    this.onStateChange = onStateChange;

    const maybeWindow = window as Window & {
      webkitSpeechRecognition?: SpeechRecognitionCtor;
      SpeechRecognition?: SpeechRecognitionCtor;
    };

    const SpeechRecognitionCtor =
      maybeWindow.SpeechRecognition || maybeWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      console.warn("Speech Recognition API not supported");
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChange(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChange(false);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        this.onTranscript(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech Recognition Error", event.error);
      this.isListening = false;
      this.onStateChange(false);
    };
  }

  start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error("Failed to start", error);
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  async playAudioBlob(blob: Blob) {
    return new Promise<void>((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        resolve();
        URL.revokeObjectURL(url);
      };

      audio.play().catch((error) => {
        console.error("Audio Playback Error", error);
        resolve();
      });
    });
  }
}
