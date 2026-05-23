import { Navigate } from 'react-router-dom';
import { useSecurity } from '../app/SecurityProvider';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { verified } = useSecurity();
  if (!verified) {
    return <Navigate to="/verify" replace />;
  }
  return <>{children}</>;
}
