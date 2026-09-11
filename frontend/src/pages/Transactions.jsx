import { useEffect, useState } from 'react';
import { getBooks } from '../services/bookService';
import { getBorrowers } from '../services/borrowerService';
import {
  issueBook,
  returnBook,
  getActiveTransactions,
  getTransactions
} from '../services/transactionService';

const Transactions = () => {
  const [activeTab, setActiveTab] = useState('issue');
  const [books, setBooks] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issueForm, setIssueForm] = useState({ borrowerId: '', bookId: '', dueDate: '' });
  const [returnForm, setReturnForm] = useState({ transactionId: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [booksData, borrowersData, activeData, historyData] = await Promise.all([
        getBooks(),
        getBorrowers(),
        getActiveTransactions(),
        getTransactions()
      ]);
      setBooks(booksData.books || []);
      setBorrowers(borrowersData.borrowers || []);
      setActiveTransactions(activeData.transactions || []);
      setHistory(historyData.transactions || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    if (!issueForm.borrowerId || !issueForm.bookId || !issueForm.dueDate) {
      setFormError('Please fill borrower, book and due date.');
      return;
    }
    setFormLoading(true);
    try {
      await issueBook({
        borrowerId: issueForm.borrowerId,
        bookId: issueForm.bookId,
        dueDate: issueForm.dueDate
      });
      setSuccessMsg('Book issued successfully!');
      setIssueForm({ borrowerId: '', bookId: '', dueDate: '' });
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to issue book');
    } finally {
      setFormLoading(false);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    if (!returnForm.transactionId.trim()) {
      setFormError('Please enter transaction ID.');
      return;
    }
    setFormLoading(true);
    try {
      await returnBook(returnForm.transactionId.trim());
      setSuccessMsg('Book returned successfully!');
      setReturnForm({ transactionId: '' });
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to return book');
    } finally {
      setFormLoading(false);
    }
  };

  const selectedBorrower = borrowers.find((b) => b.borrowerId === issueForm.borrowerId);
  const selectedBook = books.find((b) => b._id === issueForm.bookId);

  if (loading) return <div className="loading-container"><p>Loading transactions...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Transactions</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-message">{successMsg}</div>}

      <div className="tabs">
        <button className={`tab ${activeTab === 'issue' ? 'active' : ''}`} onClick={() => setActiveTab('issue')}>
          Issue Book
        </button>
        <button className={`tab ${activeTab === 'return' ? 'active' : ''}`} onClick={() => setActiveTab('return')}>
          Return Book
        </button>
        <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
          Active Issues ({activeTransactions.length})
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          History ({history.length})
        </button>
      </div>

      {activeTab === 'issue' && (
        <div className="form-card">
          <h3>Issue Book</h3>
          <form onSubmit={handleIssue} className="form-grid">
            <div className="form-group">
              <label>Borrower *</label>
              <select
                value={issueForm.borrowerId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, borrowerId: e.target.value }))}
                required
                disabled={formLoading}
              >
                <option value="">Select borrower</option>
                {borrowers.map((b) => (
                  <option key={b._id} value={b.borrowerId}>
                    {b.name} ({b.borrowerId}) - {b.status}
                  </option>
                ))}
              </select>
              {selectedBorrower && (
                <small>
                  {selectedBorrower.name} - {selectedBorrower.status} {selectedBorrower.status === 'blocked' && '(cannot borrow)'}
                </small>
              )}
            </div>
            <div className="form-group">
              <label>Book *</label>
              <select
                value={issueForm.bookId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, bookId: e.target.value }))}
                required
                disabled={formLoading}
              >
                <option value="">Select book</option>
                {books.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.title} ({b.availableCopies}/{b.totalCopies} available)
                  </option>
                ))}
              </select>
              {selectedBook && (
                <small>
                  {selectedBook.title} - {selectedBook.availableCopies} available
                </small>
              )}
            </div>
            <div className="form-group">
              <label>Due Date *</label>
              <input
                type="date"
                value={issueForm.dueDate}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                required
                disabled={formLoading}
              />
            </div>
            {formError && <div className="error-message full-width">{formError}</div>}
            <div className="form-actions full-width">
              <button type="submit" className="btn btn-primary" disabled={formLoading}>
                {formLoading ? 'Issuing...' : 'Issue Book'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'return' && (
        <div className="form-card">
          <h3>Return Book</h3>
          <form onSubmit={handleReturn} className="form-grid">
            <div className="form-group full-width">
              <label>Transaction ID *</label>
              <input
                type="text"
                value={returnForm.transactionId}
                onChange={(e) => setReturnForm({ transactionId: e.target.value })}
                placeholder="Enter transaction ID"
                required
                disabled={formLoading}
              />
              <small>Copy ID from Active Issues or History</small>
            </div>
            {formError && <div className="error-message full-width">{formError}</div>}
            <div className="form-actions full-width">
              <button type="submit" className="btn btn-primary" disabled={formLoading}>
                {formLoading ? 'Returning...' : 'Return Book'}
              </button>
            </div>
          </form>
          <div className="info-card" style={{ marginTop: '16px' }}>
            <h4>Active Transactions</h4>
            {activeTransactions.length === 0 ? (
              <p>No active issues.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Borrower</th>
                      <th>Book</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTransactions.map((t) => (
                      <tr key={t._id}>
                        <td><code>{t._id}</code></td>
                        <td>{t.borrower?.name}</td>
                        <td>{t.book?.title}</td>
                        <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="table-container">
          {activeTransactions.length === 0 ? (
            <div className="empty-state"><p>No active issues.</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Book</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeTransactions.map((t) => (
                  <tr key={t._id}>
                    <td>{t.borrower?.name} ({t.borrower?.borrowerId})</td>
                    <td>{t.book?.title}</td>
                    <td>{new Date(t.issueDate).toLocaleDateString()}</td>
                    <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td><span className="status-badge active">{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="table-container">
          {history.length === 0 ? (
            <div className="empty-state"><p>No transaction history.</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Book</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Status</th>
                  <th>Fine</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => (
                  <tr key={t._id}>
                    <td>{t.borrower?.name}</td>
                    <td>{t.book?.title}</td>
                    <td>{new Date(t.issueDate).toLocaleDateString()}</td>
                    <td>{new Date(t.dueDate).toLocaleDateString()}</td>
                    <td>{t.returnDate ? new Date(t.returnDate).toLocaleDateString() : '-'}</td>
                    <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                    <td>{t.fineAmount > 0 ? `₹${t.fineAmount} (${t.fineStatus})` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
