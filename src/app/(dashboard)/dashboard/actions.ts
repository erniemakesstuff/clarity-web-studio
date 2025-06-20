
'use server';

import type { MenuInstance, MenuItem, MediaObject, DietaryIcon, BackendDigitalMenuJson, BackendFoodServiceEntryJson } from '@/lib/types';

const API_BASE_URL = "https://api.bityfan.com";

interface FetchMenuInstancesResult {
  success: boolean;
  menuInstances?: MenuInstance[];
  message?: string;
}

export async function fetchMenuInstancesFromBackend(
  ownerId: string, // This is expected to be the hashed ownerId
  jwtToken: string | null
): Promise<FetchMenuInstancesResult> {
  try {
    const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
    // Use ownerId directly as it's pre-hashed and should be URL-safe
    const response = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${ownerId}`, {
      method: "GET",
      headers: {
        "Authorization": authorizationValue,
        "Accept": "application/json",
      },
    });

    if (response.ok) {
      const backendDigitalMenus: BackendDigitalMenuJson[] = await response.json();
      
      const transformedMenuInstances: MenuInstance[] = backendDigitalMenus.map((digitalMenu, menuIndex) => {
        const menuItems: MenuItem[] = (digitalMenu.FoodServiceEntries || []).map((entry, itemIndex) => {
          try {
            const itemName = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim() : `Unnamed Item ${itemIndex + 1}`;
            const itemDescription = typeof entry.description === 'string' ? entry.description : "";
            const itemPrice = typeof entry.price === 'number' ? entry.price : 0;
            const formattedPrice = `$${(itemPrice / 100).toFixed(2)}`;

            const mediaObjects: MediaObject[] = [];
            const imageUrl = entry.generated_blob_media_ref || entry.source_media_blob_ref;
            
            let dataAiHint = 'food item'; 
            const visualDesc = typeof entry.visual_description === 'string' ? entry.visual_description.trim() : '';
            const entryNameForHint = typeof entry.name === 'string' ? entry.name.trim() : '';

            if (visualDesc) {
                dataAiHint = visualDesc.split(/\s+/).slice(0, 2).join(' ');
            } else if (entryNameForHint) {
                dataAiHint = entryNameForHint.split(/\s+/).slice(0, 2).join(' ');
            }
            if (dataAiHint.trim() === '') dataAiHint = 'food item';

            if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
              mediaObjects.push({
                type: 'image',
                url: imageUrl,
                dataAiHint: dataAiHint,
              });
            }

            const dietaryIcons: DietaryIcon[] = [];
            const foodCategoryLower = typeof entry.food_category === 'string' ? entry.food_category.toLowerCase() : '';
            const backendAllergenTagsRaw = entry.allergen_tags;
            const backendAllergenTagsLower = (Array.isArray(backendAllergenTagsRaw) ? backendAllergenTagsRaw : [])
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
            const currentMenuId = typeof digitalMenu.MenuID === 'string' && digitalMenu.MenuID.trim() !== '' ? digitalMenu.MenuID.trim() : `unknown-menu-${menuIndex}`;

            return {
              id: `${safeItemNameForId}-${currentMenuId}-${itemIndex}`,
              name: itemName,
              description: itemDescription,
              price: formattedPrice,
              category: typeof entry.food_category === 'string' && entry.food_category.trim() !== '' ? entry.food_category : "Other",
              media: mediaObjects.length > 0 ? mediaObjects : undefined,
              dietaryIcons: uniqueDietaryIcons.length > 0 ? uniqueDietaryIcons : undefined,
              ingredients: typeof entry.ingredients === 'string' ? entry.ingredients : undefined,
              allergenTags: Array.isArray(entry.allergen_tags) ? entry.allergen_tags.filter(tag => typeof tag === 'string') as string[] : undefined,
              youMayAlsoLike: Array.isArray(entry.you_may_also_like) ? entry.you_may_also_like.filter(yml => typeof yml === 'string') as string[] : undefined,
              displayOrder: typeof entry.display_order === 'number' ? entry.display_order : undefined,
              _tempVisualDescriptionForSave: dataAiHint, 
            };
          } catch (transformError: any) {
            console.error(`Error transforming menu item at index ${itemIndex} (Original Name: ${entry?.name}, Owner Hashed: ${ownerId}, Menu: ${digitalMenu?.MenuID}): ${transformError.message}`, transformError.stack);
            return null; 
          }
        }).filter((item): item is MenuItem => item !== null);

        let s3ContextImageUrls: string[] = [];
        if (typeof digitalMenu.ContextS3MediaUrls === 'string' && digitalMenu.ContextS3MediaUrls.trim() !== '') {
          s3ContextImageUrls = digitalMenu.ContextS3MediaUrls.split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https')));
        }
        
        const menuIdToUse = typeof digitalMenu.MenuID === 'string' && digitalMenu.MenuID.trim() !== '' ? digitalMenu.MenuID.trim() : `menu-${menuIndex}`;

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
      let responseBodyText = "";
      try {
        responseBodyText = await response.text();
        const errorData = JSON.parse(responseBodyText); 
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        if (responseBodyText) {
          errorMessage += ` Raw response: ${responseBodyText.substring(0, 500)}`; 
        } else {
          errorMessage += ' Failed to read error response body.';
        }
      }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while fetching menus.";
    if (error && typeof error.message === 'string') { 
        if (error.message.toLowerCase().includes("failed to fetch")) {
            detailedErrorMessage = `Network error: Could not reach the backend service at ${API_BASE_URL} to fetch menus. Please check server status and network connectivity.`;
        } else if (error.message.includes("ECONNREFUSED")) {
            detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding. Please ensure the service is running.`;
        } else {
            detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
        }
    } else if (error) {
        detailedErrorMessage = `An unexpected error occurred: ${String(error)}`;
    }
    return { success: false, message: detailedErrorMessage, menuInstances: [] };
  }
}
    
