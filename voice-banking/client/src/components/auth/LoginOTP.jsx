import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import OTPInput from './OTPInput';
import api from '../../utils/api';

const LoginOTP = () => {
  const { t } = useLanguage();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!identifier || identifier.length < 3) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/send-otp', { identifier });
      // We can also let the user know where the OTP was sent if the endpoint returns masked phone
      if (res.data.phone) {
        // Just store the actual phone or a flag if we want
      }
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
      const res = await api.post('/auth/login/otp', { identifier, otp });
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
            <label htmlFor="otp-identifier">{t('phoneOrUsername') || 'Phone or Username'}</label>
            <input
              id="otp-identifier"
              type="text"
              className="input"
              placeholder="e.g. 9876543210 or ramesh_kumar"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              autoComplete="username"
              aria-describedby="identifier-hint"
              required
            />
            <span id="identifier-hint" className="sr-only">Enter your 10-digit mobile number or username</span>
          </div>
          {error && <p className="error-msg" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={identifier.length < 3 || loading}>
            {loading ? <span className="spinner" /> : t('sendOTP')}
          </button>
        </form>
      ) : (
        <div>
          <p className="text-center" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            OTP sent to registered phone
          </p>
          <OTPInput onComplete={handleVerifyOTP} disabled={loading} />
          {error && <p className="error-msg mt-md" role="alert">{error}</p>}
          {loading && <div className="flex justify-center mt-md"><span className="spinner" /></div>}
          <button type="button" className="btn btn-ghost btn-block mt-lg" onClick={() => { setOtpSent(false); setError(''); }}>
            Change Login
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginOTP;
