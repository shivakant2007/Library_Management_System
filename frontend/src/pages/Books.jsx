import { useEffect, useState } from 'react';
import { getBooks, createBook, updateBook, deleteBook } from '../services/bookService';

const initialForm = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  publisher: '',
  publicationYear: '',
  totalCopies: '',
  availableCopies: '',
  description: ''
};

const Books = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getBooks();
      setBooks(data.books || []);
    } catch (err) {
      setError(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const openCreate = () => {
    setEditingBook(null);
    setForm(initialForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (book) => {
    setEditingBook(book);
    setForm({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || '',
      publisher: book.publisher || '',
      publicationYear: book.publicationYear || '',
      totalCopies: book.totalCopies || '',
      availableCopies: book.availableCopies || '',
      description: book.description || ''
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingBook(null);
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

    if (!form.title.trim() || !form.author.trim() || !form.isbn.trim() || !form.category.trim() || !form.totalCopies) {
      setFormError('Please fill title, author, ISBN, category and total copies.');
      setFormLoading(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim(),
      category: form.category.trim(),
      publisher: form.publisher.trim() || undefined,
      description: form.description.trim() || undefined
    };

    if (form.publicationYear) {
      const year = Number(form.publicationYear);
      if (!Number.isNaN(year)) payload.publicationYear = year;
    }

    const total = Number(form.totalCopies);
    if (!Number.isNaN(total)) payload.totalCopies = total;

    if (form.availableCopies !== '' && form.availableCopies !== null) {
      const avail = Number(form.availableCopies);
      if (!Number.isNaN(avail)) payload.availableCopies = avail;
    }

    try {
      if (editingBook) {
        // For edit, only send provided fields; avoid resetting availableCopies if not needed
        // But our form always has availableCopies, so we send it; backend handles correctly
        await updateBook(editingBook._id, payload);
      } else {
        await createBook(payload);
      }
      closeForm();
      fetchBooks();
    } catch (err) {
      setFormError(err.message || 'Failed to save book');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Delete book "${book.title}"?`)) return;
    try {
      await deleteBook(book._id);
      fetchBooks();
    } catch (err) {
      setError(err.message || 'Failed to delete book');
    }
  };

  const filteredBooks = books.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.isbn.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="loading-container"><p>Loading books...</p></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Books</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          Add Book
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by title, author, ISBN, category"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {filteredBooks.length === 0 ? (
        <div className="empty-state">
          <p>No books found.</p>
          {search && <p>Try a different search.</p>}
          {!search && <p>Add your first book to get started.</p>}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>ISBN</th>
                <th>Category</th>
                <th>Total</th>
                <th>Available</th>
                <th>Issued</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => (
                <tr key={book._id}>
                  <td>{book.title}</td>
                  <td>{book.author}</td>
                  <td><code>{book.isbn}</code></td>
                  <td>{book.category}</td>
                  <td>{book.totalCopies}</td>
                  <td>{book.availableCopies}</td>
                  <td>{book.totalCopies - book.availableCopies}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => openEdit(book)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(book)}>
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
            <h2>{editingBook ? 'Edit Book' : 'Add Book'}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Title *</label>
                <input name="title" value={form.title} onChange={handleChange} required disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Author *</label>
                <input name="author" value={form.author} onChange={handleChange} required disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>ISBN *</label>
                <input name="isbn" value={form.isbn} onChange={handleChange} required disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Category *</label>
                <input name="category" value={form.category} onChange={handleChange} required disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Publisher</label>
                <input name="publisher" value={form.publisher} onChange={handleChange} disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Publication Year</label>
                <input name="publicationYear" type="number" value={form.publicationYear} onChange={handleChange} disabled={formLoading} placeholder="e.g., 2020" />
              </div>
              <div className="form-group">
                <label>Total Copies *</label>
                <input name="totalCopies" type="number" min="1" value={form.totalCopies} onChange={handleChange} required disabled={formLoading} />
              </div>
              <div className="form-group">
                <label>Available Copies</label>
                <input name="availableCopies" type="number" min="0" value={form.availableCopies} onChange={handleChange} disabled={formLoading} />
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} disabled={formLoading} rows="3" />
              </div>

              {formError && <div className="error-message full-width">{formError}</div>}

              <div className="form-actions full-width">
                <button type="button" className="btn btn-outline" onClick={closeForm} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingBook ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Books;
