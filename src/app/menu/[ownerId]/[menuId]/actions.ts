
"use server";

import type { MenuItem, MediaObject, DietaryIcon, BackendDigitalMenuJson, BackendFoodServiceEntryJson, OverrideSchedule, CurrencyCode } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// New Types for Analytics Payload
interface MenuAnalytics {
  timestamp_day: string;
  impressions: number;
  engagement_sec: number[];
  food_name: string;
  average_engagement: number;
  purchase_count: number;
  purchased_with: any[]; // Kept as any[] as it's not used
  food_category: string;
}

export interface AnalyticsPayload {
  ownerId: string;
  menuId: string;
  analytics: MenuAnalytics[];
}

interface FlushAnalyticsResult {
    success: boolean;
    message?: string;
}


export async function flushMenuAnalytics(payload: AnalyticsPayload): Promise<FlushAnalyticsResult> {
    try {
        const response = await fetch(`${API_BASE_URL}/ris/v1/menu/analytics`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
            // Use keepalive for requests that might be sent as the page unloads
            keepalive: true,
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorText = await response.text();
            return { success: false, message: `Backend error: ${response.status}. ${errorText.substring(0, 100)}` };
        }
    } catch (error: any) {
        return { success: false, message: error.message || 'Network error flushing analytics.' };
    }
}


interface FetchPublicMenuResult {
  success: boolean;
  menu?: MenuItem[];
  restaurantName?: string;
  overrideSchedules?: OverrideSchedule[];
  message?: string;
}

const getCurrencySymbol = (currencyCode?: CurrencyCode): string => {
  switch (currencyCode?.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return '£'; // Default to GBP
  }
};

export async function fetchPublicMenuData(ownerId: string, menuId: string, asExperiment: boolean): Promise<FetchPublicMenuResult> {
  let response: Response | undefined = undefined;
  let responseBodyText: string = "";
  try {
    const asMini = true; // Public view always fetches the lightweight version.
    const url = `${API_BASE_URL}/ris/v1/menu?ownerId=${ownerId}&menuId=${menuId}&asMini=${asMini}&asExperiment=${asExperiment}`;
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: 'no-store',
    });

    responseBodyText = await response.text();

    if (response.ok) {
      const digitalMenu: BackendDigitalMenuJson = JSON.parse(responseBodyText);
      
      const currentMenuIdActual = typeof digitalMenu.MenuID === 'string' && digitalMenu.MenuID.trim() !== '' ? digitalMenu.MenuID.trim() : menuId; 
      const currencySymbol = getCurrencySymbol(digitalMenu.currency_code);

      const menuEntries = asExperiment && digitalMenu.test_food_service_entries && digitalMenu.test_food_service_entries.length > 0
          ? digitalMenu.test_food_service_entries
          : digitalMenu.food_service_entries;

      const menuItems: MenuItem[] = (menuEntries || [])
        .map((entry, index) => {
          try {
            const itemName = typeof entry.name === 'string' && entry.name.trim() !== '' ? entry.name.trim() : `Unnamed Item ${index + 1}`;
            const itemDescription = typeof entry.description === 'string' ? entry.description : "";
            const itemPrice = typeof entry.price === 'number' ? entry.price : 0;
            const formattedPrice = `${currencySymbol}${(itemPrice / 100).toFixed(2)}`;

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

            if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https'))) {
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
              id: `${safeItemNameForId}-${currentMenuIdActual}-${index}`,
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
            console.error(`Error transforming public menu item at index ${index} (Original Name: ${entry?.name}, Owner Hashed: ${ownerId}, Menu: ${menuId}): ${transformError.message}`, transformError.stack);
            return null; 
          }
        }).filter((item): item is MenuItem => item !== null);
      
      const overrideSchedules: OverrideSchedule[] = Array.isArray(digitalMenu.override_schedules) ? digitalMenu.override_schedules.filter(s =>
            typeof s.food_name === 'string' &&
            typeof s.start_time === 'string' &&
            typeof s.end_time === 'string' &&
            typeof s.display_order_override === 'number'
        ) : [];

      return { success: true, menu: menuItems, restaurantName: currentMenuIdActual, overrideSchedules };
    } else {
      let errorMessage = `Backend API Error fetching public menu: ${response.status} ${response.statusText}.`;
      if (responseBodyText) {
        try {
          const errorData = JSON.parse(responseBodyText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
            errorMessage += ` Raw response: ${responseBodyText.substring(0, 500)}`;
        }
      } else {
        errorMessage += ' Failed to read error response body.';
      }
      return { success: false, menu: [], restaurantName: menuId, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while fetching public menu.";
     if (error && typeof error.message === 'string') { 
        if (error.message.toLowerCase().includes("failed to fetch")) {
            detailedErrorMessage = `Network error: Could not reach backend at ${API_BASE_URL}.`;
        } else if (error.message.includes("ECONNREFUSED")) {
            detailedErrorMessage = `Connection Refused: The backend service at ${API_BASE_URL} is not responding. Please ensure the service is running.`;
        } else {
            detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
        }
    } else if (error) {
        detailedErrorMessage = `An unexpected error occurred: ${String(error)}`;
    }
    return { success: false, menu: [], restaurantName: menuId, message: detailedErrorMessage };
  }
}
