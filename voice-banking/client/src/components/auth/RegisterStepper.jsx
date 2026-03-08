import { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import OTPInput from './OTPInput';
import Numpad from './Numpad';
import { IoMicOutline, IoStopCircle, IoCheckmarkCircle, IoWalletOutline, IoBriefcaseOutline, IoCashOutline } from 'react-icons/io5';
import api from '../../utils/api';
import './RegisterStepper.css';

const ACCOUNT_TYPES = [
  { key: 'savings', icon: IoWalletOutline, color: '#22c55e' },
  { key: 'current', icon: IoBriefcaseOutline, color: '#3b82f6' },
  { key: 'pension', icon: IoCashOutline, color: '#a855f7' },
];

const RegisterStepper = () => {
  const { t, language: currentLang } = useLanguage();
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Profile
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState(currentLang);

  // Step 2 — Account Type
  const [accountType, setAccountType] = useState('savings');

  // Step 3 — OTP
  const [otpVerified, setOtpVerified] = useState(false);

  // Step 4 — PIN
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSet, setPinSet] = useState(false);
  const [finalPin, setFinalPin] = useState('');

  // Step 5 — Voice
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [status, setStatus] = useState('');
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  const steps = [
    { num: 1, label: t('profile') },
    { num: 2, label: t('accountType') },
    { num: 3, label: t('otp') },
    { num: 4, label: t('pin') },
    { num: 5, label: t('voice') },
  ];

  // Step 1 — Validate profile + check username, then move to step 2
  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!username || !name || !age || phone.length !== 10) return;
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('Username must be 3-20 characters (letters, numbers, underscore)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/check-username', { username, phone });
      if (!res.data.available) {
        setError(res.data.error || 'Username or phone already taken. Please choose another.');
        setUsernameAvailable(false);
        return;
      }
      setUsernameAvailable(true);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check username');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Account type selected, send OTP and move to step 3
  const handleStep2 = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', {identifier: phone });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — Verify OTP
  const handleVerifyOTP = async (otp) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-otp', { phone, otp });
      setOtpVerified(true);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 4 — Set PIN
  const handlePinSet = (value) => {
    if (!pinSet) {
      setPin(value);
      setPinSet(true);
      setConfirmPin('');
      setError('');
    } else {
      if (value === pin) {
        setFinalPin(value);
        setStep(5);
        setError('');
      } else {
        setError('PINs do not match. Try again.');
        setPinSet(false);
        setPin('');
        setConfirmPin('');
      }
    }
  };

  // Step 5 — Voice recording
  const startRecording = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome.');
      return;
    }

    try {
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
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
      setVoiceTranscript(result[0].transcript);
    };

    recognition.onerror = (event) => {
      const errorMap = {
        'not-allowed': 'Microphone permission denied.',
        'no-speech': 'No speech detected. Please try again and speak clearly.',
        'audio-capture': 'No microphone found.',
        'network': 'Network error. Chrome could not reach Google Speech servers. Please check your internet, disable AdBlockers/VPNs, or ensure you are using standard Chrome.',
        'aborted': 'Recording was cancelled.',
      };
      setError(errorMap[event.error] || 'Voice recognition error: ' + event.error);
      setIsRecording(false);
      setStatus('');
    };

    recognition.onend = () => {
      setIsRecording(false);
      setStatus('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      setError('');
      setVoiceTranscript('');
      setStatus('Listening... speak your passphrase now');
    } catch {
      setError('Failed to start voice recognition. Please try again.');
      setStatus('');
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    setStatus('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Final registration
  const handleRegister = async (passphrase) => {
    const voicePassphrase = passphrase || voiceTranscript;
    if (!voicePassphrase || voicePassphrase.trim().length < 3) {
      setError('Passphrase too short. Please speak a clear sentence.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', {
        username,
        name,
        age: parseInt(age),
        phone,
        language,
        accountType,
        pin: finalPin,
        voicePassphrase: voicePassphrase.trim(),
      });
      login({accessToken: res.data.accessToken,
  user: res.data.user});
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipVoice = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', {
        username,
        name,
        age: parseInt(age),
        phone,
        language,
        accountType,
        pin: finalPin,
      });
      login({accessToken: res.data.accessToken,
  user: res.data.user});
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-stepper animate-fade-in-up">

      <div className="stepper-progress">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`stepper-step ${step >= s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}
          >
            <div className="stepper-circle">
              {step > s.num ? <IoCheckmarkCircle size={20} /> : s.num}
            </div>
            <span className="stepper-label">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="error-msg mt-md mb-md" role="alert">
          {error}
        </p>
      )}

      {/* Step 1 — Profile */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="stepper-form">
          <div className="input-group">
            <label htmlFor="reg-username">{t('username')}</label>
            <input
              id="reg-username"
              type="text"
              className="input"
              value={username}
              onChange={(e) => { setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)); setUsernameAvailable(null); }}
              required
              placeholder="ramesh_kumar"
              autoComplete="username"
              minLength={3}
              maxLength={20}
            />
            {usernameAvailable === false && <span style={{ color: 'var(--accent-red)', fontSize: 'var(--font-xs)' }}>❌ Taken</span>}
            {usernameAvailable === true && <span style={{ color: 'var(--accent-green)', fontSize: 'var(--font-xs)' }}>✅ Available</span>}
          </div>
          <div className="input-group">
            <label htmlFor="reg-name">{t('name')}</label>
            <input
              id="reg-name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ramesh Kumar"
              autoComplete="name"
            />
          </div>
          <div className="input-group">
            <label htmlFor="reg-age">{t('age')}</label>
            <input
              id="reg-age"
              type="number"
              className="input"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
              min="18"
              max="120"
              placeholder="62"
              inputMode="numeric"
            />
          </div>
          <div className="input-group">
            <label htmlFor="reg-phone">{t('phone')}</label>
            <input
              id="reg-phone"
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              inputMode="numeric"
              maxLength={10}
              placeholder="9876543210"
              autoComplete="tel"
            />
          </div>
          <div className="input-group">
            <label htmlFor="reg-lang">{t('language')}</label>
            <select
              id="reg-lang"
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block mt-md"
            disabled={!username || username.length < 3 || !name || !age || phone.length !== 10 || loading}
          >
            {loading ? <span className="spinner" /> : t('next')}
          </button>
        </form>
      )}

      {/* Step 2 — Account Type Selection */}
      {step === 2 && (
        <div className="stepper-form">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
            {t('selectAccountType')}
          </p>
          <div className="account-type-grid">
            {ACCOUNT_TYPES.map((acct) => (
              <button
                key={acct.key}
                type="button"
                className={`account-type-card ${accountType === acct.key ? 'selected' : ''}`}
                onClick={() => setAccountType(acct.key)}
                style={{
                  '--card-accent': acct.color,
                }}
              >
                <div className="account-type-icon" style={{ background: `${acct.color}20`, color: acct.color }}>
                  <acct.icon size={28} />
                </div>
                <span className="account-type-label">{t(acct.key)}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block mt-lg"
            onClick={handleStep2}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : t('next')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-block mt-sm"
            onClick={() => { setStep(1); setError(''); }}
            disabled={loading}
          >
            {t('back')}
          </button>
        </div>
      )}

      {/* Step 3 — OTP */}
      {step === 3 && (
        <div className="stepper-form text-center">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {t('enterOTP')} — sent to +91 {phone}
          </p>
          <OTPInput onComplete={handleVerifyOTP} disabled={loading} />
          {loading && (
            <div className="flex justify-center mt-md">
              <span className="spinner" />
            </div>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-block mt-lg"
            onClick={() => { setStep(2); setError(''); }}
            disabled={loading}
          >
            {t('back')}
          </button>
        </div>
      )}

      {/* Step 4 — PIN */}
      {step === 4 && (
        <div className="stepper-form text-center">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {pinSet ? 'Confirm your PIN' : t('setPin')}
          </p>
          <Numpad
            value={pinSet ? confirmPin : pin}
            onChange={pinSet ? setConfirmPin : setPin}
            maxLength={4}
            onComplete={handlePinSet}
          />
          {loading && (
            <div className="flex justify-center mt-md">
              <span className="spinner" />
            </div>
          )}
        </div>
      )}

      {/* Step 5 — Voice */}
      {step === 5 && (
        <div className="stepper-form text-center">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            {t('speakPassphrase')}
          </p>
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: 'none',
              background: isRecording
                ? 'linear-gradient(135deg, var(--accent-blue), #2563eb)'
                : 'linear-gradient(135deg, var(--accent-yellow), #d97706)',
              color: isRecording ? 'white' : 'var(--text-inverse)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-lg)',
              transition: 'all var(--transition-base)',
              boxShadow: isRecording
                ? 'var(--shadow-glow-blue)'
                : 'var(--shadow-glow-yellow)',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none',
            }}
            aria-label={isRecording ? 'Stop recording' : 'Tap to record voice'}
          >
            {isRecording ? <IoStopCircle size={40} /> : <IoMicOutline size={40} />}
          </button>

          {status && (
            <p style={{ color: 'var(--accent-blue)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }} aria-live="polite">
              {status}
            </p>
          )}

          {voiceTranscript && (
            <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: 'var(--space-md)' }} aria-live="polite">
              "{voiceTranscript}"
            </p>
          )}

          <p
            style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}
            aria-live="polite"
          >
            {isRecording
              ? '🎤 Listening... speak clearly'
              : loading
                ? '⏳ Creating your account...'
                : voiceTranscript
                  ? 'Tap "Register" to complete, or record again'
                  : 'Tap mic and speak your passphrase'}
          </p>

          {voiceTranscript && !isRecording && (
            <button
              type="button"
              className="btn btn-primary btn-block mt-md"
              onClick={() => handleRegister(voiceTranscript)}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Register with Voice'}
            </button>
          )}

          {loading && (
            <div className="flex justify-center mt-md">
              <span className="spinner" />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={handleSkipVoice}
              disabled={loading || isRecording}
            >
              {t('skip')} — Register without voice
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default RegisterStepper;
