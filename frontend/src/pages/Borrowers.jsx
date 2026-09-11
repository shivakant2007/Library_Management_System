import { useEffect, useState } from 'react';
import { getBorrowers, createBorrower, updateBorrower, deleteBorrower } from '../services/borrowerService';

const initialForm = {
  borrowerId: '',
  name: '',
  email: '',
  phone: '',
  studentId: '',
  department: '',
  address: '',
  status: 'active'
};

const Borrowers = () => {
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchBorrowers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getBorrowers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        department: departmentFilter.trim() || undefined
      });
      setBorrowers(data.borrowers || []);
    } catch (err) {
      setError(err.message || 'Failed to load borrowers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBorrowers();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setDepartmentFilter('');
    // Fetch without filters after state reset
    setTimeout(() => {
      getBorrowers({})
        .then((data) => setBorrowers(data.borrowers || []))
        .catch((err) => setError(err.message));
    }, 0);
  };

  const openCreate = () => {
    setEditingBorrower(null);
    setForm(initialForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (bor) => {
    setEditingBorrower(bor);
    setForm({
      borrowerId: bor.borrowerId || '',
      name: bor.name || '',
      email: bor.email || '',
      phone: bor.phone || '',
      studentId: bor.studentId || '',
      department: bor.department || '',
      address: bor.address || '',
      status: bor.status || 'active'
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBorrower(null);
    setForm(initialForm);
    setFormError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    if (!form.borrowerId.trim() || !form.name.trim()) {
      setFormError('Please fill borrower ID and name.');
      setFormLoading(false);
      return;
    }

    const payload = {
      borrowerId: form.borrowerId.trim(),
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      studentId: form.studentId.trim() || undefined,
      department: form.department.trim() || undefined,
      address: form.address.trim() || undefined,
      status: form.status
    };

    try {
      if (editingBorrower) {
        await updateBorrower(editingBorrower._id, payload);
      } else {
        await createBorrower(payload);
      }
      closeForm();
      fetchBorrowers();
    } catch (err) {
      setFormError(err.message || 'Failed to save borrower');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (bor) => {
    if (!window.confirm(`Delete borrower "${bor.name}"?`)) return;
    try {
      await deleteBorrower(bor._id);
      fetchBorrowers();
    } catch (err) {
      setError(err.message || 'Failed to delete borrower');
    }
  };

  if (loading) return <div className="loading-container"><p>Loading borrowers...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Borrowers</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          Add Borrower
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSearch} className="toolbar">
        <input
          type="text"
          placeholder="Search by ID, name, email, phone, student ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-input">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <input
          type="text"
          placeholder="Department"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        <button type="button" className="btn btn-outline" onClick={clearFilters}>
          Clear
        </button>
      </form>

      {borrowers.length === 0 ? (
        <div className="empty-state">
          <p>No borrowers found.</p>
          <p>Add your first borrower to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Borrower ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.map((bor) => (
                <tr key={bor._id}>
                  <td><code>{bor.borrowerId}</code></td>
                  <td>{bor.name}</td>
                  <td>{bor.email || '-'}</td>
                  <td>{bor.phone || '-'}</td>
                  <td>{bor.department || '-'}</td>
                  <td>
                    <span className={`status-badge ${bor.status}`}>
                      {bor.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={() => openEdit(bor)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(bor)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingBorrower ? 'Edit Borrower' : 'Add Borrower'}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Borrower ID *</label>
                <input name="borrowerId" value={form.borrowerId} onChange={handleChange} required disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input name="name" value={form.name} onChange={handleChange} required disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Student ID</label>
                <input name="studentId" value={form.studentId} onChange={handleChange} disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input name="department" value={form.department} onChange={handleChange} disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange} disabled={formLoading}>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <textarea name="address" value={form.address} onChange={handleChange} disabled={formLoading} rows="2" />
              </div>

              {formError && <div className="error-message full-width">{formError}</div>}

              <div className="form-actions full-width">
                <button type="button" className="btn btn-outline" onClick={closeForm} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingBorrower ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Borrowers;
