import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Numpad from './Numpad';
import api from '../../utils/api';

const LoginPIN = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [identifierSubmitted, setIdentifierSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(null);

  const handleIdentifierSubmit = (e) => {
    e.preventDefault();
    if (identifier.length >= 3) {
      setIdentifierSubmitted(true);
      setError('');
    }
  };

  const handlePinComplete = async (pinValue) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/pin', { identifier, pin: pinValue });
      login(res.data);
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || 'Login failed');
      if (data?.attemptsUsed) {
        setAttempts({ used: data.attemptsUsed, max: data.maxAttempts });
      }
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form animate-fade-in-up">
      {!identifierSubmitted ? (
        <form onSubmit={handleIdentifierSubmit}>
          <div className="input-group mb-lg">
            <label htmlFor="pin-identifier">{t('phoneOrUsername') || 'Phone or Username'}</label>
            <input
              id="pin-identifier"
              type="text"
              className="input"
              placeholder="e.g. 9876543210 or ramesh_kumar"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              autoComplete="username"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={identifier.length < 3}>
            {t('next')}
          </button>
        </form>
      ) : (
        <div>
          <p className="text-center" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            {t('enterPIN')}
          </p>
          {attempts && (
            <p className="text-center" style={{ color: 'var(--accent-red)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-lg)' }} role="alert">
              {attempts.used} {t('of')} {attempts.max} {t('attemptsUsed')}
            </p>
          )}
          {error && <p className="error-msg text-center mb-md" role="alert">{error}</p>}
          <Numpad value={pin} onChange={setPin} maxLength={4} onComplete={handlePinComplete} />
          {loading && <div className="flex justify-center mt-md"><span className="spinner" /></div>}
          <button type="button" className="btn btn-ghost btn-block mt-lg" onClick={() => { setIdentifierSubmitted(false); setPin(''); setError(''); setAttempts(null); }}>
            Change Login
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPIN;
