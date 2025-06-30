
'use server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface GrantAccessParams {
    targetUserId: string;
    grantToAdd: string; // e.g., "owner123:menuABC"
    jwtToken: string | null;
}

interface GrantAccessResult {
    success: boolean;
    message?: string;
}

export async function grantMenuAccessToUser(params: GrantAccessParams): Promise<GrantAccessResult> {
    const { targetUserId, grantToAdd, jwtToken } = params;

    try {
        const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
        
        // The backend is expected to handle appending this grant to the user's existing grants.
        const requestBody = {
            userId: targetUserId,
            menuGrants: [grantToAdd],
        };

        const response = await fetch(`${API_BASE_URL}/ris/v1/user`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationValue,
            },
            body: JSON.stringify(requestBody),
        });

        if (response.ok) {
            return { success: true, message: 'Menu access granted successfully.' };
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
        let detailedErrorMessage = `Failed to grant access.`;
        if (error.message.toLowerCase().includes('fetch failed')) {
            detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL}.`;
        } else {
            detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
        }
        return { success: false, message: detailedErrorMessage };
    }
}
