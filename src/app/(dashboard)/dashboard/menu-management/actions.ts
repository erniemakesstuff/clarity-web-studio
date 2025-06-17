
'use server';

import type { AuthContextType } from '@/contexts/AuthContext'; // Only for type, not direct use
import type { ExtractedMenuItem, DigitalMenuState } from '@/lib/types';
import type { MenuItemCore } from '@/lib/types';


const API_BASE_URL = "https://api.bityfan.com";

interface GetPresignedUrlParams {
  ownerId: string;
  menuId: string;
  mediaType: string; // e.g. "image/png"
  payload: string; // base64 encoded image data
}

interface GetPresignedUrlResult {
  success: boolean;
  mediaURL?: string; // This is the S3 presigned URL for client PUT upload
  finalMediaUrl?: string; // The base S3 URL after stripping presigned parts
  message?: string;
}

export async function getPresignedUploadUrl(
  params: GetPresignedUrlParams,
  jwtToken: string | null
): Promise<GetPresignedUrlResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";

    const requestBody = {
      ownerId: params.ownerId,
      menuId: params.menuId,
      mediaType: params.mediaType, // Use the specific file type
      payload: params.payload,
    };

    const response = await fetch(`${API_BASE_URL}/ris/v1/menu/context`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationValue,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const resultJson = await response.json();
      if (resultJson.mediaURL) {
        // Assuming mediaURL is the presigned URL client should use for PUT
        // finalMediaUrl should be the plain S3 URL for later reference (if needed)
        const finalMediaUrl = resultJson.mediaURL.split('?')[0];
        return { success: true, mediaURL: resultJson.mediaURL, finalMediaUrl: finalMediaUrl };
      } else {
        return { success: false, message: "Backend did not return a mediaURL in the expected format." };
      }
    } else {
      let errorMessage = `Backend API Error (getting presigned URL): ${response.status} ${response.statusText}.`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Failed to parse error JSON from backend
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while requesting presigned URL.";
     if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for presigned URL. Please check server status and network connectivity.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding for presigned URL. Please ensure the service is running.`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred (requesting presigned URL): ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}


interface StartWorkflowResult {
  success: boolean;
  message?: string;
}

export async function startBackendWorkflow(
  ownerId: string,
  menuId: string,
  jwtToken: string | null
): Promise<StartWorkflowResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    const response = await fetch(`${API_BASE_URL}/ris/v1/menu/start-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationValue,
        "Accept": "application/json",
      },
      body: JSON.stringify({ ownerId, menuId }),
    });

    if (response.ok) {
      return { success: true };
    } else {
      let errorMessage = `Backend API Error (starting workflow): ${response.status} ${response.statusText}.`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) { /* Failed to parse error */ }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    // Simplified error message construction
    return { success: false, message: `Network or unexpected error (starting workflow): ${error.message}` };
  }
}

// Types matching backend FoodServiceEntry and DigitalMenu for polling response
interface BackendFoodServiceEntryJson {
  name: string;
  description: string;
  price: string; // Assuming price is already formatted string, or adjust as needed
  // Add other fields if returned and needed: food_category, ingredients, allergen_tags etc.
}
interface BackendDigitalMenuPollResponse {
  OwnerID: string;
  MenuID: string;
  State: DigitalMenuState;
  FoodServiceEntries?: BackendFoodServiceEntryJson[] | null; // This will contain menu items when "Done"
  // Include other fields from DigitalMenu struct if needed by frontend during polling
}

interface PollWorkflowStatusResult {
  success: boolean;
  state?: DigitalMenuState;
  menuItems?: ExtractedMenuItem[]; // Using ExtractedMenuItem for consistency on client
  message?: string;
}

export async function pollWorkflowStatus(
  ownerId: string,
  menuId: string,
  jwtToken: string | null
): Promise<PollWorkflowStatusResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    const response = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${encodeURIComponent(ownerId)}&menuId=${encodeURIComponent(menuId)}`, {
      method: "GET",
      headers: {
        "Authorization": authorizationValue,
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const data: BackendDigitalMenuPollResponse = await response.json();
      const extractedItems: ExtractedMenuItem[] = (data.FoodServiceEntries || []).map(entry => ({
        name: entry.name,
        description: entry.description,
        price: entry.price, // Assuming price is a string like "$X.YY"
      }));
      return { success: true, state: data.State, menuItems: extractedItems };
    } else {
      let errorMessage = `Backend API Error (polling status): ${response.status} ${response.statusText}.`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) { /* Failed to parse error */ }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
     return { success: false, message: `Network or unexpected error (polling status): ${error.message}` };
  }
}
