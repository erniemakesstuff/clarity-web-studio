
'use server';

import type { AuthContextType } from '@/contexts/AuthContext';

const API_BASE_URL = "https://api.bityfan.com";

interface GetReceiptPresignedUrlParams {
  ownerId: string; // Hashed
  menuId: string;
  mediaType: string;
  // payload: string; // Removed: base64 encoded image is not sent to get the presigned URL
}

interface GetReceiptPresignedUrlResult {
  success: boolean;
  presignedUrl?: string;
  finalMediaUrl?: string;
  message?: string;
}

export async function getReceiptPresignedUploadUrl(
  params: GetReceiptPresignedUrlParams,
  jwtToken: string | null
): Promise<GetReceiptPresignedUrlResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";

    const requestBody = {
      ownerId: params.ownerId,
      menuId: params.menuId,
      mediaType: params.mediaType,
      // payload: params.payload, // Removed
    };

    const response = await fetch(`${API_BASE_URL}/ris/v1/receipt/context`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationValue,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (response.ok) {
      const resultJson = JSON.parse(responseText);
      if (resultJson.mediaURL) { 
        const finalMediaUrl = resultJson.mediaURL.split('?')[0]; 
        return { success: true, presignedUrl: resultJson.mediaURL, finalMediaUrl: finalMediaUrl };
      } else {
        return { success: false, message: "Backend did not return a mediaURL in the expected format for receipt." };
      }
    } else {
      let errorMessage = `Backend API Error (getting receipt presigned URL): ${response.status} ${response.statusText}.`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
         errorMessage += ` Raw response: ${responseText.substring(0, 200)}`;
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while requesting receipt presigned URL.";
    if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for receipt presigned URL.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding for receipt presigned URL.`;
    } else if (error.message && error.message.toLowerCase().includes("terminated")) {
        detailedErrorMessage = `The PUT request to ${API_BASE_URL}/ris/v1/receipt/context for a presigned URL was unexpectedly terminated. This could indicate a network issue, or the service rejecting the request. Ensure the backend endpoint is not expecting a large payload for this URL generation step. Original error: ${error.message}`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred (requesting receipt presigned URL): ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}

interface ReceiptReconcileParams {
  ownerId: string; // Hashed
  menuId: string;
  imageUrl: string; // Final S3 URL (without query params)
}

interface ReceiptReconcileResult {
  success: boolean;
  message?: string;
  reconciliationData?: any; 
}

export async function reconcileReceiptWithBackend(
  params: ReceiptReconcileParams,
  jwtToken: string | null
): Promise<ReceiptReconcileResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    const requestBody = {
      ownerId: params.ownerId,
      menuId: params.menuId,
      imageUrl: params.imageUrl,
    };

    const response = await fetch(`${API_BASE_URL}/ris/v1/receipt/reconcile`, { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationValue,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (response.ok) {
      let reconciliationData;
      try {
        reconciliationData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        reconciliationData = { info: "Receipt submitted for reconciliation."}
      }
      return { success: true, message: "Receipt submitted for reconciliation.", reconciliationData };
    } else {
      let errorMessage = `Backend API Error (reconciling receipt): ${response.status} ${response.statusText}.`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        errorMessage += ` Raw response: ${responseText.substring(0, 200)}`;
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {    
    let detailedErrorMessage = "Failed to communicate with the backend service while reconciling receipt.";
    if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for receipt reconcile.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding for receipt reconcile.`;
    } else if (error.message && error.message.toLowerCase().includes("terminated")) {
        detailedErrorMessage = `The POST request to ${API_BASE_URL}/ris/v1/receipt/reconcile was unexpectedly terminated. This could be a network issue or a problem with the external service. Please check the backend logs for this specific endpoint. Original error: ${error.message}`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred (reconciling receipt): ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}

