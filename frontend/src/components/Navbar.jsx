import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const [theme, setTheme] = useState(localStorage.getItem('library_theme') || 'light');
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('library_theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2>Library Management System</h2>
      </div>
      <div className="navbar-menu">
        <Link to="/" className={`navbar-link ${isActive('/') ? 'active' : ''}`}>
          Home
        </Link>
        <Link to="/books" className={`navbar-link ${isActive('/books') ? 'active' : ''}`}>
          Books
        </Link>
        <Link to="/borrowers" className={`navbar-link ${isActive('/borrowers') ? 'active' : ''}`}>
          Borrowers
        </Link>
        <Link to="/transactions" className={`navbar-link ${isActive('/transactions') ? 'active' : ''}`}>
          Transactions
        </Link>
        <Link to="/fines" className={`navbar-link ${isActive('/fines') ? 'active' : ''}`}>
          Fines
        </Link>
      </div>
      <div className="navbar-user">
        {user && (
          <>
            <span className="user-info">
              {user.name} ({user.userId}) - {user.role}
            </span>
            <button className="btn btn-outline" onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Dark' : '☀ Light'}
            </button>
            <button className="btn btn-outline" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
