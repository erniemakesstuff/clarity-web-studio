
export interface MenuItemCore {
  name: string;
  description: string;
  price: string; 
}
export interface MenuItem extends MenuItemCore {
  id: string;
  category?: string;
  imageUrl?: string;
  videoUrl?: string; // Added for video content
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
