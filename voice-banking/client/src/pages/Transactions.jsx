import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';
import './Transactions.css';

const Transactions = () => {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTransactions = async (pageNum = 1, accountType = filter, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await api.get('/user/transactions', {
        params: { accountType: accountType === 'all' ? undefined : accountType, page: pageNum, limit: 10 }
      });

      if (append) {
        setTransactions(prev => [...prev, ...res.data.transactions]);
      } else {
        setTransactions(res.data.transactions);
      }
      setHasMore(pageNum < res.data.pagination.pages);
    } catch (err) {
      console.error('Fetch transactions error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchTransactions(1, filter, false);
  }, [filter]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage, filter, true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Group transactions by month
  const groupedTransactions = transactions.reduce((groups, tx) => {
    const date = new Date(tx.date);
    const key = `${date.toLocaleString('en-IN', { month: 'long' })} ${date.getFullYear()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
    return groups;
  }, {});

  const filters = [
    { value: 'all', label: t('all') },
    { value: 'savings', label: t('savings') },
    { value: 'pension', label: t('pension') },
  ];

  if (loading) {
    return (
      <div className="page flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-lg spinner"></div>
      </div>
    );
  }

  return (
    <div className="page transactions-page">
      <h1 className="page-title">{t('transactions')}</h1>

      {/* Filter Pills */}
      <div className="filter-pills" role="group" aria-label="Filter transactions">
        {filters.map((f) => (
          <button
            key={f.value}
            className={`pill ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped Transactions */}
      {Object.entries(groupedTransactions).map(([month, txs]) => (
        <div key={month} className="tx-group animate-fade-in-up">
          <h2 className="tx-month">{month}</h2>
          <div className="tx-group-list">
            {txs.map((tx) => (
              <div key={tx._id} className="tx-card">
                <div className="tx-card-indicator" style={{
                  background: tx.type === 'credit' ? 'var(--accent-green-glow)' : 'var(--accent-red-glow)',
                  color: tx.type === 'credit' ? 'var(--accent-green)' : 'var(--accent-red)'
                }}>
                  {tx.type === 'credit' ? '🟢' : '🔴'}
                </div>
                <div className="tx-card-info">
                  <span className="tx-card-merchant">{tx.merchant}</span>
                  <span className="tx-card-meta">
                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' • '}{tx.category}
                  </span>
                </div>
                <span className={`tx-card-amount ${tx.type}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {transactions.length === 0 && (
        <div className="text-center" style={{ padding: 'var(--space-3xl)', color: 'var(--text-muted)' }}>
          No transactions found
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <button
          className="btn btn-secondary btn-block mt-lg"
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? <span className="spinner" /> : t('loadMore')}
        </button>
      )}
    </div>
  );
};

export default Transactions;
