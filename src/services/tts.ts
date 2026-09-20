/**
 * Text-to-Speech service using Web Speech API
 * Provides clear pronunciation for English prompts and French responses.
 */

let speechSynth: SpeechSynthesis | null = null;
let voices: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;
let globalSpeechRate = 0.9;

export function setTtsSpeechRate(rate: number): void {
  if (rate >= 0.5 && rate <= 1.5) {
    globalSpeechRate = rate;
  }
}

export function getTtsSpeechRate(): number {
  return globalSpeechRate;
}

function initSynth() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynth = window.speechSynthesis;
    
    const loadVoices = () => {
      voices = speechSynth?.getVoices() || [];
      voicesLoaded = voices.length > 0;
    };

    loadVoices();
    if (speechSynth.onvoiceschanged !== undefined) {
      speechSynth.onvoiceschanged = loadVoices;
    }
  }
}

initSynth();

export function isTtsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakFrench(
  text: string,
  onEnd?: () => void,
  onError?: () => void
): void {
  if (!isTtsAvailable() || !text) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[\/\[\]\(\)]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = globalSpeechRate;
    utterance.pitch = 1.0;

    const allVoices = window.speechSynthesis.getVoices();
    // Prefer native high-quality French voice
    const frenchVoice =
      allVoices.find((v) => v.lang === 'fr-FR' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Thomas') || v.name.includes('Amelie') || v.name.includes('Audrey'))) ||
      allVoices.find((v) => v.lang.startsWith('fr')) ||
      null;

    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    if (onEnd) {
      utterance.onend = () => onEnd();
    }
    if (onError) {
      utterance.onerror = () => onError();
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    onEnd?.();
  }
}

export function speakEnglish(
  text: string,
  onEnd?: () => void,
  onError?: () => void
): void {
  if (!isTtsAvailable() || !text) {
    onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[\/\[\]\(\)]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const allVoices = window.speechSynthesis.getVoices();
    const englishVoice =
      allVoices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
      allVoices.find((v) => v.lang.startsWith('en')) ||
      null;

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    if (onEnd) {
      utterance.onend = () => onEnd();
    }
    if (onError) {
      utterance.onerror = () => onError();
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    onEnd?.();
  }
}
