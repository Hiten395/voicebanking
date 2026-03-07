import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import Numpad from './Numpad';
import api from '../../utils/api';

const LoginPIN = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(null);

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    if (phone.length === 10) {
      setPhoneSubmitted(true);
      setError('');
    }
  };

  const handlePinComplete = async (pinValue) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/pin', { phone, pin: pinValue });
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
      {!phoneSubmitted ? (
        <form onSubmit={handlePhoneSubmit}>
          <div className="input-group mb-lg">
            <label htmlFor="pin-phone">{t('phone')}</label>
            <input
              id="pin-phone"
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
          <button type="button" className="btn btn-ghost btn-block mt-lg" onClick={() => { setPhoneSubmitted(false); setPin(''); setError(''); setAttempts(null); }}>
            Change number
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPIN;
