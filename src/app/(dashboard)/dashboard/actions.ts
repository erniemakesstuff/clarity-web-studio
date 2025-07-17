
'use server';

import type { MenuInstance, MenuItem, MediaObject, DietaryIcon, BackendDigitalMenuJson, AnalyticsEntry, BackendFoodServiceEntryJson, OverrideSchedule } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

function transformBackendEntriesToMenuItems(
    entries: BackendFoodServiceEntryJson[] | null | undefined,
    menuId: string
): MenuItem[] {
    if (!entries) return [];
    
    return entries.map((entry, itemIndex) => {
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

            return {
              id: `${safeItemNameForId}-${menuId}-${itemIndex}`,
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
            console.error(`Error transforming menu item at index ${itemIndex} (Original Name: ${entry?.name}, Menu: ${menuId}): ${transformError.message}`, transformError.stack);
            return null;
          }
    }).filter((item): item is MenuItem => item !== null);
}


interface FetchMenuInstancesResult {
  success: boolean;
  menuInstances?: MenuInstance[];
  message?: string;
  rawResponseTexts?: string[];
}

const transformBackendMenu = (digitalMenu: BackendDigitalMenuJson, menuIndex: number = 0): MenuInstance | null => {
    if (!digitalMenu || typeof digitalMenu.MenuID !== 'string') {
        console.warn(`Skipping invalid menu structure at index ${menuIndex}. MenuID: ${digitalMenu?.MenuID}`);
        return null;
    }

    const menuIdToUse = digitalMenu.MenuID.trim() || `menu-${menuIndex}-${Date.now()}`;
    
    const menuItems = transformBackendEntriesToMenuItems(digitalMenu.food_service_entries, menuIdToUse);
    const testMenuItems = transformBackendEntriesToMenuItems(digitalMenu.test_food_service_entries, menuIdToUse);

    let s3ContextImageUrls: string[] = [];
    if (typeof digitalMenu.ContextS3MediaUrls === 'string' && digitalMenu.ContextS3MediaUrls.trim() !== '') {
        s3ContextImageUrls = digitalMenu.ContextS3MediaUrls.split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https')));
    }

    const allowAB = digitalMenu.AllowABTesting === true;
    
    const overrideSchedules: OverrideSchedule[] = Array.isArray(digitalMenu.override_schedules) ? digitalMenu.override_schedules.filter(s => 
        typeof s.food_name === 'string' &&
        typeof s.start_time === 'string' &&
        typeof s.end_time === 'string' &&
        typeof s.display_order_override === 'number'
    ) : [];

    return {
        id: menuIdToUse,
        name: menuIdToUse,
        menu: menuItems,
        testMenu: testMenuItems.length > 0 ? testMenuItems : undefined,
        s3ContextImageUrls: s3ContextImageUrls,
        analytics: digitalMenu.Analytics || [],
        allowABTesting: allowAB,
        testGoal: digitalMenu.test_goal,
        testHypothesis: digitalMenu.test_hypothesis,
        testHistory: digitalMenu.test_history,
        overrideSchedules: overrideSchedules,
    };
};

export async function fetchMenuInstancesFromBackend(
  ownerId: string,
  menuGrants: string[] | undefined,
  jwtToken: string | null
): Promise<FetchMenuInstancesResult> {
  const authorizationValue = jwtToken ? `Bearer ${jwtToken}` : "Bearer no jwt present";
  const allRawResponses: string[] = [];
  const menuMap = new Map<string, MenuInstance>();

  try {
    // 1. Fetch all menus owned by the user
    const ownedResponse = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${ownerId}&asMini=false`, {
      method: "GET",
      headers: { "Authorization": authorizationValue, "Accept": "application/json" },
    });
    
    const ownedResponseText = await ownedResponse.text();
    allRawResponses.push(ownedResponseText);

    if (ownedResponse.ok) {
        const ownedMenusJson = JSON.parse(ownedResponseText);
        const ownedMenus: BackendDigitalMenuJson[] = Array.isArray(ownedMenusJson) ? ownedMenusJson : [ownedMenusJson];
        ownedMenus.forEach((menuJson, index) => {
            const menuInstance = transformBackendMenu(menuJson, index);
            if (menuInstance) {
                const mapKey = `${menuJson.OwnerID}:${menuJson.MenuID}`;
                menuMap.set(mapKey, menuInstance);
            }
        });
    } else {
        console.error(`Failed to fetch owned menus for ${ownerId}. Status: ${ownedResponse.status}. Body: ${ownedResponseText}`);
        return { success: false, message: `Failed to fetch owned menus. Status: ${ownedResponse.status}` };
    }

    // 2. Fetch menus from grants, avoiding duplicates
    if (menuGrants && menuGrants.length > 0) {
        for (const grant of menuGrants) {
            const [grantOwnerId, grantMenuId] = grant.split(':');
            const mapKey = `${grantOwnerId}:${grantMenuId}`;

            if (!menuMap.has(mapKey)) { // Only fetch if not already loaded
                const grantResponse = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${grantOwnerId}&menuId=${grantMenuId}&asMini=false`, {
                    method: "GET",
                    headers: { "Authorization": authorizationValue, "Accept": "application/json" },
                    cache: 'no-store', // Grants might be for individual, specific menus
                });
                const grantResponseText = await grantResponse.text();
                allRawResponses.push(grantResponseText);

                if (grantResponse.ok) {
                    const grantedMenuJson = JSON.parse(grantResponseText);
                    // Handle both single object and array response for granted menus
                    const grantedMenus: BackendDigitalMenuJson[] = Array.isArray(grantedMenuJson) ? grantedMenuJson : [grantedMenuJson];
                    grantedMenus.forEach((menuJson) => {
                       const menuInstance = transformBackendMenu(menuJson);
                       if (menuInstance) {
                           menuMap.set(mapKey, menuInstance);
                       }
                    });
                } else {
                    console.warn(`Could not fetch granted menu ${grant}. Status: ${grantResponse.status}.`);
                }
            }
        }
    }

    const finalMenuInstances = Array.from(menuMap.values());
    return { success: true, menuInstances: finalMenuInstances, rawResponseTexts: allRawResponses };

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
    return { success: false, message: detailedErrorMessage, menuInstances: [], rawResponseTexts: [] };
  }
}
