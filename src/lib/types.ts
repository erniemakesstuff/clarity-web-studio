
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

// Analytics Data Structures
export interface AnalyticsPurchasedWithEntry {
  food_category: string;
  food_name: string;
  purchase_count: number;
}

export interface AnalyticsEntry {
  food_category: string;
  average_engagement: number;
  engagement_sec: number | null;
  food_name: string;
  impressions: number;
  purchased_with: AnalyticsPurchasedWithEntry[];
  purchase_count: number;
  timestamp_day: string; // "MM/DD/YYYY"
}

export interface OverrideSchedule {
  food_name: string;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  display_order_override: number;
}


export interface BackendFoodServiceEntryJson {
  food_category: string;
  name: string;
  description: string | null;
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
  food_service_entries: BackendFoodServiceEntryJson[] | null;
  test_food_service_entries?: BackendFoodServiceEntryJson[] | null;
  AllowABTesting?: boolean;
  test_goal?: string;
  test_hypothesis?: string;
  test_history?: string;
  Analytics?: AnalyticsEntry[] | null; 
  State?: DigitalMenuState;
  override_schedules?: OverrideSchedule[] | null;
  currency_code?: string;
}

export interface MenuInstance {
  id: string;
  name: string;
  ownerId: string;
  menu: MenuItem[];
  testMenu?: MenuItem[];
  s3ContextImageUrls?: string[];
  analytics?: AnalyticsEntry[] | null;
  allowABTesting?: boolean;
  testGoal?: string;
  testHypothesis?: string;
  testHistory?: string;
  overrideSchedules?: OverrideSchedule[];
}

export interface ClarityUserProfile {
	userId:             string;
	menuGrants:         string[];
	subscriptionStatus: string;
	contactInfoEmail:   string;
	contactInfoPhone:   string;
	name:               string;
}

export const FOOD_CATEGORIES = [
  "Appetizers", "Soups", "Salads", "Main Courses", "Entrees", "Burgers",
  "Sandwiches", "Pizzas", "Pastas", "Seafood", "Sides", "Desserts", "Drinks", "Kids Menu", "Other"
];

export const COMMON_ALLERGENS = [
  "Gluten", "Dairy", "Nuts", "Peanuts", "Shellfish", "Fish", "Soy", "Eggs",
  "Sesame", "Celery", "Mustard", "Lupin", "Sulphites", "Spicy"
];

export interface PollWorkflowStatusResult {
  success: boolean;
  state?: DigitalMenuState;
  menuItems?: ExtractedMenuItem[];
  s3ContextImageUrls?: string[];
  message?: string;
}
