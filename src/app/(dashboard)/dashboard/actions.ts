
'use server';

import type { MenuInstance, MenuItem, MediaObject, DietaryIcon } from '@/lib/types';

const API_BASE_URL = "https://api.bityfan.com";
const S3_BUCKET_BASE_URL = "https://truevine-media-storage.s3.us-west-2.amazonaws.com/";

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

interface BackendMenuAnalyticsJson {
  timestamp_day: string;
  impressions: number;
  engagement_sec: number[];
  food_name: string;
  average_engagement: number;
}

interface BackendDigitalMenuJson {
  OwnerID: string;
  MenuID: string;
  // Reason: string;
  // State: string;
  ContextS3MediaUrls?: string | null; // CSV string of S3 object keys
  // ContextMediaText: string;
  // CreatedAt: string;
  // UpdatedAt: string;
  food_service_entries: BackendFoodServiceEntryJson[] | null;
  test_food_service_entries?: BackendFoodServiceEntryJson[] | null; // for A/B testing
  AllowABTesting?: boolean; // whether to allow A/B testing for this menu
  // Version: number;
  Analytics?: BackendMenuAnalyticsJson[] | null;
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
        const entriesToProcess = digitalMenu.food_service_entries;

        const menuItems: MenuItem[] = (entriesToProcess || []).map((entry, index) => {
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

          if (entry.food_category === "Vegan") {
            dietaryIcons.push('vegan');
          }
          if (entry.food_category === "Vegetarian") {
            dietaryIcons.push('vegetarian');
          }
          if (entry.food_category === "Gluten Free") {
            dietaryIcons.push('gluten-free');
          }
          
          if (backendAllergenTagsLower.some(tag => tag.includes('spicy') || tag.includes('hot'))) {
            dietaryIcons.push('spicy');
          }
          
          const uniqueDietaryIcons = Array.from(new Set(dietaryIcons));

          return {
            id: `${entry.name.replace(/\s+/g, '-')}-${digitalMenu.MenuID}-${index}`,
            name: entry.name,
            description: entry.description,
            price: formattedPrice,
            category: entry.food_category,
            media: mediaObjects,
            dietaryIcons: uniqueDietaryIcons,
          };
        });

        let s3ContextImageUrls: string[] = [];
        if (typeof digitalMenu.ContextS3MediaUrls === 'string' && digitalMenu.ContextS3MediaUrls.trim() !== '') {
          const s3Keys = digitalMenu.ContextS3MediaUrls.split(',').map(key => key.trim()).filter(key => key.length > 0);
          s3ContextImageUrls = s3Keys.map(key => `${S3_BUCKET_BASE_URL}${key}`);
        }

        return {
          id: digitalMenu.MenuID,
          name: digitalMenu.MenuID,
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
