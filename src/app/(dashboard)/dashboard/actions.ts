
'use server';

import type { MenuInstance, MenuItem, MediaObject, DietaryIcon } from '@/lib/types';

const API_BASE_URL = "https://api.bityfan.com";

// Interfaces matching the backend JSON structure
interface BackendFoodServiceEntryJson {
  food_category: string;
  name: string;
  description: string;
  ingredients: string; 
  allergen_tags: string[];
  source_media_blob_ref?: string;
  visual_description?: string;
  generated_blob_media_ref?: string;
  you_may_also_like: string[]; 
  display_order: number; 
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
          const formattedPrice = `$${(entry.price / 100).toFixed(2)}`;

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
              type: 'image', 
              url: imageUrl,
              dataAiHint: hint,
            });
          }

          const dietaryIcons: DietaryIcon[] = [];
          const backendAllergenTagsLower = (entry.allergen_tags || []).map(tag => tag.toLowerCase());

          // Map based on food_category for specific dietary properties
          if (entry.food_category === "Vegan") {
            dietaryIcons.push('vegan');
          }
          if (entry.food_category === "Vegetarian") {
            dietaryIcons.push('vegetarian');
          }
          if (entry.food_category === "Gluten Free") {
            dietaryIcons.push('gluten-free');
          }
          
          // Retain existing logic for "spicy" from allergen_tags, as it's not a formal category/allergen provided
          if (backendAllergenTagsLower.some(tag => tag.includes('spicy') || tag.includes('hot'))) {
            dietaryIcons.push('spicy');
          }
          
          const uniqueDietaryIcons = Array.from(new Set(dietaryIcons));

          return {
            id: `${entry.name.replace(/\s+/g, '-')}-${digitalMenu.MenuID}-${index}`, // Create a more unique ID
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
          name: digitalMenu.MenuID, 
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

