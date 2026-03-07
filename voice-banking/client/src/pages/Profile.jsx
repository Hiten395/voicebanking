import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { IoLogOutOutline, IoLanguageOutline, IoPersonCircleOutline } from 'react-icons/io5';
import './Profile.css';

const Profile = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
  ];

  return (
    <div className="page profile-page">
      <div className="profile-header animate-fade-in-up">
        <IoPersonCircleOutline size={80} className="profile-avatar" />
        <h1 className="profile-name">{user?.name || 'User'}</h1>
        <p className="profile-phone">{user?.phone}</p>
      </div>

      <div className="profile-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="profile-section-title">
          <IoLanguageOutline size={20} /> {t('language')}
        </h2>
        <div className="language-options">
          {languages.map((l) => (
            <button
              key={l.code}
              className={`language-option ${language === l.code ? 'active' : ''}`}
              onClick={() => setLanguage(l.code)}
              aria-pressed={language === l.code}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn logout-btn animate-fade-in-up"
        style={{ animationDelay: '0.2s' }}
        onClick={handleLogout}
      >
        <IoLogOutOutline size={20} /> {t('logout')}
      </button>
    </div>
  );
};

export default Profile;
