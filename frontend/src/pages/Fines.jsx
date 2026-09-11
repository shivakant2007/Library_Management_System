import { useEffect, useState } from 'react';
import { getOverdue, getFines, payFine } from '../services/fineService';

const Fines = () => {
  const [overdue, setOverdue] = useState([]);
  const [fines, setFines] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async (status = filter) => {
    setLoading(true);
    setError('');
    try {
      const [overdueData, finesData] = await Promise.all([
        getOverdue(),
        getFines(status || undefined)
      ]);
      // Exact Stage 6 contracts:
      // GET /api/transactions/overdue -> { success, count, transactions }
      // GET /api/transactions/fines  -> { success, count, transactions }
      setOverdue(overdueData.transactions || []);
      setFines(finesData.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to load fines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilter = (status) => {
    setFilter(status);
    fetchData(status);
  };

  const handlePay = async (id) => {
    if (!window.confirm('Mark this fine as paid?')) return;
    setPayingId(id);
    setError('');
    setSuccessMsg('');
    try {
      await payFine(id);
      setSuccessMsg('Fine paid successfully!');
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to pay fine');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <div className="loading-container"><p>Loading fines...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Fines & Overdue</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-message">{successMsg}</div>}

      <div className="info-card">
        <h3>Overdue Books ({overdue.length})</h3>
        {overdue.length === 0 ? (
          <p>No overdue books.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Book</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Overdue Days</th>
                  <th>Current Fine</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((t) => (
                  <tr key={t._id}>
                    <td>{t.borrower?.name} ({t.borrower?.borrowerId})</td>
                    <td>{t.book?.title}</td>
                    <td>{new Date(t.issueDate).toLocaleDateString()}</td>
                    <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td>{t.overdueDays ?? '-'}</td>
                    <td>₹{t.fineAmount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="info-card">
        <h3>Stored Fines</h3>
        <div className="toolbar">
          <button className={`btn ${filter === '' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleFilter('')}>
            All
          </button>
          <button className={`btn ${filter === 'unpaid' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleFilter('unpaid')}>
            Unpaid
          </button>
          <button className={`btn ${filter === 'paid' ? 'btn-primary' : 'btn-outline'}`} onClick={() => handleFilter('paid')}>
            Paid
          </button>
        </div>

        {fines.length === 0 ? (
          <div className="empty-state"><p>No fines found.</p></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Book</th>
                  <th>Fine Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Paid Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((t) => (
                  <tr key={t._id}>
                    <td>{t.borrower?.name}</td>
                    <td>{t.book?.title}</td>
                    <td>₹{t.fineAmount}</td>
                    <td><span className={`status-badge ${t.fineStatus}`}>{t.fineStatus}</span></td>
                    <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td>{t.returnDate ? new Date(t.returnDate).toLocaleDateString() : '-'}</td>
                    <td>{t.fineStatus === 'paid' && t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : '-'}</td>
                    <td>
                      {t.fineStatus === 'unpaid' ? (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handlePay(t._id)}
                          disabled={payingId === t._id}
                        >
                          {payingId === t._id ? 'Paying...' : 'Pay Fine'}
                        </button>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fines;
