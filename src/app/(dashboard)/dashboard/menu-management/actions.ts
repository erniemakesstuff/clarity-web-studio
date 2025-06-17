
'use server';

import type { AuthContextType } from '@/contexts/AuthContext'; // Only for type, not direct use

const API_BASE_URL = "https://api.bityfan.com";

interface GetPresignedUrlParams {
  ownerId: string;
  menuId: string;
  mediaType: string;
  payload: string; // base64 encoded image data
}

interface GetPresignedUrlResult {
  success: boolean;
  mediaURL?: string; // This is the S3 presigned URL for client upload
  finalMediaUrl?: string; // Optional: if backend provides the actual final URL post-upload differently
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
        // Assuming mediaURL is the presigned URL client should use for PUT
        return { success: true, mediaURL: resultJson.mediaURL, finalMediaUrl: resultJson.mediaURL };
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

