
'use server';

import type { MenuInstance, MenuItem, MediaObject, DietaryIcon } from '@/lib/types';

const API_BASE_URL = "https://api.bityfan.com";

// Interfaces matching the backend JSON structure
interface BackendFoodServiceEntryJson {
  food_category: string;
  name: string;
  description: string;
  ingredients: string; // Available from backend, not currently in frontend MenuItem
  allergen_tags: string[];
  source_media_blob_ref?: string;
  visual_description?: string;
  generated_blob_media_ref?: string;
  you_may_also_like: string[]; // Available, not currently in frontend MenuItem
  display_order: number; // Available, not currently in frontend MenuItem
  price: number; // Assuming cents
}

interface BackendDigitalMenuJson {
  OwnerID: string; 
  MenuID: string;
  // Reason: string;
  // State: string; // Assuming DigitalMenuState is a string type from backend
  // ContextS3MediaUrls: string;
  // ContextMediaText: string;
  // CreatedAt: string; // Assuming time.Time is serialized to string
  // UpdatedAt: string;
  food_service_entries: BackendFoodServiceEntryJson[] | null; // Can be null
  // Version: number;
}


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
          // Price formatting (assuming price is in cents)
          const formattedPrice = `$${(entry.price / 100).toFixed(2)}`;

          // Media object
          const mediaObjects: MediaObject[] = [];
          const imageUrl = entry.generated_blob_media_ref || entry.source_media_blob_ref;
          if (imageUrl) {
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
              type: 'image', // Assuming image type for now
              url: imageUrl,
              dataAiHint: hint,
            });
          }

          // Dietary icons mapping
          const dietaryIcons: DietaryIcon[] = [];
          const tagsLower = (entry.allergen_tags || []).map(tag => tag.toLowerCase());
          
          if (tagsLower.some(tag => tag.includes('vegetarian'))) dietaryIcons.push('vegetarian');
          if (tagsLower.some(tag => tag.includes('vegan'))) dietaryIcons.push('vegan');
          if (tagsLower.some(tag => tag.includes('gluten-free') || tag.includes('gluten free'))) dietaryIcons.push('gluten-free');
          if (tagsLower.some(tag => tag.includes('spicy') || tag.includes('hot'))) dietaryIcons.push('spicy');
          
          // Ensure unique icons
          const uniqueDietaryIcons = Array.from(new Set(dietaryIcons));

          return {
            id: `${entry.name.replace(/\s+/g, '-')}-${index}`, // Create a unique ID for MenuItem
            name: entry.name,
            description: entry.description,
            price: formattedPrice,
            category: entry.food_category,
            media: mediaObjects,
            dietaryIcons: uniqueDietaryIcons,
          };
        });

        return {
          id: digitalMenu.MenuID,
          name: digitalMenu.MenuID, // Use MenuID as name by default
          menu: menuItems,
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
