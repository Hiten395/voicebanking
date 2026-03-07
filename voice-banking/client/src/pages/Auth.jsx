import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LoginOTP from '../components/auth/LoginOtp';
import LoginPIN from '../components/auth/LoginPIN';
import LoginVoice from '../components/auth/LoginVoice';
import RegisterStepper from '../components/auth/RegisterStepper';
import './Auth.css';

const Auth = () => {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [mainTab, setMainTab] = useState('login');
  const [loginMethod, setLoginMethod] = useState('otp');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="auth-title">{t('appName')}</h1>
        </div>

        {/* Main Tabs: Login | Create Account */}
        <div className="tabs mb-lg" role="tablist" aria-label="Authentication method">
          <button
            className={`tab ${mainTab === 'login' ? 'active' : ''}`}
            onClick={() => setMainTab('login')}
            role="tab"
            aria-selected={mainTab === 'login'}
            id="tab-login"
          >
            {t('login')}
          </button>
          <button
            className={`tab ${mainTab === 'register' ? 'active' : ''}`}
            onClick={() => setMainTab('register')}
            role="tab"
            aria-selected={mainTab === 'register'}
            id="tab-register"
          >
            {t('createAccount')}
          </button>
        </div>

        {mainTab === 'login' && (
          <>
            {/* Login Sub-tabs */}
            <div className="login-methods mb-lg" role="tablist" aria-label="Login method">
              {['otp', 'pin', 'voice'].map((method) => (
                <button
                  key={method}
                  className={`pill ${loginMethod === method ? 'active' : ''}`}
                  onClick={() => setLoginMethod(method)}
                  role="tab"
                  aria-selected={loginMethod === method}
                >
                  {t(method)}
                </button>
              ))}
            </div>

            {loginMethod === 'otp' && <LoginOTP />}
            {loginMethod === 'pin' && <LoginPIN />}
            {loginMethod === 'voice' && <LoginVoice />}
          </>
        )}

        {mainTab === 'register' && <RegisterStepper />}
      </div>
    </div>
  );
};

export default Auth;
