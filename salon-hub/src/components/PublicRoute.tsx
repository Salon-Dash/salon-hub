import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/utils/authUtils";

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  // If user is already authenticated with valid token, redirect to home
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  // Allow access to public routes (login/register)
  return <>{children}</>;
};

export default PublicRoute;





