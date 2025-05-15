
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

export interface Restaurant {
  id: string;
  name: string;
  menu: MenuItem[];
  // Add other restaurant details as needed
}

// For AI extracted items before they are fully processed
export interface ExtractedMenuItem extends MenuItemCore {}

export interface MenuCategory {
  name:string;
  items: MenuItem[];
}
