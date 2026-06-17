import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { clearAuthData, getAccessToken } from "@/utils/authUtils";
import { authService } from "@/services/authService";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const validateAuth = async () => {
      const accessToken = getAccessToken();
      const user = localStorage.getItem("user");

      if (!accessToken || !user) {
        clearAuthData();
        if (isMounted) { setIsAuth(false); setShouldRedirect(true); }
        return;
      }

      try {
        const validationResult = await authService.validateToken(accessToken);

        if (!isMounted) return;

        if (!validationResult.valid) {
          clearAuthData();
          setIsAuth(false);
          setShouldRedirect(true);
          return;
        }

        if (validationResult.user) {
          localStorage.setItem('user', JSON.stringify(validationResult.user));
        }

        setIsAuth(true);
        setShouldRedirect(false);
      } catch {
        if (isMounted) {
          clearAuthData();
          setIsAuth(false);
          setShouldRedirect(true);
        }
      }
    };

    validateAuth();
    const interval = setInterval(validateAuth, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Show loading while checking authentication
  if (isAuth === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuth || shouldRedirect) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

