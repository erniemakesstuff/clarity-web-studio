
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
        const menuItems: MenuItem[] = (digitalMenu.FoodServiceEntries || []).map((entry, index) => {
          const itemName = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim() : `Unnamed Item ${index + 1}`;
          const itemDescription = typeof entry.description === 'string' ? entry.description : "";
          const itemPrice = typeof entry.price === 'number' ? entry.price : 0;
          const formattedPrice = `$${(itemPrice / 100).toFixed(2)}`;

          const mediaObjects: MediaObject[] = [];
          const imageUrl = entry.generated_blob_media_ref || entry.source_media_blob_ref;
          
          let dataAiHint = 'food item'; // Default hint
          const visualDesc = typeof entry.visual_description === 'string' ? entry.visual_description.trim() : '';
          const entryNameForHint = typeof entry.name === 'string' ? entry.name.trim() : '';

          if (visualDesc) {
              dataAiHint = visualDesc.split(/\s+/).slice(0, 2).join(' ');
          } else if (entryNameForHint) {
              dataAiHint = entryNameForHint.split(/\s+/).slice(0, 2).join(' ');
          }
          if (dataAiHint.trim() === '') dataAiHint = 'food item'; // Final fallback

          if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
            mediaObjects.push({
              type: 'image',
              url: imageUrl,
              dataAiHint: dataAiHint,
            });
          }

          const dietaryIcons: DietaryIcon[] = [];
          const foodCategoryLower = typeof entry.food_category === 'string' ? entry.food_category.toLowerCase() : '';
          const backendAllergenTagsLower = (Array.isArray(entry.allergen_tags) ? entry.allergen_tags : [])
            .map(tag => typeof tag === 'string' ? tag.toLowerCase() : '')
            .filter(tag => tag !== '');

          if (foodCategoryLower === "vegan") {
            dietaryIcons.push('vegan');
          }
          if (foodCategoryLower === "vegetarian" || dietaryIcons.includes('vegan')) {
            dietaryIcons.push('vegetarian');
          }
          if (foodCategoryLower.includes("gluten free") || backendAllergenTagsLower.includes("gluten-free") || backendAllergenTagsLower.includes("gluten free")) {
            dietaryIcons.push('gluten-free');
          }
          if (backendAllergenTagsLower.some(tag => tag.includes('spicy') || tag.includes('hot'))) {
            dietaryIcons.push('spicy');
          }
          
          const uniqueDietaryIcons = Array.from(new Set(dietaryIcons));
          const safeItemNameForId = itemName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
          const currentMenuId = typeof digitalMenu.MenuID === 'string' ? digitalMenu.MenuID : 'unknown-menu';


          return {
            id: `${safeItemNameForId}-${currentMenuId}-${index}`,
            name: itemName,
            description: itemDescription,
            price: formattedPrice,
            category: typeof entry.food_category === 'string' ? entry.food_category : "Other",
            media: mediaObjects.length > 0 ? mediaObjects : undefined,
            dietaryIcons: uniqueDietaryIcons.length > 0 ? uniqueDietaryIcons : undefined,
            ingredients: typeof entry.ingredients === 'string' ? entry.ingredients : undefined,
            allergenTags: Array.isArray(entry.allergen_tags) ? entry.allergen_tags.filter(tag => typeof tag === 'string') as string[] : undefined,
            youMayAlsoLike: Array.isArray(entry.you_may_also_like) ? entry.you_may_also_like.filter(yml => typeof yml === 'string') as string[] : undefined,
            displayOrder: typeof entry.display_order === 'number' ? entry.display_order : undefined,
            _tempVisualDescriptionForSave: dataAiHint, 
          };
        });

        let s3ContextImageUrls: string[] = [];
        if (typeof digitalMenu.ContextS3MediaUrls === 'string' && digitalMenu.ContextS3MediaUrls.trim() !== '') {
          s3ContextImageUrls = digitalMenu.ContextS3MediaUrls.split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
        }
        
        const menuIdToUse = typeof digitalMenu.MenuID === 'string' && digitalMenu.MenuID.trim() !== '' ? digitalMenu.MenuID.trim() : `menu-${index}`;


        return {
          id: menuIdToUse,
          name: menuIdToUse, 
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
