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

// Phones report language tags as en_IN or en-in, so compare loosely. On-device
// voices are preferred: network voices fail silently on flaky mobile data.
const normLang = (lang = '') => lang.replace('_', '-').toLowerCase();

// Browsers don't expose a voice's gender, only its name. These are the male
// English voices shipped on Windows/Edge, Chrome, macOS and iOS, so the
// interviewer sounds the same (male) on laptop and phone wherever possible.
const MALE_VOICE = /\b(male|ravi|prabhat|rishi|david|mark|guy|daniel|aaron|arthur|fred|alex|tom|gordon|oliver|james|george|ryan)\b/i;
const isMale = (v) => MALE_VOICE.test(v.name) && !/female/i.test(v.name);

const pickVoice = () => {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => normLang(v.lang).startsWith('en'));
  const local = english.filter((v) => v.localService);
  const pool = local.length ? local : english;
  const male = english.filter(isMale);
  return male.find((v) => normLang(v.lang) === 'en-in')
    || male.find((v) => normLang(v.lang) === 'en-us' || normLang(v.lang) === 'en-gb')
    || male[0]
    || pool.find((v) => normLang(v.lang) === 'en-in')
    || pool.find((v) => normLang(v.lang) === 'en-us')
    || pool[0];
};

const useSpeech = ({ onTranscript, onError } = {}) => {
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const recognitionSupported = Boolean(SpeechRecognition);

  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  // Chrome can garbage-collect an utterance mid-sentence (it just goes quiet)
  // unless something keeps a reference to it.
  const utteranceRef = useRef(null);
  const unlockedRef = useRef(false);
  // Keep the latest callbacks without restarting recognition when they change.
  const callbacksRef = useRef({ onTranscript, onError });
  callbacksRef.current = { onTranscript, onError };

  const stopSpeaking = useCallback(() => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [speechSupported]);

  // iOS Safari (and Android Chrome) only play speech that was first started by a
  // tap. Questions arrive after an API call, outside any tap, so call this from
  // a click handler: a silent utterance there unlocks speech for the page.
  const unlockSpeech = useCallback(() => {
    if (!speechSupported || unlockedRef.current) return;
    const silent = new SpeechSynthesisUtterance(' ');
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
    unlockedRef.current = true;
  }, [speechSupported]);

  const speak = useCallback((text) => {
    if (!speechSupported || !text) return;
    const synth = window.speechSynthesis;

    const start = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || LANG;
      utterance.rate = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      synth.speak(utterance);
      // Android Chrome sometimes leaves the queue paused after a cancel.
      synth.resume();
      unlockedRef.current = true;
    };

    // Calling speak() right after cancel() makes Android Chrome drop the new
    // utterance, so give the cancel a moment to settle first.
    if (synth.speaking || synth.pending) {
      synth.cancel();
      setTimeout(start, 150);
    } else {
      start();
    }
  }, [speechSupported]);

  // Voices load asynchronously on Android/Chrome; asking for them early and
  // listening for the change makes pickVoice find one by the first question.
  useEffect(() => {
    if (!speechSupported) return undefined;
    const synth = window.speechSynthesis;
    synth.getVoices();
    const noop = () => {};
    synth.addEventListener?.('voiceschanged', noop);
    return () => synth.removeEventListener?.('voiceschanged', noop);
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
    unlockSpeech,
    stopSpeaking,
    startListening,
    stopListening,
  };
};

export default useSpeech;
