import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import Numpad from '../components/auth/Numpad';
import { IoSwapHorizontalOutline, IoArrowDownOutline, IoArrowUpOutline, IoCheckmarkCircle, IoLockClosedOutline } from 'react-icons/io5';
import './Transfer.css';

const Transfer = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('deposit');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState('');

    // Form state
    const [amount, setAmount] = useState('');
    const [fromAccount, setFromAccount] = useState('');
    const [toAccount, setToAccount] = useState('');
    const [accountType, setAccountType] = useState('');
    const [description, setDescription] = useState('');

    // PIN state
    const [showPin, setShowPin] = useState(false);
    const [pin, setPin] = useState('');
    const [pendingAction, setPendingAction] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/user/profile');
                setProfile(res.data.user);
                const accounts = res.data.user?.accounts || [];
                if (accounts.length > 0) {
                    setAccountType(accounts[0].type);
                    setFromAccount(accounts[0].type);
                    if (accounts.length > 1) {
                        setToAccount(accounts[1].type);
                    }
                }
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

    const initiateAction = (e, actionType) => {
        e.preventDefault();
        setError('');
        setSuccess(null);
        setPin('');
        setPendingAction(actionType);
        setShowPin(true);
    };

    const executeAction = async (enteredPin) => {
        setShowPin(false);
        setSubmitting(true);
        setError('');

        try {
            let res;
            if (pendingAction === 'deposit') {
                res = await api.post('/user/deposit', {
                    accountType,
                    amount: parseFloat(amount),
                    description,
                    pin: enteredPin
                });
            } else if (pendingAction === 'withdraw') {
                res = await api.post('/user/withdraw', {
                    accountType,
                    amount: parseFloat(amount),
                    description,
                    pin: enteredPin
                });
            } else if (pendingAction === 'transfer') {
                res = await api.post('/user/transfer', {
                    fromAccount,
                    toAccount,
                    amount: parseFloat(amount),
                    description,
                    pin: enteredPin
                });
            }

            setSuccess({
                message: res?.data?.message || 'Success',
                balances: res?.data?.updatedBalances,
                balance: res?.data?.updatedBalance
            });
            resetForm();
            await refreshProfile();
        } catch (err) {
            setError(err.response?.data?.message || 'Transaction failed');
        } finally {
            setSubmitting(false);
            setPendingAction(null);
        }
    };

    const accounts = profile?.accounts || [];
    const hasMultipleAccounts = accounts.length > 1;

    const tabs = [
        { key: 'deposit', label: t('deposit'), icon: IoArrowDownOutline },
        { key: 'withdraw', label: t('withdraw'), icon: IoArrowUpOutline },
        ...(hasMultipleAccounts ? [{ key: 'transfer', label: t('transfer'), icon: IoSwapHorizontalOutline }] : []),
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

    return (
        <div className="page transfer-page">
            <h1 className="page-title">{t('transactions')}</h1>

            {/* Balance Summary — dynamic */}
            <div className="transfer-balances animate-fade-in-up">
                {accounts.map((acc) => (
                    <div className="mini-balance-card" key={acc.number}>
                        <span className="mini-balance-label">{t(acc.type)}</span>
                        <span className="mini-balance-amount">{formatCurrency(acc.balance)}</span>
                    </div>
                ))}
            </div>

            {/* Tab Pills */}
            {!showPin && (
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
            )}

            {/* Success Message */}
            {success && !showPin && (
                <div className="success-card animate-fade-in-up">
                    <IoCheckmarkCircle size={32} />
                    <p>{success.message}</p>
                </div>
            )}

            {/* Error Message */}
            {error && <p className="error-msg mt-md" role="alert">{error}</p>}

            {/* PIN Entry View */}
            {showPin && (
                <div className="transfer-form animate-fade-in-up text-center" style={{ animationDelay: '0.1s' }}>
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <IoLockClosedOutline size={48} style={{ color: 'var(--accent-blue)', margin: '0 auto var(--space-md)' }} />
                        <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                            Confirm {pendingAction === 'deposit' ? t('deposit') : pendingAction === 'withdraw' ? t('withdraw') : t('transfer')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {formatCurrency(parseFloat(amount))}
                        </p>
                    </div>

                    <Numpad
                        value={pin}
                        onChange={setPin}
                        maxLength={4}
                        onComplete={executeAction}
                    />

                    <button
                        type="button"
                        className="btn btn-ghost mt-md btn-block"
                        onClick={() => { setShowPin(false); setPin(''); }}
                        disabled={submitting}
                    >
                        {t('cancel')}
                    </button>
                </div>
            )}

            {/* Deposit Form */}
            {activeTab === 'deposit' && !showPin && (
                <form className="transfer-form animate-fade-in-up" onSubmit={(e) => initiateAction(e, 'deposit')} style={{ animationDelay: '0.2s' }}>
                    <div className="form-group">
                        <label className="form-label">{t('to')}</label>
                        <div className="account-selector">
                            {accounts.map((acc) => (
                                <button
                                    key={acc.type}
                                    type="button"
                                    className={`account-option ${accountType === acc.type ? 'selected' : ''}`}
                                    onClick={() => setAccountType(acc.type)}
                                >
                                    {t(acc.type)}
                                </button>
                            ))}
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
            {activeTab === 'withdraw' && !showPin && (
                <form className="transfer-form animate-fade-in-up" onSubmit={(e) => initiateAction(e, 'withdraw')} style={{ animationDelay: '0.2s' }}>
                    <div className="form-group">
                        <label className="form-label">{t('from')}</label>
                        <div className="account-selector">
                            {accounts.map((acc) => (
                                <button
                                    key={acc.type}
                                    type="button"
                                    className={`account-option ${accountType === acc.type ? 'selected' : ''}`}
                                    onClick={() => setAccountType(acc.type)}
                                >
                                    {t(acc.type)}
                                </button>
                            ))}
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

            {/* Transfer Form — only shown if user has multiple accounts */}
            {activeTab === 'transfer' && hasMultipleAccounts && !showPin && (
                <form className="transfer-form animate-fade-in-up" onSubmit={(e) => initiateAction(e, 'transfer')} style={{ animationDelay: '0.2s' }}>
                    <div className="form-group">
                        <label className="form-label">{t('from')}</label>
                        <div className="account-selector">
                            {accounts.map((acc) => (
                                <button
                                    key={acc.type}
                                    type="button"
                                    className={`account-option ${fromAccount === acc.type ? 'selected' : ''}`}
                                    onClick={() => {
                                        setFromAccount(acc.type);
                                        const other = accounts.find(a => a.type !== acc.type);
                                        if (other) setToAccount(other.type);
                                    }}
                                >
                                    {t(acc.type)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="transfer-arrow">
                        <IoSwapHorizontalOutline size={24} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">{t('to')}</label>
                        <div className="account-display">{t(toAccount)}</div>
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
        </div>
    );
};

export default Transfer;
