
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

// Renamed from Restaurant to MenuInstance
export interface MenuInstance {
  id: string;
  name: string;
  menu: MenuItem[]; // This 'menu' field refers to the list of MenuItem objects
  s3ContextImageUrls?: string[]; // URLs of the context images used to process this menu
}

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
  FoodServiceEntries?: ExtractedMenuItem[] | null;
  ContextS3MediaUrls?: string | null; // Changed from string[] to string, as it's a CSV
}

// This is the result type for the frontend pollWorkflowStatus action
export interface PollWorkflowStatusResult {
  success: boolean;
  state?: DigitalMenuState;
  menuItems?: ExtractedMenuItem[];
  s3ContextImageUrls?: string[]; // This will be an array of full URLs after parsing
  message?: string;
}
