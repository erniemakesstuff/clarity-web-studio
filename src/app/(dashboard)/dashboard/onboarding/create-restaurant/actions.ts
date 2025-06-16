
'use server';

const API_BASE_URL = "https://api.bityfan.com";

interface CreateMenuOnBackendResult {
  success: boolean;
  message?: string;
  menuId?: string;
}

export async function createMenuOnBackend(
  ownerId: string,
  menuName: string,
  jwtToken: string | null // Added jwtToken parameter
): Promise<CreateMenuOnBackendResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";

    const response = await fetch(`${API_BASE_URL}/ris/v1/menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationValue // Updated Authorization header
      },
      body: JSON.stringify({
        ownerId: ownerId,
        menuId: menuName,
      }),
    });

    if (response.ok) {
      return { success: true, menuId: menuName };
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
    let detailedErrorMessage = "Failed to communicate with the backend service.";
    if (error.message && error.message.toLowerCase().includes("fetch failed")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL}. Please check server status and network connectivity.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding. Please ensure the service is running.`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}
