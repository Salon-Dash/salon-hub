import { useBusinessId } from "@/hooks/useBusinessId";

/**
 * Hook to get navigation helper that includes businessId in paths
 */
export function useNavigation() {
  const businessId = useBusinessId();
  
  /**
   * Get a path with businessId prepended if we're in a business route
   * @param path - The path segment (e.g., "add-service", "edit-service")
   * @param id - Optional ID to append to the path (e.g., for edit routes)
   */
  const getPath = (path: string, id?: string | number): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    
    // Construct full path with ID if provided
    let fullPath = cleanPath;
    if (id !== undefined) {
      fullPath = `${cleanPath}/${id}`;
    }
    
    // If we have a businessId and the path doesn't already include it, prepend it
    if (businessId > 0 && !fullPath.startsWith(`${businessId}/`)) {
      return `/${businessId}/${fullPath}`;
    }
    
    return `/${fullPath}`;
  };
  
  return { getPath, businessId };
}

