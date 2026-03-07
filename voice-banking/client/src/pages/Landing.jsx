import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { IoMicOutline, IoShieldCheckmarkOutline, IoLanguageOutline } from 'react-icons/io5';
import './Landing.css';

const Landing = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
  ];

  return (
    <div className="landing-page">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Background Effects */}
      <div className="landing-bg-effects" aria-hidden="true">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
        <div className="glow glow-3"></div>
      </div>

      <main id="main-content" className="landing-content">
        {/* Language Selector */}
        <div className="lang-selector" role="group" aria-label="Language selection">
          <IoLanguageOutline className="lang-icon" />
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`lang-btn ${language === l.code ? 'active' : ''}`}
              aria-label={`Switch to ${l.label}`}
              aria-pressed={language === l.code}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Hero */}
        <div className="landing-hero">
          <div className="landing-logo" aria-hidden="true">
            <div className="logo-circle">
              <IoMicOutline size={48} />
            </div>
          </div>

          <h1 className="landing-title">{t('appName')}</h1>
          <p className="landing-tagline">{t('tagline')}</p>
        </div>

        {/* Features */}
        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'var(--accent-yellow-glow)' }}>
              <IoMicOutline size={24} color="var(--accent-yellow)" />
            </div>
            <div>
              <h3>Voice First</h3>
              <p>Just speak to bank</p>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'var(--accent-green-glow)' }}>
              <IoShieldCheckmarkOutline size={24} color="var(--accent-green)" />
            </div>
            <div>
              <h3>Secure</h3>
              <p>PIN, OTP & voice auth</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/auth')}
          className="btn btn-primary btn-block landing-cta"
          aria-label={t('startBanking')}
        >
          {t('startBanking')}
        </button>
      </main>
    </div>
  );
};

export default Landing;
