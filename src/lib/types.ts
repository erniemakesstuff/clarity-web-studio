
export interface MenuItemCore {
  name: string;
  description: string;
  price: string;
}

export type MediaType = 'image' | 'video';

export interface MediaObject {
  type: MediaType;
  url: string;
  dataAiHint?: string;
}

export interface MenuItem extends MenuItemCore {
  id: string;
  category?: string;
  media?: MediaObject[];
  dietaryIcons?: DietaryIcon[];
  ingredients?: string; 
  allergenTags?: string[]; 
  youMayAlsoLike?: string[]; 
  displayOrder?: number; 
  _tempVisualDescriptionForSave?: string; // Internal helper for saving
}

export type DietaryIcon = "vegetarian" | "vegan" | "gluten-free" | "spicy";

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
  | "Unknown";

export interface BackendDigitalMenuPollResponse {
  OwnerID: string;
  MenuID: string;
  State: DigitalMenuState;
  FoodServiceEntries?: ExtractedMenuItem[] | null;
  ContextS3MediaUrls?: string | null; 
}

export interface BackendFoodServiceEntryJson {
  food_category: string;
  name: string;
  description: string | null; // Allow null from backend
  ingredients: string | null;
  allergen_tags: string[] | null;
  source_media_blob_ref?: string | null;
  visual_description?: string | null;
  generated_blob_media_ref?: string | null;
  you_may_also_like: string[] | null;
  display_order: number;
  price: number;
}

export interface BackendDigitalMenuJson {
  OwnerID: string;
  MenuID: string;
  ContextS3MediaUrls?: string | null;
  FoodServiceEntries: BackendFoodServiceEntryJson[] | null; // Corrected: Was food_service_entries
  TestFoodServiceEntries?: BackendFoodServiceEntryJson[] | null; // Corrected: Was test_food_service_entries
  AllowABTesting?: boolean;
  Analytics?: unknown[] | null;
  State?: DigitalMenuState;
}

export interface MenuInstance {
  id: string;
  name: string;
  menu: MenuItem[];
  s3ContextImageUrls?: string[];
}

export const FOOD_CATEGORIES = [
  "Appetizers", "Soups", "Salads", "Main Courses", "Entrees", "Burgers", 
  "Sandwiches", "Pizzas", "Pastas", "Seafood", "Sides", "Desserts", "Drinks", "Kids Menu", "Other"
];

export const COMMON_ALLERGENS = [
  "Gluten", "Dairy", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Eggs",
  "Sesame", "Celery", "Mustard", "Lupin", "Sulphites", "Spicy" 
];

