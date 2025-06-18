
'use server';

import type { MenuInstance, MenuItem, MediaObject, DietaryIcon, BackendDigitalMenuJson, BackendFoodServiceEntryJson } from '@/lib/types';

const API_BASE_URL = "https://api.bityfan.com";

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
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const backendDigitalMenus: BackendDigitalMenuJson[] = await response.json();
      
      const transformedMenuInstances: MenuInstance[] = backendDigitalMenus.map(digitalMenu => {
        const menuItems: MenuItem[] = (digitalMenu.food_service_entries || []).map((entry, index) => {
          const formattedPrice = `$${(entry.price / 100).toFixed(2)}`;

          const mediaObjects: MediaObject[] = [];
          // Prioritize generated_blob_media_ref, then source_media_blob_ref
          const imageUrl = entry.generated_blob_media_ref || entry.source_media_blob_ref;
          
          if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
            let hint = '';
            const descriptionWords = entry.visual_description?.split(/\s+/) || [];
            const nameWords = entry.name?.split(/\s+/) || [];

            if (descriptionWords.length > 0 && descriptionWords[0]) {
                hint = descriptionWords.slice(0, 2).join(' ');
            } else if (nameWords.length > 0 && nameWords[0]) {
                hint = nameWords.slice(0, 2).join(' ');
            }
            if (hint.trim() === '') hint = 'food item';


            mediaObjects.push({
              type: 'image',
              url: imageUrl, // Assuming these refs are full URLs
              dataAiHint: hint,
            });
          } else if (imageUrl) {
            // If it's not a full URL, it might be an S3 key - handle as placeholder or construct URL if base is known
            // For now, if it's not a full URL, we won't add it to avoid errors
            // console.warn(`Media ref '${imageUrl}' for item '${entry.name}' is not a full URL. Skipping.`);
          }


          const dietaryIcons: DietaryIcon[] = [];
          const backendAllergenTagsLower = (entry.allergen_tags || []).map(tag => tag.toLowerCase());

          if (entry.food_category?.toLowerCase() === "vegan") {
            dietaryIcons.push('vegan');
          }
          if (entry.food_category?.toLowerCase() === "vegetarian") {
            dietaryIcons.push('vegetarian');
          }
          if (entry.food_category?.toLowerCase() === "gluten free") {
            dietaryIcons.push('gluten-free');
          }
          
          if (backendAllergenTagsLower.some(tag => tag.includes('spicy') || tag.includes('hot'))) {
            dietaryIcons.push('spicy');
          }
          
          const uniqueDietaryIcons = Array.from(new Set(dietaryIcons));

          return {
            id: `${entry.name.replace(/\s+/g, '-')}-${digitalMenu.MenuID}-${index}`, // Create a unique ID
            name: entry.name,
            description: entry.description,
            price: formattedPrice,
            category: entry.food_category,
            media: mediaObjects,
            dietaryIcons: uniqueDietaryIcons.length > 0 ? uniqueDietaryIcons : undefined,
          };
        });

        let s3ContextImageUrls: string[] = [];
        if (typeof digitalMenu.ContextS3MediaUrls === 'string' && digitalMenu.ContextS3MediaUrls.trim() !== '') {
          s3ContextImageUrls = digitalMenu.ContextS3MediaUrls.split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
        }

        return {
          id: digitalMenu.MenuID,
          name: digitalMenu.MenuID, // Use MenuID as the instance name for now
          menu: menuItems,
          s3ContextImageUrls: s3ContextImageUrls.length > 0 ? s3ContextImageUrls : undefined,
        };
      });
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
