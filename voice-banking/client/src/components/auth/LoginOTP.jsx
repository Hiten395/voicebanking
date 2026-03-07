import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import OTPInput from './OTPInput';
import api from '../../utils/api';

const LoginOTP = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { phone });
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otp) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/otp', { phone, otp });
      login(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form animate-fade-in-up">
      {!otpSent ? (
        <form onSubmit={handleSendOTP}>
          <div className="input-group mb-lg">
            <label htmlFor="otp-phone">{t('phone')}</label>
            <input
              id="otp-phone"
              type="tel"
              className="input"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              aria-describedby="phone-hint"
              required
            />
            <span id="phone-hint" className="sr-only">Enter your 10-digit Indian mobile number</span>
          </div>
          {error && <p className="error-msg" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={phone.length !== 10 || loading}>
            {loading ? <span className="spinner" /> : t('sendOTP')}
          </button>
        </form>
      ) : (
        <div>
          <p className="text-center" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            OTP sent to {phone}
          </p>
          <OTPInput onComplete={handleVerifyOTP} disabled={loading} />
          {error && <p className="error-msg mt-md" role="alert">{error}</p>}
          {loading && <div className="flex justify-center mt-md"><span className="spinner" /></div>}
          <button type="button" className="btn btn-ghost btn-block mt-lg" onClick={() => { setOtpSent(false); setError(''); }}>
            Change number
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginOTP;
