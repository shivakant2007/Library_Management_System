import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-container">
      <h1>Welcome to Library Management System</h1>

      {user && (
        <div className="welcome-card">
          <p>
            Welcome, <strong>{user.name}</strong>!
          </p>
          <p>
            User ID: <code>{user.userId}</code>
          </p>
          <p>
            Role: <span className="role-badge">{user.role}</span>
          </p>
          <p>
            Email: <code>{user.email}</code>
          </p>
        </div>
      )}

      <div className="info-card">
        <h3>System Status</h3>
        <p>Authentication is working. You are successfully logged in.</p>
        <p>
          Library modules such as Books, Borrowers, Issue & Return, Fines, QR Scanner,
          Dashboard, and Reports will be added in upcoming stages.
        </p>
      </div>
    </div>
  );
};

export default Home;
