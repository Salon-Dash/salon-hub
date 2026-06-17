import { Navigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAccessToken } from "@/utils/authUtils";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";

interface BusinessOwnerRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route that ensures:
 * 1. User is authenticated
 * 2. User is a BUSINESS_OWNER
 * 3. User owns the business specified in the URL
 */
const BusinessOwnerRoute = ({ children }: BusinessOwnerRouteProps) => {
  const { businessId } = useParams<{ businessId: string }>();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateBusinessOwnership = async () => {
      try {
        // Check if businessId is provided
        if (!businessId) {
          console.error("BusinessOwnerRoute: No businessId in URL");
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Get user from localStorage
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          console.error("BusinessOwnerRoute: No user found");
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        const user = JSON.parse(userStr);

        // Get access token
        const accessToken = getAccessToken();
        if (!accessToken) {
          console.error("BusinessOwnerRoute: No access token");
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Fetch businesses owned by the user
        const businesses = await businessService.getBusinessesByOwner(user.id, accessToken);
        
        // Check if the businessId in the URL belongs to the user
        const businessIdNum = parseInt(businessId, 10);
        const ownsBusiness = businesses.some(b => b.id === businessIdNum);

        if (!ownsBusiness) {
          console.error("BusinessOwnerRoute: User does not own this business", {
            userId: user.id,
            businessId: businessIdNum,
            ownedBusinesses: businesses.map(b => b.id)
          });
          toast.error("Access denied. You do not have permission to access this business.");
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Update localStorage with the current business
        const business = businesses.find(b => b.id === businessIdNum);
        if (business) {
          localStorage.setItem("currentBusinessId", business.id.toString());
          localStorage.setItem("currentBusiness", JSON.stringify(business));
        }

        console.log("BusinessOwnerRoute: User is authorized", {
          userId: user.id,
          businessId: businessIdNum
        });
        setIsAuthorized(true);
        setIsLoading(false);
      } catch (error: any) {
        console.error("BusinessOwnerRoute: Error validating business ownership", error);
        toast.error("Failed to verify business access. Please try again.");
        setIsAuthorized(false);
        setIsLoading(false);
      }
    };

    validateBusinessOwnership();
  }, [businessId]);

  // Show loading while checking authorization
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Verifying access...</div>
      </div>
    );
  }

  // Redirect if not authorized
  if (!isAuthorized) {
    // Redirect to home or business selection page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default BusinessOwnerRoute;


