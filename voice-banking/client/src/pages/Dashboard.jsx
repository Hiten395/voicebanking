import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { IoMicOutline, IoReceiptOutline, IoSwapHorizontalOutline, IoStatsChartOutline, IoChevronForward } from 'react-icons/io5';
import api from '../utils/api';
import './Dashboard.css';

const CARD_COLORS = {
  savings: 'savings-card',
  current: 'current-card',
  pension: 'pension-card',
};

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, txRes] = await Promise.all([
          api.get('/user/profile'),
          api.get('/user/transactions?limit=3')
        ]);
        setProfile(profileRes.data.user);
        setTransactions(txRes.data.transactions);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = t('goodMorning');
    if (hour >= 12 && hour < 17) greeting = t('goodAfternoon');
    else if (hour >= 17) greeting = t('goodEvening');
    return `${greeting}, ${profile?.name?.split(' ')[0] || user?.name?.split(' ')[0] || ''} 👋`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const quickActions = [
    { label: t('voiceQuery'), icon: IoMicOutline, color: 'var(--accent-yellow)', path: '/voice' },
    { label: t('transactions'), icon: IoReceiptOutline, color: 'var(--accent-blue)', path: '/transactions' },
    { label: t('transfer'), icon: IoSwapHorizontalOutline, color: 'var(--accent-green)', path: '/transfer' },
    { label: t('spending'), icon: IoStatsChartOutline, color: 'var(--accent-purple)', path: '/voice' },
  ];

  if (loading) {
    return (
      <div className="page flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-lg spinner"></div>
      </div>
    );
  }

  const accounts = profile?.accounts || [];

  return (
    <div className="page dashboard-page">
      {/* Greeting */}
      <h1 className="dashboard-greeting animate-fade-in-up" aria-live="polite">
        {getGreeting()}
      </h1>

      {/* Balance Cards — dynamically rendered */}
      <div className="balance-cards">
        {accounts.map((account, index) => (
          <div
            key={account.number}
            className={`balance-card ${CARD_COLORS[account.type] || 'savings-card'} animate-fade-in-up`}
            style={{ animationDelay: `${0.1 + index * 0.1}s` }}
          >
            <span className="balance-label">{t(account.type)}</span>
            <span className="balance-account">{account.number}</span>
            <span className="balance-amount">{formatCurrency(account.balance)}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="quick-action-btn"
            onClick={() => navigate(action.path)}
            aria-label={action.label}
          >
            <div className="quick-action-icon" style={{ background: `${action.color}20`, color: action.color }}>
              <action.icon size={24} />
            </div>
            <span className="quick-action-label">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="recent-activity animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="section-header">
          <h2>{t('recentActivity')}</h2>
          <button className="btn btn-ghost" onClick={() => navigate('/transactions')} style={{ fontSize: 'var(--font-sm)' }}>
            {t('viewAll')} <IoChevronForward />
          </button>
        </div>
        <div className="transaction-list">
          {transactions.map((tx) => (
            <div key={tx._id} className="transaction-item">
              <div className="tx-indicator" style={{
                background: tx.type === 'credit' ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
                color: tx.type === 'credit' ? 'var(--accent-green)' : 'var(--accent-red)'
              }}>
                {tx.type === 'credit' ? '↓' : '↑'}
              </div>
              <div className="tx-details">
                <span className="tx-merchant">{tx.merchant}</span>
                <span className="tx-category">{tx.category}{tx.description ? ` • ${tx.description}` : ''}</span>
              </div>
              <div className="tx-amount-col">
                <span className={`tx-amount ${tx.type}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
                <span className="tx-date">{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-lg)' }}>
              <p>{t('noTransactionsYet')}</p>
              <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-sm)' }}>{t('makeFirstDeposit')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
