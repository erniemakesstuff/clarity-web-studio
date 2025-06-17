'use server';

import type { MenuInstance } from '@/lib/types';

const API_BASE_URL = "https://api.bityfan.com";

// Assuming the backend returns an array of objects like { menuId: string, ...otherProps }
interface BackendMenu {
  menuId: string;
  // If the backend provides a display name or other properties, define them here
  // e.g., displayName?: string;
}

interface FetchMenuInstancesResult {
  success: boolean;
  menuInstances?: MenuInstance[];
  message?: string;
}

export async function fetchMenuInstancesFromBackend(
  ownerId: string,
  jwtToken: string | null
): Promise<FetchMenuInstancesResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    const response = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${encodeURIComponent(ownerId)}`, {
      method: "GET",
      headers: {
        "Authorization": authorizationValue,
        "Accept": "application/json", // Good practice to specify accept header
      },
    });

    if (response.ok) {
      const backendMenus: BackendMenu[] = await response.json();
      
      const transformedMenuInstances: MenuInstance[] = backendMenus.map(menu => ({
        id: menu.menuId,
        name: menu.menuId, // Use menuId as name if no other display name is provided by backend
        menu: [], // Initialize with an empty menu item list
      }));
      return { success: true, menuInstances: transformedMenuInstances };
    } else {
      let errorMessage = `Backend API Error: ${response.status} ${response.statusText}.`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Failed to parse error JSON from backend
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while fetching menus.";
    if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} to fetch menus. Please check server status and network connectivity.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding. Please ensure the service is running.`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}
