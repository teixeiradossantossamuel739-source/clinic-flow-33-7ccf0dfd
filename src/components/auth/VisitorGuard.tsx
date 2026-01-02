import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasVisitorAccess } from '@/pages/QuickAccessPage';
import { Loader2 } from 'lucide-react';

interface VisitorGuardProps {
  children: React.ReactNode;
}

export function VisitorGuard({ children }: VisitorGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    // If user is authenticated, allow access
    if (user) return;
    
    // If visitor has filled data, allow access
    if (hasVisitorAccess()) return;
    
    // Otherwise, redirect to quick access page
    navigate('/', { 
      state: { from: location.pathname + location.search },
      replace: true 
    });
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clinic-surface">
        <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
      </div>
    );
  }

  // If user is authenticated or has visitor access, render children
  if (user || hasVisitorAccess()) {
    return <>{children}</>;
  }

  // Otherwise show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-surface">
      <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
    </div>
  );
}
