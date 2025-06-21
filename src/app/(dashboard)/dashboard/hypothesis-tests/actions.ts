
'use server';

const API_BASE_URL = "https://api.bityfan.com";

interface PatchMenuSettingsParams {
  ownerId: string;
  menuId: string;
  allowABTesting: boolean;
  jwtToken: string | null;
}

interface PatchMenuSettingsResult {
  success: boolean;
  message?: string;
}

export async function patchMenuSettings(params: PatchMenuSettingsParams): Promise<PatchMenuSettingsResult> {
    const { ownerId, menuId, allowABTesting, jwtToken } = params;

    try {
        const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
        const response = await fetch(`${API_BASE_URL}/ris/v1/menu`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationValue,
            },
            body: JSON.stringify({
                ownerId,
                menuId,
                allowABTesting,
            }),
        });

        if (response.ok) {
            return { success: true, message: 'A/B testing setting updated successfully.' };
        } else {
            let errorMessage = `Backend error: ${response.status}`;
            try {
                 const errorData = await response.json();
                 errorMessage = errorData.message || errorMessage;
            } catch(e) {
                // Ignore if response is not json
            }
            return { success: false, message: errorMessage };
        }
    } catch (error: any) {
        let detailedErrorMessage = `Failed to update settings.`;
        if (error.message.toLowerCase().includes('fetch failed')) {
            detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL}.`;
        } else {
            detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
        }
        return { success: false, message: detailedErrorMessage };
    }
}
