
'use server';

const API_BASE_URL = "https://api.bityfan.com";

interface PatchMenuPayload {
  allowABTesting?: boolean;
  testGoal?: string;
}

interface PatchMenuParams {
  ownerId: string;
  menuId: string;
  payload: PatchMenuPayload;
  jwtToken: string | null;
}

interface PatchMenuResult {
  success: boolean;
  message?: string;
}

export async function patchMenu(params: PatchMenuParams): Promise<PatchMenuResult> {
    const { ownerId, menuId, payload, jwtToken } = params;

    try {
        const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
        
        const requestBody = {
            ownerId,
            menuId,
            ...payload,
        };

        const response = await fetch(`${API_BASE_URL}/ris/v1/menu`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationValue,
            },
            body: JSON.stringify(requestBody),
        });

        if (response.ok) {
            return { success: true, message: 'Menu settings updated successfully.' };
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


interface StartABTestParams {
    ownerId: string;
    menuId: string;
    jwtToken: string | null;
}

interface StartABTestResult {
    success: boolean;
    message?: string;
}

export async function startABTestWorkflow(params: StartABTestParams): Promise<StartABTestResult> {
    const { ownerId, menuId, jwtToken } = params;
    try {
        const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
        const response = await fetch(`${API_BASE_URL}/ris/v1/menu/start-ab-test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationValue,
            },
            body: JSON.stringify({
                ownerId,
                menuId,
            }),
        });

        if (response.ok) {
            return { success: true, message: 'A/B test workflow started successfully.' };
        } else {
             let errorMessage = `Backend error starting A/B test: ${response.status}`;
            try {
                 const errorData = await response.json();
                 errorMessage = errorData.message || errorMessage;
            } catch(e) {
                // Ignore if response is not json
            }
            return { success: false, message: errorMessage };
        }

    } catch (error: any) {
        let detailedErrorMessage = `Failed to start A/B test workflow.`;
        if (error.message.toLowerCase().includes('fetch failed')) {
            detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL}.`;
        } else {
            detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
        }
        return { success: false, message: detailedErrorMessage };
    }
}
