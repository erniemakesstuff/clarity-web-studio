
'use server';

import type { AuthContextType } from '@/contexts/AuthContext'; 
import type { ExtractedMenuItem, DigitalMenuState, BackendDigitalMenuPollResponse, PollWorkflowStatusResult, MenuItem as FrontendMenuItem, OverrideSchedule, CurrencyCode } from '@/lib/types';


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface GetPresignedUrlParams {
  ownerId: string; // Hashed
  menuId: string;
  mediaType: string; 
  // payload: string; // Removed: base64 encoded image is not sent to get the presigned URL
}

interface GetPresignedUrlResult {
  success: boolean;
  mediaURL?: string; 
  finalMediaUrl?: string; 
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
      // payload: params.payload, // Removed
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

    const responseText = await response.text();

    if (response.ok) {
      const resultJson = JSON.parse(responseText);
      if (resultJson.mediaURL) {
        const finalMediaUrl = resultJson.mediaURL.split('?')[0];
        return { success: true, mediaURL: resultJson.mediaURL, finalMediaUrl: finalMediaUrl };
      } else {
        return { success: false, message: "Backend did not return a mediaURL in the expected format." };
      }
    } else {
      let errorMessage = `Backend API Error (getting presigned URL): ${response.status} ${response.statusText}.`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
         errorMessage += ` Raw response: ${responseText.substring(0, 200)}`;
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while requesting presigned URL.";
     if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for presigned URL. Please check server status and network connectivity.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding for presigned URL. Please ensure the service is running.`;
    } else if (error.message && error.message.toLowerCase().includes("terminated")) {
        detailedErrorMessage = `The PUT request to ${API_BASE_URL}/ris/v1/menu/context for a presigned URL was unexpectedly terminated. Ensure the backend endpoint is not expecting a large payload for this URL generation step. Original error: ${error.message}`;
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
  ownerId: string, // Hashed
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
      return { success: true };
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
  ownerId: string, // Hashed
  menuId: string,
  jwtToken: string | null
): Promise<PollWorkflowStatusResult> {
  let response: Response;
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    response = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${ownerId}&menuId=${menuId}&asMini=false`, {
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
          price: String(entry.price), 
        }));

        let s3ImageFullUrls: string[] = [];
        if (typeof data.ContextS3MediaUrls === 'string' && data.ContextS3MediaUrls.trim() !== '') {
          s3ImageFullUrls = data.ContextS3MediaUrls.split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https')));
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

interface BackendFoodServiceEntry {
  food_category: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergen_tags: string[] | null;
  source_media_blob_ref: string | null;
  visual_description: string | null;
  generated_blob_media_ref: string | null;
  you_may_also_like: string[] | null;
  display_order: number;
  price: number; // in cents
}

interface UpdateMenuItemOnBackendParams {
  ownerId: string; // Hashed
  menuId: string;
  targetEntryName: string; 
  itemData: FrontendMenuItem; 
  jwtToken: string | null;
}

interface UpdateMenuItemOnBackendResult {
  success: boolean;
  message?: string;
}

export async function updateMenuItemOnBackend(
  params: UpdateMenuItemOnBackendParams
): Promise<UpdateMenuItemOnBackendResult> {
  const { ownerId, menuId, targetEntryName, itemData, jwtToken } = params;

  let priceInCents = 0;
  if (itemData.price) {
    const numericPrice = parseFloat(itemData.price.replace(/[^\d.-]/g, ''));
    if (!isNaN(numericPrice)) {
      priceInCents = Math.round(numericPrice * 100);
    }
  }

  const backendEntry: BackendFoodServiceEntry = {
    food_category: itemData.category || "Other",
    name: itemData.name,
    description: itemData.description || null,
    ingredients: itemData.ingredients || null,
    allergen_tags: itemData.allergenTags || null,
    source_media_blob_ref: null, 
    visual_description: itemData._tempVisualDescriptionForSave || itemData.name, // Use the persisted hint or name
    generated_blob_media_ref: itemData.media && itemData.media.length > 0 && itemData.media[0].type === 'image' ? itemData.media[0].url : null,
    you_may_also_like: itemData.youMayAlsoLike || null,
    display_order: itemData.displayOrder !== undefined ? itemData.displayOrder : 0,
    price: priceInCents,
  };

  const requestBody = {
    ownerId,
    menuId,
    isControl: true,
    targetEntryName,
    entry: backendEntry,
  };

  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    const response = await fetch(`${API_BASE_URL}/ris/v1/menu/item`, {
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
      return { success: true, message: "Menu item updated successfully on backend." };
    } else {
      let errorMessage = `Backend API Error (updating item): ${response.status} ${response.statusText}.`;
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage += ` Response body: ${responseText.substring(0, 200)}`;
        }
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while updating menu item.";
    if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for item update.`;
    } else if (error.message && error.message.includes("ECONNREFUSED")) {
        detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding for item update.`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred (updating item): ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}


interface PatchDigitalMenuRequest {
  ownerId: string;
  menuId: string;
  overrideSchedules?: OverrideSchedule[];
  currencyCode?: CurrencyCode;
}

interface PatchDigitalMenuResult {
  success: boolean;
  message?: string;
}

export async function patchDigitalMenu(
  params: PatchDigitalMenuRequest,
  jwtToken: string | null
): Promise<PatchDigitalMenuResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    
    // Construct the body explicitly to ensure only intended fields are sent
    const requestBody: { [key: string]: any } = {
        ownerId: params.ownerId,
        menuId: params.menuId,
    };
    if (params.overrideSchedules) {
        requestBody.overrideSchedules = params.overrideSchedules;
    }
    if (params.currencyCode) {
        requestBody.currencyCode = params.currencyCode;
    }

    const response = await fetch(`${API_BASE_URL}/ris/v1/menu`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorizationValue,
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      return { success: true, message: "Menu settings updated successfully." };
    } else {
      const errorText = await response.text();
      let errorMessage = `Backend error updating menu settings: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        errorMessage += ` Raw response: ${errorText.substring(0, 200)}`;
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = `Failed to communicate with backend to update menu settings.`;
    if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
      detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} for menu settings update.`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}
