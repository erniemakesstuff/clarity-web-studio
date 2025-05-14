"use client";

import { useState, useEffect } from "react";
import type { MenuItem, MenuCategory } from "@/lib/types";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { UpsellDialog } from "@/components/menu/UpsellDialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Utensils, Search, Soup, Pizza, Salad, Dessert, Coffee } from "lucide-react"; // Example icons
import { Skeleton } from "@/components/ui/skeleton";


// Mock data - replace with actual data fetching
const mockMenu: MenuItem[] = [
  { id: "1", name: "Margherita Pizza", description: "Classic delight with 100% real mozzarella cheese", price: "$12.99", category: "Pizzas", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: ["vegetarian"] },
  { id: "2", name: "Pepperoni Pizza", description: "A classic favorite with rich pepperoni and mozzarella", price: "$14.99", category: "Pizzas", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: [] },
  { id: "3", name: "Caesar Salad", description: "Crisp romaine lettuce, parmesan cheese, and croutons with Caesar dressing.", price: "$9.50", category: "Salads", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: ["vegetarian"] },
  { id: "4", name: "Spaghetti Carbonara", description: "Spaghetti with creamy egg sauce, pancetta, and pecorino cheese.", price: "$15.00", category: "Pastas", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: [] },
  { id: "5", name: "Chocolate Lava Cake", description: "Warm chocolate cake with a gooey molten center, served with vanilla ice cream.", price: "$8.00", category: "Desserts", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: ["vegetarian"] },
  { id: "6", name: "Iced Latte", description: "Chilled espresso with milk over ice.", price: "$4.50", category: "Drinks", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: ["vegetarian", "gluten-free"] },
  { id: "7", name: "Spicy Thai Green Curry", description: "Aromatic green curry with chicken, bamboo shoots, and coconut milk.", price: "$16.50", category: "Main Courses", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: ["spicy"] },
  { id: "8", name: "Vegan Burger", description: "Plant-based patty with lettuce, tomato, and vegan mayo on a gluten-free bun.", price: "$13.00", category: "Burgers", imageUrl: "https://placehold.co/600x400.png", dietaryIcons: ["vegan", "gluten-free"] },
];

const categoryIcons: Record<string, React.ReactNode> = {
  "All": <Utensils className="mr-2 h-5 w-5" />,
  "Pizzas": <Pizza className="mr-2 h-5 w-5" />,
  "Salads": <Salad className="mr-2 h-5 w-5" />,
  "Pastas": <Soup className="mr-2 h-5 w-5" />, // Using Soup for Pastas as example
  "Desserts": <Dessert className="mr-2 h-5 w-5" />,
  "Drinks": <Coffee className="mr-2 h-5 w-5" />,
  "Main Courses": <Utensils className="mr-2 h-5 w-5" />,
  "Burgers": <Utensils className="mr-2 h-5 w-5" />
};


export default function MenuPage({ params }: { params: { restaurantId: string } }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItemForUpsell, setSelectedItemForUpsell] = useState<MenuItem | null>(null);
  const [isUpsellDialogOpen, setIsUpsellDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");


  useEffect(() => {
    // Simulate fetching menu data
    setIsLoading(true);
    setTimeout(() => {
      // In a real app, fetch data for params.restaurantId
      setMenuItems(mockMenu);
      setFilteredItems(mockMenu); // Initially show all items
      
      const uniqueCategories = Array.from(new Set(mockMenu.map(item => item.category || "Other")));
      const categorizedMenu: MenuCategory[] = uniqueCategories.map(catName => ({
        name: catName,
        items: mockMenu.filter(item => (item.category || "Other") === catName)
      }));
      setCategories([{ name: "All", items: mockMenu }, ...categorizedMenu]);

      setIsLoading(false);
    }, 1000);
  }, [params.restaurantId]);

  useEffect(() => {
    let itemsToFilter = menuItems;
    if (activeTab !== "All") {
      itemsToFilter = menuItems.filter(item => (item.category || "Other") === activeTab);
    }
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const results = itemsToFilter.filter(item =>
      item.name.toLowerCase().includes(lowercasedSearchTerm) ||
      item.description.toLowerCase().includes(lowercasedSearchTerm)
    );
    setFilteredItems(results);
  }, [searchTerm, menuItems, activeTab]);


  const handleUpsellClick = (item: MenuItem) => {
    setSelectedItemForUpsell(item);
    setIsUpsellDialogOpen(true);
  };
  
  const currentCategoryItems = activeTab === "All" 
    ? filteredItems 
    : filteredItems.filter(item => (item.category || "Other") === activeTab);


  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <AppHeader />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-primary mb-3">
            Our Menu
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our delicious offerings. Restaurant ID: {params.restaurantId}
          </p>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search menu items..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="mb-8">
             <Skeleton className="h-10 w-full rounded-md mb-4" /> {/* Tabs Skeleton */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="flex flex-col overflow-hidden h-full shadow-md rounded-xl">
                    <Skeleton className="w-full h-48" />
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="flex-grow pb-3">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                    <CardFooter className="flex justify-between items-center pt-0 pb-4 px-4">
                      <Skeleton className="h-8 w-1/4" />
                      <Skeleton className="h-9 w-1/4" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap justify-start mb-6 bg-background p-1 rounded-lg shadow-sm">
              {categories.map(category => (
                <TabsTrigger 
                  key={category.name} 
                  value={category.name} 
                  className="flex-1 md:flex-initial data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md px-3 py-2 text-sm sm:text-base"
                >
                  {categoryIcons[category.name] || <Utensils className="mr-2 h-5 w-5" />}
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category.name} value={category.name}>
                {currentCategoryItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentCategoryItems.map(item => (
                      <MenuItemCard key={item.id} item={item} onUpsellClick={handleUpsellClick} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-10 text-lg">
                    No items found in this category{searchTerm && ' for your search criteria'}.
                  </p>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}


        {selectedItemForUpsell && (
          <UpsellDialog
            isOpen={isUpsellDialogOpen}
            onOpenChange={setIsUpsellDialogOpen}
            selectedItem={selectedItemForUpsell}
            menuItems={menuItems}
          />
        )}
      </div>
      <footer className="py-6 border-t bg-background mt-auto">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          Enjoy your meal at {params.restaurantId === 'demo' ? "Our Demo Restaurant" : `Restaurant ${params.restaurantId}`}!
        </div>
      </footer>
    </div>
  );
}
