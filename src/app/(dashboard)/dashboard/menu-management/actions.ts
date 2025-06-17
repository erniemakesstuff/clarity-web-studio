
'use server';

import type { AuthContextType } from '@/contexts/AuthContext'; // Only for type, not direct use
import type { ExtractedMenuItem, DigitalMenuState, BackendDigitalMenuPollResponse, PollWorkflowStatusResult } from '@/lib/types';
import type { MenuItemCore } from '@/lib/types';


const API_BASE_URL = "https://api.bityfan.com";
const S3_BUCKET_BASE_URL = "https://truevine-media-storage.s3.us-west-2.amazonaws.com/"; // Define this base URL

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
      mediaType: params.mediaType, 
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
  let response: Response;
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    response = await fetch(`${API_BASE_URL}/ris/v1/menu/start-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationValue,
        "Accept": "application/json",
      },
      body: JSON.stringify({ ownerId, menuId }),
    });

    const responseText = await response.text(); 

    if (response.ok) {
      if (!responseText) {
        return { success: true, message: "Workflow started, but backend returned an empty success response." };
      }
      try {
        // Attempt to parse if there's content, but succeed even if it's not JSON for 2xx.
        // JSON.parse(responseText); 
        return { success: true };
      } catch (jsonError) {
        return { success: true, message: "Workflow started, but backend returned a non-JSON success response." };
      }
    } else {
      let errorMessage = `Backend API Error (starting workflow): ${response.status} ${response.statusText}.`;
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText); 
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) { 
          errorMessage += ` Response body: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`;
        }
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while starting workflow.";
    if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for starting workflow. Please check server status and network connectivity.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding for starting workflow. Please ensure the service is running.`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred (starting workflow): ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}


export async function pollWorkflowStatus(
  ownerId: string,
  menuId: string,
  jwtToken: string | null
): Promise<PollWorkflowStatusResult> {
  let response: Response;
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    response = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${encodeURIComponent(ownerId)}&menuId=${encodeURIComponent(menuId)}`, {
      method: "GET",
      headers: {
        "Authorization": authorizationValue,
        "Accept": "application/json", 
      },
    });

    const responseText = await response.text(); 

    if (response.ok) {
      if (!responseText) {
        return { success: false, message: "Polling successful, but backend returned an empty response body." };
      }
      try {
        const data: BackendDigitalMenuPollResponse = JSON.parse(responseText);
        const extractedItems: ExtractedMenuItem[] = (data.FoodServiceEntries || []).map(entry => ({
          name: entry.name,
          description: entry.description,
          price: String(entry.price), // Assuming price might be number, ensure string
        }));

        let s3ImageFullUrls: string[] = [];
        if (typeof data.ContextS3MediaUrls === 'string' && data.ContextS3MediaUrls.trim() !== '') {
          const s3Keys = data.ContextS3MediaUrls.split(',').map(key => key.trim()).filter(key => key.length > 0);
          s3ImageFullUrls = s3Keys.map(key => `${S3_BUCKET_BASE_URL}${key}`);
        }
        
        return { 
          success: true, 
          state: data.State, 
          menuItems: extractedItems,
          s3ContextImageUrls: s3ImageFullUrls.length > 0 ? s3ImageFullUrls : undefined,
        };
      } catch (jsonError: any) {
        return { 
          success: false, 
          message: `Polling successful, but failed to parse JSON response: ${jsonError.message}. Response text: ${responseText.substring(0,200)}`
        };
      }
    } else {
      let errorMessage = `Backend API Error (polling status): ${response.status} ${response.statusText}.`;
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText); 
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage += ` Response body: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`;
        }
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
     let detailedErrorMessage = "Failed to communicate with the backend service while polling status.";
     if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for polling. Please check server status and network connectivity.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding for polling. Please ensure the service is running.`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred (polling status): ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}
