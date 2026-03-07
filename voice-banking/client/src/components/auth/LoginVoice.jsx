import { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { IoMicOutline, IoStopCircle } from 'react-icons/io5';
import api from '../../utils/api';

const LoginVoice = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const streamRef = useRef(null);

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.length === 10) {
      setPhoneSubmitted(true);
      setError('');
    }
  };

  const startRecording = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome.');
      return;
    }

    // Request microphone permission first
    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permission and try again.');
      setStatus('');
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
        handleVoiceLogin(result[0].transcript);
      }
    };

    recognition.onerror = (event) => {
      const errorMap = {
        'not-allowed': 'Microphone permission denied. Please enable it in browser settings.',
        'no-speech': 'No speech detected. Please try again and speak clearly.',
        'audio-capture': 'No microphone found. Please connect a microphone.',
        'network': 'Network error. Chrome could not reach Google Speech servers. Please check your internet, disable AdBlockers/VPNs, or ensure you are using standard Chrome.',
        'aborted': 'Recording was cancelled.',
      };
      setError(errorMap[event.error] || 'Voice recognition error: ' + event.error);
      setIsRecording(false);
      isRecordingRef.current = false;
      setStatus('');
    };

    recognition.onend = () => {
      setIsRecording(false);
      isRecordingRef.current = false;
      setStatus('');
      // Stop the mic stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setError('');
      setTranscript('');
      setStatus('Listening... speak your passphrase now');
    } catch (err) {
      setError('Failed to start voice recognition. Please try again.');
      setStatus('');
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    isRecordingRef.current = false;
    setStatus('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleVoiceLogin = async (passphrase) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/voice', { phone, voicePassphrase: passphrase });
      login(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Voice login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form animate-fade-in-up">
      {!phoneSubmitted ? (
        <form onSubmit={handlePhoneSubmit}>
          <div className="input-group mb-lg">
            <label htmlFor="voice-phone">{t('phone')}</label>
            <input
              id="voice-phone"
              type="tel"
              className="input"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={phone.length !== 10}>
            {t('next')}
          </button>
        </form>
      ) : (
        <div className="text-center">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {t('speakPassphrase')}
          </p>

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            className="voice-login-mic"
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: 'none',
              background: isRecording
                ? 'linear-gradient(135deg, var(--accent-blue), #2563eb)'
                : 'linear-gradient(135deg, var(--accent-yellow), #d97706)',
              color: isRecording ? 'white' : 'var(--text-inverse)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-lg)',
              transition: 'all var(--transition-base)',
              boxShadow: isRecording ? 'var(--shadow-glow-blue)' : 'var(--shadow-glow-yellow)',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none',
            }}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <IoStopCircle size={40} /> : <IoMicOutline size={40} />}
          </button>

          {status && (
            <p style={{ color: 'var(--accent-blue)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }} aria-live="polite">
              {status}
            </p>
          )}

          {transcript && (
            <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: 'var(--space-md)' }} aria-live="polite">
              "{transcript}"
            </p>
          )}

          {error && <p className="error-msg" role="alert">{error}</p>}
          {loading && <div className="flex justify-center mt-md"><span className="spinner" /></div>}

          <button type="button" className="btn btn-ghost btn-block mt-lg" onClick={() => { setPhoneSubmitted(false); setError(''); setTranscript(''); }}>
            Change number
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginVoice;