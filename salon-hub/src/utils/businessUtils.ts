import { businessService } from "@/services/businessService";
import { getAccessToken } from "./authUtils";

/**
 * Gets the current user from localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

/**
 * Checks if the current user is a BUSINESS_OWNER
 */
export const isBusinessOwner = (): boolean => {
  const user = getCurrentUser();
  return user?.role === "BUSINESS_OWNER";
};

/**
 * Checks if the current user owns a specific business
 */
export const ownsBusiness = async (businessId: number): Promise<boolean> => {
  const user = getCurrentUser();
  if (!user || user.role !== "BUSINESS_OWNER") {
    return false;
  }

  const accessToken = getAccessToken();
  if (!accessToken) {
    return false;
  }

  try {
    const businesses = await businessService.getBusinessesByOwner(user.id, accessToken);
    return businesses.some(b => b.id === businessId);
  } catch (error) {
    console.error("Error checking business ownership:", error);
    return false;
  }
};

/**
 * Gets all businesses owned by the current user
 */
export const getUserBusinesses = async () => {
  const user = getCurrentUser();
  if (!user || user.role !== "BUSINESS_OWNER") {
    return [];
  }

  const accessToken = getAccessToken();
  if (!accessToken) {
    return [];
  }

  try {
    return await businessService.getBusinessesByOwner(user.id, accessToken);
  } catch (error) {
    console.error("Error fetching user businesses:", error);
    return [];
  }
};

/**
 * Gets the business ID from the current route
 */
export const getBusinessIdFromRoute = (): number | null => {
  const path = window.location.pathname;
  const match = path.match(/^\/(\d+)\//);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
};


