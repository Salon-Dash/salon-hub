import { useParams } from "react-router-dom";
import { getCurrentBusinessId as getStoredBusinessId } from "@/config/api";

/**
 * Hook to get the current business ID from route params or localStorage
 * This ensures we always have the correct business ID based on the current route
 */
export function useBusinessId(): number {
  const { businessId } = useParams<{ businessId?: string }>();
  
  // If businessId is in the route, use it
  if (businessId) {
    const parsedId = parseInt(businessId, 10);
    if (!isNaN(parsedId) && parsedId > 0) {
      return parsedId;
    }
  }
  
  // Fallback to stored business ID (for backward compatibility)
  try {
    return getStoredBusinessId();
  } catch {
    // If no business ID is available, return 0 (will cause errors, which is expected)
    return 0;
  }
}


