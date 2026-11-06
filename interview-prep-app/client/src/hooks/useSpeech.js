import { useState, useEffect, useRef, useCallback } from 'react';

// Voice for the mock interview, built on the browser's free Web Speech API:
// speechSynthesis reads questions aloud, and SpeechRecognition turns the
// candidate's spoken answer into text. Recognition only exists in Chromium
// browsers (Chrome, Edge), so callers check the *Supported flags and fall back
// to typing elsewhere.
const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : undefined;

const LANG = 'en-IN';

const pickVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === LANG)
    || voices.find((v) => v.lang === 'en-US')
    || voices.find((v) => v.lang.startsWith('en'));
};

const useSpeech = ({ onTranscript, onError } = {}) => {
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const recognitionSupported = Boolean(SpeechRecognition);

  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  // Keep the latest callbacks without restarting recognition when they change.
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [speechSupported]);

  const speak = useCallback((text) => {
    if (!speechSupported || !text) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || LANG;
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [speechSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // baseText is what is already in the answer box; speech is added after it.
  const startListening = useCallback((baseText = '') => {
    if (!recognitionSupported || recognitionRef.current) return;
    stopSpeaking();

    const recognition = new SpeechRecognition();
    recognition.lang = LANG;
    recognition.continuous = true;
    recognition.interimResults = true;

    const prefix = baseText.trim() ? `${baseText.trim()} ` : '';

    recognition.onresult = (event) => {
      // In continuous mode event.results holds everything said this session,
      // finished phrases plus the one still being spoken.
      let spoken = '';
      for (let i = 0; i < event.results.length; i++) {
        spoken += event.results[i][0].transcript;
      }
      callbacksRef.current.onTranscript?.(prefix + spoken.trim());
    };

    recognition.onerror = (event) => {
      // Silence and manual stops are normal; only report real problems.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone access is blocked. Allow it in your browser to answer by voice.'
        : 'Voice input stopped. Please try again or type your answer.';
      callbacksRef.current.onError?.(message);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [recognitionSupported, stopSpeaking]);

  // Leaving the page should not keep talking or keep the mic open.
  useEffect(() => () => {
    if (speechSupported) window.speechSynthesis.cancel();
    recognitionRef.current?.abort();
  }, [speechSupported]);

  return {
    speechSupported,
    recognitionSupported,
    speaking,
    listening,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  };
};

export default useSpeech;
