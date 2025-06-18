
export interface MenuItemCore {
  name: string;
  description: string;
  price: string;
}

export type MediaType = 'image' | 'video';

export interface MediaObject {
  type: MediaType;
  url: string;
  dataAiHint?: string; // For images, to guide Unsplash search or similar
}

export interface MenuItem extends MenuItemCore {
  id: string;
  category?: string;
  media?: MediaObject[]; // Replaces imageUrl and videoUrl
  dietaryIcons?: DietaryIcon[];
}

export type DietaryIcon = "vegetarian" | "vegan" | "gluten-free" | "spicy";

// For AI extracted items before they are fully processed OR items returned by backend
export interface ExtractedMenuItem extends MenuItemCore {}

export interface MenuCategory {
  name:string;
  items: MenuItem[];
}

export type DigitalMenuState =
  | "New"
  | "WaitingForInitialContext"
  | "Preparing"
  | "Generating"
  | "Done"
  | "Failed"
  | "Unknown"; // Added for safety

// This is the expected structure from the backend for polling
export interface BackendDigitalMenuPollResponse {
  OwnerID: string;
  MenuID: string;
  State: DigitalMenuState;
  FoodServiceEntries?: ExtractedMenuItem[] | null; // Used by MenuUploadForm polling
  ContextS3MediaUrls?: string | null; 
}

// This is the result type for the frontend pollWorkflowStatus action
export interface PollWorkflowStatusResult {
  success: boolean;
  state?: DigitalMenuState;
  menuItems?: ExtractedMenuItem[];
  s3ContextImageUrls?: string[]; 
  message?: string;
}

// Matches the backend JSON structure for a single food service entry
export interface BackendFoodServiceEntryJson {
  food_category: string;
  name: string;
  description: string;
  ingredients: string | null;
  allergen_tags: string[] | null;
  source_media_blob_ref?: string | null;
  visual_description?: string | null;
  generated_blob_media_ref?: string | null;
  you_may_also_like: string[] | null;
  display_order: number;
  price: number; // Assuming cents
}

// Matches the main backend JSON structure for a digital menu
export interface BackendDigitalMenuJson {
  OwnerID: string;
  MenuID: string;
  ContextS3MediaUrls?: string | null;
  food_service_entries: BackendFoodServiceEntryJson[] | null; // This is the key field
  test_food_service_entries?: BackendFoodServiceEntryJson[] | null;
  AllowABTesting?: boolean;
  Analytics?: unknown[] | null; // Replace unknown with specific type if needed
  State?: DigitalMenuState; // Added for completeness, might be present
}

// Renamed from Restaurant to MenuInstance
export interface MenuInstance {
  id: string; // Corresponds to MenuID from backend
  name: string; // Can be MenuID or a user-friendly name
  menu: MenuItem[]; // Transformed from food_service_entries
  s3ContextImageUrls?: string[]; // URLs of the context images used to process this menu
}
