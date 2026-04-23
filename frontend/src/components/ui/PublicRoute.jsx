import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Giriş yapmışsa /login'e erişemez, dashboard'a yönlendirir
export default function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}
