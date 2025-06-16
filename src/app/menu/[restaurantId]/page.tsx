
"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { MenuItem, MenuCategory, MediaObject } from "@/lib/types";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { UpsellDialog } from "@/components/menu/UpsellDialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Utensils, Search, Soup, Pizza, Salad, Dessert, Coffee, Eye, LayoutGrid } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { SwipeFeed } from "@/components/menu/SwipeFeed";


// Mock data - replace with actual data fetching
const mockMenu: MenuItem[] = [
  { id: "1", name: "Margherita Pizza", description: "Classic delight with 100% real mozzarella cheese. Fresh basil, vine-ripened tomatoes, and a crispy thin crust.", price: "$12.99", category: "Pizzas", 
    media: [
      { type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "pizza food" },
      { type: "video", url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" }
    ], 
    dietaryIcons: ["vegetarian"] 
  },
  { id: "2", name: "Pepperoni Pizza", description: "A classic favorite with rich pepperoni and mozzarella. Perfectly baked to a golden brown.", price: "$14.99", category: "Pizzas", 
    media: [{ type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "pizza food" }], 
    dietaryIcons: [] 
  },
  { id: "3", name: "Caesar Salad", description: "Crisp romaine lettuce, parmesan cheese, and crunchy croutons tossed in our signature Caesar dressing.", price: "$9.50", category: "Salads", 
    media: [{ type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "salad food" }], 
    dietaryIcons: ["vegetarian"] 
  },
  { id: "4", name: "Spaghetti Carbonara", description: "Authentic Italian spaghetti with a creamy egg sauce, crispy pancetta, and freshly grated pecorino cheese.", price: "$15.00", category: "Pastas", 
    media: [
      { type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "pasta food" },
      { type: "video", url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" }
    ], 
    dietaryIcons: [] 
  },
  { id: "5", name: "Chocolate Lava Cake", description: "Warm, decadent chocolate cake with a gooey molten center, served with a scoop of premium vanilla ice cream.", price: "$8.00", category: "Desserts", 
    media: [{ type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "dessert chocolate" }], 
    dietaryIcons: ["vegetarian"] 
  },
  { id: "6", name: "Iced Latte", description: "Chilled espresso blended with smooth milk over ice. The perfect pick-me-up.", price: "$4.50", category: "Drinks", 
    media: [{ type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "coffee drink" }], 
    dietaryIcons: ["vegetarian", "gluten-free"] 
  },
  { id: "7", name: "Spicy Thai Green Curry", description: "Aromatic green curry with tender chicken, crisp bamboo shoots, bell peppers, and fresh basil in a rich coconut milk broth.", price: "$16.50", category: "Main Courses", 
    media: [{ type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "curry food" }], 
    dietaryIcons: ["spicy"] 
  },
  { id: "8", name: "Vegan Burger", description: "Delicious plant-based patty topped with fresh lettuce, ripe tomato, pickles, and our special vegan mayo, all on a toasted gluten-free bun.", price: "$13.00", category: "Burgers", 
    media: [
      { type: "image", url: "https://placehold.co/1280x720.png", dataAiHint: "burger food" },
      { type: "video", url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4" }
    ], 
    dietaryIcons: ["vegan", "gluten-free"] 
  },
];


const categoryIcons: Record<string, React.ReactNode> = {
  "All": <Utensils className="mr-2 h-5 w-5" />,
  "Pizzas": <Pizza className="mr-2 h-5 w-5" />,
  "Salads": <Salad className="mr-2 h-5 w-5" />,
  "Pastas": <Soup className="mr-2 h-5 w-5" />, 
  "Desserts": <Dessert className="mr-2 h-5 w-5" />,
  "Drinks": <Coffee className="mr-2 h-5 w-5" />,
  "Main Courses": <Utensils className="mr-2 h-5 w-5" />,
  "Burgers": <Utensils className="mr-2 h-5 w-5" />
};


export default function MenuPage({ params: paramsAsPromise }: { params: Promise<{ restaurantId: string }> }) {
  const params = React.use(paramsAsPromise);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedItemForUpsell, setSelectedItemForUpsell] = useState<MenuItem | null>(null);
  const [isUpsellDialogOpen, setIsUpsellDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [viewMode, setViewMode] = useState<'feed' | 'category'>('feed');


  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const shuffledMenu = [...mockMenu].sort(() => Math.random() - 0.5);
      setMenuItems(shuffledMenu);
      setFilteredItems(shuffledMenu); 
      
      const uniqueCategories = Array.from(new Set(mockMenu.map(item => item.category || "Other")));
      const categorizedMenuData: MenuCategory[] = uniqueCategories.map(catName => ({
        name: catName,
        items: mockMenu.filter(item => (item.category || "Other") === catName)
      }));
      setCategories([{ name: "All", items: mockMenu }, ...categorizedMenuData]);

      setIsLoading(false);
    }, 1000);
  }, [params.restaurantId]);

  useEffect(() => {
    let itemsToFilter = menuItems; 
    
    if (viewMode === 'category') {
        itemsToFilter = activeTab === "All" 
            ? mockMenu 
            : categories.find(c => c.name === activeTab)?.items || [];
    } else { 
        itemsToFilter = menuItems;
    }
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const results = itemsToFilter.filter(item =>
      item.name.toLowerCase().includes(lowercasedSearchTerm) ||
      item.description.toLowerCase().includes(lowercasedSearchTerm)
    );
    setFilteredItems(results);
  }, [searchTerm, menuItems, activeTab, categories, viewMode]);


  const handleUpsellClick = (item: MenuItem) => {
    setSelectedItemForUpsell(item);
    setIsUpsellDialogOpen(true);
  };
  
  const currentCategoryItems = useMemo(() => {
    if (viewMode === 'feed') return filteredItems; 

    if (activeTab === "All") return filteredItems;
    return filteredItems.filter(item => (item.category || "Other") === activeTab);
  }, [viewMode, activeTab, filteredItems]);

  const handleItemViewed = (itemId: string) => {
    console.log(`Item viewed (potential skip tracking): ${itemId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary/30">
        <AppHeader />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          <Skeleton className="h-10 w-1/3 mx-auto mb-3" />
          <Skeleton className="h-6 w-1/2 mx-auto mb-10" />
          <Skeleton className="h-10 w-full rounded-md mb-4" /> 
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
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      
      {viewMode === 'feed' ? (
        <>
          <SwipeFeed 
            items={menuItems} 
            onUpsellClick={handleUpsellClick} 
            onItemViewed={handleItemViewed} 
            allMenuItems={mockMenu} 
          />
          <Button
            variant="outline"
            size="lg"
            className="fixed bottom-6 right-6 z-20 rounded-full shadow-lg bg-background hover:bg-secondary"
            onClick={() => setViewMode('category')}
          >
            <LayoutGrid className="mr-2 h-5 w-5" />
            Discover More
          </Button>
        </>
      ) : (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary mb-3">
              Our Menu
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our delicious offerings. Menu Configuration ID: {params.restaurantId}
            </p>
          </div>

          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
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
            <Button
              variant="outline"
              size="lg"
              className="shadow-sm bg-background hover:bg-secondary"
              onClick={() => setViewMode('feed')}
            >
              <Eye className="mr-2 h-5 w-5" />
              Switch to Feed View
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
            <TabsList className="flex flex-wrap justify-start mb-8 bg-muted p-1 rounded-lg shadow-sm">
              {categories.map(category => (
                <TabsTrigger 
                  key={category.name} 
                  value={category.name} 
                  className="flex-initial data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md px-3 py-2 text-sm sm:text-base"
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
        </div>
      )}

      {selectedItemForUpsell && (
        <UpsellDialog
          isOpen={isUpsellDialogOpen}
          onOpenChange={setIsUpsellDialogOpen}
          selectedItem={selectedItemForUpsell}
          menuItems={mockMenu} 
        />
      )}

      {viewMode === 'category' && (
         <footer className="py-6 border-t bg-muted mt-auto">
            <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
              Enjoy your meal with {params.restaurantId === 'demo' ? "Our Demo Menu" : `Menu Configuration ${params.restaurantId}`}!
            </div>
          </footer>
      )}
    </div>
  );
}
