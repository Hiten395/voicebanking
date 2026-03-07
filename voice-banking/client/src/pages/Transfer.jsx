import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import { IoSwapHorizontalOutline, IoArrowDownOutline, IoArrowUpOutline, IoCheckmarkCircle } from 'react-icons/io5';
import './Transfer.css';

const Transfer = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('transfer');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState('');

    // Form state
    const [amount, setAmount] = useState('');
    const [fromAccount, setFromAccount] = useState('savings');
    const [toAccount, setToAccount] = useState('pension');
    const [accountType, setAccountType] = useState('savings');
    const [description, setDescription] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/user/profile');
                setProfile(res.data.user);
            } catch (err) {
                console.error('Profile fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(val);
    };

    const resetForm = () => {
        setAmount('');
        setDescription('');
        setError('');
    };

    const refreshProfile = async () => {
        try {
            const res = await api.get('/user/profile');
            setProfile(res.data.user);
        } catch (err) {
            console.error('Profile refresh error:', err);
        }
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(null);
        setSubmitting(true);

        try {
            const res = await api.post('/user/transfer', {
                fromAccount,
                toAccount,
                amount: parseFloat(amount),
                description
            });
            setSuccess({
                message: res.data.message,
                balances: res.data.updatedBalances
            });
            resetForm();
            await refreshProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Transfer failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(null);
        setSubmitting(true);

        try {
            const res = await api.post('/user/deposit', {
                accountType,
                amount: parseFloat(amount),
                description
            });
            setSuccess({
                message: res.data.message,
                balance: res.data.updatedBalance
            });
            resetForm();
            await refreshProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Deposit failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(null);
        setSubmitting(true);

        try {
            const res = await api.post('/user/withdraw', {
                accountType,
                amount: parseFloat(amount),
                description
            });
            setSuccess({
                message: res.data.message,
                balance: res.data.updatedBalance
            });
            resetForm();
            await refreshProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Withdrawal failed');
        } finally {
            setSubmitting(false);
        }
    };

    const tabs = [
        { key: 'transfer', label: t('transfer'), icon: IoSwapHorizontalOutline },
        { key: 'deposit', label: t('deposit'), icon: IoArrowDownOutline },
        { key: 'withdraw', label: t('withdraw'), icon: IoArrowUpOutline },
    ];

    const handleTabChange = (key) => {
        setActiveTab(key);
        setSuccess(null);
        setError('');
        setAmount('');
        setDescription('');
    };

    if (loading) {
        return (
            <div className="page flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <div className="spinner-lg spinner"></div>
            </div>
        );
    }

    const savingsAcc = profile?.accounts?.find(a => a.type === 'savings');
    const pensionAcc = profile?.accounts?.find(a => a.type === 'pension');

    return (
        <div className="page transfer-page">
            <h1 className="page-title">{t('transactions')}</h1>

            {/* Balance Summary */}
            <div className="transfer-balances animate-fade-in-up">
                {savingsAcc && (
                    <div className="mini-balance-card">
                        <span className="mini-balance-label">{t('savings')}</span>
                        <span className="mini-balance-amount">{formatCurrency(savingsAcc.balance)}</span>
                    </div>
                )}
                {pensionAcc && (
                    <div className="mini-balance-card">
                        <span className="mini-balance-label">{t('pension')}</span>
                        <span className="mini-balance-amount">{formatCurrency(pensionAcc.balance)}</span>
                    </div>
                )}
            </div>

            {/* Tab Pills */}
            <div className="transfer-tabs animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        className={`transfer-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.key)}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Success Message */}
            {success && (
                <div className="success-card animate-fade-in-up">
                    <IoCheckmarkCircle size={32} />
                    <p>{success.message}</p>
                </div>
            )}

            {/* Error Message */}
            {error && <p className="error-msg mt-md" role="alert">{error}</p>}

            {/* Transfer Form */}
            {activeTab === 'transfer' && (
                <form className="transfer-form animate-fade-in-up" onSubmit={handleTransfer} style={{ animationDelay: '0.2s' }}>
                    <div className="form-group">
                        <label className="form-label">{t('from')}</label>
                        <div className="account-selector">
                            <button
                                type="button"
                                className={`account-option ${fromAccount === 'savings' ? 'selected' : ''}`}
                                onClick={() => { setFromAccount('savings'); setToAccount('pension'); }}
                            >
                                {t('savings')}
                            </button>
                            <button
                                type="button"
                                className={`account-option ${fromAccount === 'pension' ? 'selected' : ''}`}
                                onClick={() => { setFromAccount('pension'); setToAccount('savings'); }}
                            >
                                {t('pension')}
                            </button>
                        </div>
                    </div>

                    <div className="transfer-arrow">
                        <IoSwapHorizontalOutline size={24} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('to')}</label>
                        <div className="account-display">{toAccount === 'savings' ? t('savings') : t('pension')}</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('amount')}</label>
                        <div className="amount-input-wrapper">
                            <span className="currency-symbol">₹</span>
                            <input
                                type="number"
                                className="amount-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('description')}</label>
                        <input
                            type="text"
                            className="text-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('optionalDescription')}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !amount}>
                        {submitting ? <span className="spinner" /> : `${t('transfer')} ${amount ? formatCurrency(parseFloat(amount)) : ''}`}
                    </button>
                </form>
            )}

            {/* Deposit Form */}
            {activeTab === 'deposit' && (
                <form className="transfer-form animate-fade-in-up" onSubmit={handleDeposit} style={{ animationDelay: '0.2s' }}>
                    <div className="form-group">
                        <label className="form-label">{t('to')}</label>
                        <div className="account-selector">
                            <button
                                type="button"
                                className={`account-option ${accountType === 'savings' ? 'selected' : ''}`}
                                onClick={() => setAccountType('savings')}
                            >
                                {t('savings')}
                            </button>
                            <button
                                type="button"
                                className={`account-option ${accountType === 'pension' ? 'selected' : ''}`}
                                onClick={() => setAccountType('pension')}
                            >
                                {t('pension')}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('amount')}</label>
                        <div className="amount-input-wrapper">
                            <span className="currency-symbol">₹</span>
                            <input
                                type="number"
                                className="amount-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('description')}</label>
                        <input
                            type="text"
                            className="text-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('optionalDescription')}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !amount}>
                        {submitting ? <span className="spinner" /> : `${t('deposit')} ${amount ? formatCurrency(parseFloat(amount)) : ''}`}
                    </button>
                </form>
            )}

            {/* Withdraw Form */}
            {activeTab === 'withdraw' && (
                <form className="transfer-form animate-fade-in-up" onSubmit={handleWithdraw} style={{ animationDelay: '0.2s' }}>
                    <div className="form-group">
                        <label className="form-label">{t('from')}</label>
                        <div className="account-selector">
                            <button
                                type="button"
                                className={`account-option ${accountType === 'savings' ? 'selected' : ''}`}
                                onClick={() => setAccountType('savings')}
                            >
                                {t('savings')}
                            </button>
                            <button
                                type="button"
                                className={`account-option ${accountType === 'pension' ? 'selected' : ''}`}
                                onClick={() => setAccountType('pension')}
                            >
                                {t('pension')}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('amount')}</label>
                        <div className="amount-input-wrapper">
                            <span className="currency-symbol">₹</span>
                            <input
                                type="number"
                                className="amount-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('description')}</label>
                        <input
                            type="text"
                            className="text-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('optionalDescription')}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={submitting || !amount}>
                        {submitting ? <span className="spinner" /> : `${t('withdraw')} ${amount ? formatCurrency(parseFloat(amount)) : ''}`}
                    </button>
                </form>
            )}
        </div>
    );
};

export default Transfer;
