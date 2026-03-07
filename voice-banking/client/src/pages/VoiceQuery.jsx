import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { IoVolumeHighOutline } from 'react-icons/io5';
import './VoiceQuery.css';

const VoiceQuery = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [micState, setMicState] = useState('idle'); // idle | recording | processing
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const suggestedChips = [
    t('whatIsMyBalance'),
    t('showTransactions'),
    t('howMuchSpent'),
    t('pensionStatus'),
  ];

  const speakResponse = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleQuery = async (text) => {
    setMicState('processing');
    setError('');
    try {
      const res = await api.post('/voice/query', { text });
      setResponse(res.data);
      speakResponse(res.data.response);
    } catch (err) {
      setError(err.response?.data?.message || 'Query failed. Please try again.');
    } finally {
      setMicState('idle');
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      setTranscript(result[0].transcript);
      if (result.isFinal) {
        handleQuery(result[0].transcript);
      }
    };

    recognition.onerror = (event) => {
      setError('Voice error: ' + event.error);
      setMicState('idle');
    };

    recognition.onend = () => {
      if (micState === 'recording') {
        setMicState('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setMicState('recording');
    setTranscript('');
    setResponse(null);
    setError('');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
  };

  const handleChipClick = (query) => {
    setTranscript(query);
    handleQuery(query);
  };

  const handleMicClick = () => {
    if (micState === 'idle') startRecording();
    else if (micState === 'recording') stopRecording();
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getMicLabel = () => {
    if (micState === 'recording') return t('listening');
    if (micState === 'processing') return t('thinking');
    return t('tapToSpeak');
  };

  return (
    <div className="page voice-page">
      <h1 className="sr-only">Voice Banking</h1>

      {/* Suggested Chips */}
      <div className="voice-chips animate-fade-in-up">
        <p className="chips-label">{t('suggestedQueries')}</p>
        <div className="chips-grid">
          {suggestedChips.map((chip) => (
            <button
              key={chip}
              className="chip-btn"
              onClick={() => handleChipClick(chip)}
              disabled={micState === 'processing'}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Mic Button */}
      <div className="mic-section">
        <button
          className={`mic-button ${micState}`}
          onClick={handleMicClick}
          disabled={micState === 'processing'}
          aria-label={getMicLabel()}
        >
          {micState === 'processing' ? (
            <div className="spinner-lg spinner" style={{ borderTopColor: 'white' }}></div>
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          )}
          {micState === 'recording' && (
            <>
              <div className="mic-ripple r1" aria-hidden="true"></div>
              <div className="mic-ripple r2" aria-hidden="true"></div>
              <div className="mic-ripple r3" aria-hidden="true"></div>
            </>
          )}
        </button>
        <p className="mic-label" aria-live="polite">{getMicLabel()}</p>
      </div>

      {/* Live Transcript */}
      {transcript && (
        <div className="transcript-area animate-fade-in" aria-live="polite">
          <p className="transcript-text">"{transcript}"</p>
        </div>
      )}

      {/* Error */}
      {error && <p className="error-msg mt-md" role="alert">{error}</p>}

      {/* Response Card */}
      {response && (
        <div className="response-card animate-slide-up" role="region" aria-label="AI response">
          <p className="response-text">{response.response}</p>
          <button
            className="btn btn-secondary replay-btn"
            onClick={() => speakResponse(response.response)}
            aria-label="Replay response"
          >
            <IoVolumeHighOutline size={18} /> {t('replay')}
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceQuery;
