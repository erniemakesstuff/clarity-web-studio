
"use server";

import type { MenuItem, MediaObject, DietaryIcon, BackendDigitalMenuJson } from '@/lib/types';

const API_BASE_URL = "https://api.bityfan.com";
const DEFAULT_OWNER_ID_FOR_PUBLIC_ACCESS = "admin@example.com"; // Placeholder

interface FetchPublicMenuResult {
  success: boolean;
  menu?: MenuItem[];
  restaurantName?: string;
  message?: string;
}

export async function fetchPublicMenuData(menuId: string): Promise<FetchPublicMenuResult> {
  try {
    // Public menus might not need JWT, or the backend handles unauthenticated access for this specific query.
    // For now, assuming ownerId might still be part of the query for backend routing.
    const response = await fetch(`${API_BASE_URL}/ris/v1/menu?ownerId=${encodeURIComponent(DEFAULT_OWNER_ID_FOR_PUBLIC_ACCESS)}&menuId=${encodeURIComponent(menuId)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: 'no-store', // Ensure fresh data for public view
    });

    if (response.ok) {
      const digitalMenu: BackendDigitalMenuJson = await response.json();
      
      const menuItems: MenuItem[] = (digitalMenu.food_service_entries || []).map((entry, index) => {
        const formattedPrice = `$${(entry.price / 100).toFixed(2)}`;

        const mediaObjects: MediaObject[] = [];
        // Prefer generated, then source, then fallback to placeholder logic
        const imageUrl = entry.generated_blob_media_ref || entry.source_media_blob_ref;
        
        let dataAiHint = 'food item'; // Default hint

        if (entry.visual_description && entry.visual_description.trim() !== '') {
            dataAiHint = entry.visual_description.split(/\s+/).slice(0, 2).join(' ');
        } else if (entry.name && entry.name.trim() !== '') {
            dataAiHint = entry.name.split(/\s+/).slice(0, 2).join(' ');
        }


        if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
          mediaObjects.push({
            type: 'image',
            url: imageUrl,
            dataAiHint: dataAiHint,
          });
        }
        // else if (mediaObjects.length === 0) { // Add placeholder if no image
        //   mediaObjects.push({
        //     type: 'image',
        //     url: `https://placehold.co/600x400.png`, // Default placeholder
        //     dataAiHint: dataAiHint,
        //   });
        // }


        const dietaryIcons: DietaryIcon[] = [];
        const backendAllergenTagsLower = (entry.allergen_tags || []).map(tag => tag.toLowerCase());

        if (entry.food_category?.toLowerCase() === "vegan") {
          dietaryIcons.push('vegan');
        }
        if (entry.food_category?.toLowerCase() === "vegetarian" || dietaryIcons.includes('vegan')) {
          dietaryIcons.push('vegetarian');
        }
        if (entry.food_category?.toLowerCase().includes("gluten free") || backendAllergenTagsLower.includes("gluten-free") || backendAllergenTagsLower.includes("gluten free")) {
          dietaryIcons.push('gluten-free');
        }
        if (backendAllergenTagsLower.some(tag => tag.includes('spicy') || tag.includes('hot'))) {
          dietaryIcons.push('spicy');
        }
        
        const uniqueDietaryIcons = Array.from(new Set(dietaryIcons));

        return {
          id: `${entry.name.replace(/\s+/g, '-')}-${digitalMenu.MenuID}-${index}`, // Ensure unique ID for client-side keys
          name: entry.name,
          description: entry.description || "",
          price: formattedPrice,
          category: entry.food_category || "Other",
          media: mediaObjects.length > 0 ? mediaObjects : undefined,
          dietaryIcons: uniqueDietaryIcons.length > 0 ? uniqueDietaryIcons : undefined,
          ingredients: entry.ingredients || undefined,
          allergenTags: entry.allergen_tags || undefined,
          youMayAlsoLike: entry.you_may_also_like || undefined,
          displayOrder: entry.display_order,
        };
      });

      return { success: true, menu: menuItems, restaurantName: digitalMenu.MenuID };
    } else {
      let errorMessage = `Backend API Error fetching public menu: ${response.status} ${response.statusText}.`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) { /* Failed to parse error */ }
      return { success: false, message: errorMessage };
    }
  } catch (error: any) {
    let detailedErrorMessage = "Failed to communicate with the backend service while fetching public menu.";
    if (error.message?.toLowerCase().includes("failed to fetch")) {
        detailedErrorMessage = `Network error: Could not reach backend at ${API_BASE_URL}.`;
    } else if (error.message) {
        detailedErrorMessage = `An unexpected error occurred: ${error.message}`;
    }
    return { success: false, message: detailedErrorMessage };
  }
}
