import { NavLink } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { IoHomeOutline, IoHome, IoMicOutline, IoMic, IoReceiptOutline, IoReceipt, IoPersonOutline, IoPerson } from 'react-icons/io5';
import './BottomNav.css';

const BottomNav = () => {
  const { t } = useLanguage();

  const navItems = [
    { path: '/dashboard', label: t('home'), Icon: IoHomeOutline, ActiveIcon: IoHome },
    { path: '/voice', label: t('voiceQuery'), Icon: IoMicOutline, ActiveIcon: IoMic },
    { path: '/transactions', label: t('transactions'), Icon: IoReceiptOutline, ActiveIcon: IoReceipt },
    { path: '/profile', label: t('profile'), Icon: IoPersonOutline, ActiveIcon: IoPerson },
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {navItems.map(({ path, label, Icon, ActiveIcon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              {isActive ? <ActiveIcon className="bottom-nav-icon" /> : <Icon className="bottom-nav-icon" />}
              <span className="bottom-nav-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
