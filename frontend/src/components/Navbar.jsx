import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

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
      </div>
      <div className="navbar-user">
        {user && (
          <>
            <span className="user-info">
              {user.name} ({user.userId}) - {user.role}
            </span>
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
