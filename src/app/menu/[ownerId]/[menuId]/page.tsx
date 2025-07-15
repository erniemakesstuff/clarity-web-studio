
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from 'next/navigation';
import type { MenuItem, MenuCategory, OverrideSchedule } from "@/lib/types";
import { MenuItemCard } from "@/components/menu/MenuItemCard";
import { UpsellDialog } from "@/components/menu/UpsellDialog";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Utensils, Search, Soup, Pizza, Salad, Dessert, Coffee, Eye, LayoutGrid, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { SwipeFeed } from "@/components/menu/SwipeFeed";
import { fetchPublicMenuData } from "./actions";
import { useToast } from "@/hooks/use-toast";

const categoryIcons: Record<string, React.ReactNode> = {
  "All": <Utensils className="mr-2 h-5 w-5" />,
  "Pizzas": <Pizza className="mr-2 h-5 w-5" />,
  "Salads": <Salad className="mr-2 h-5 w-5" />,
  "Pastas": <Soup className="mr-2 h-5 w-5" />, 
  "Desserts": <Dessert className="mr-2 h-5 w-5" />,
  "Drinks": <Coffee className="mr-2 h-5 w-5" />,
  "Main Courses": <Utensils className="mr-2 h-5 w-5" />,
  "Burgers": <Utensils className="mr-2 h-5 w-5" />,
  "Appetizers": <Utensils className="mr-2 h-5 w-5" />,
  "Entrees": <Utensils className="mr-2 h-5 w-5" />,
  "Seafood": <Utensils className="mr-2 h-5 w-5" />,
  "Sides": <Utensils className="mr-2 h-5 w-5" />,
  "Kids Menu": <Utensils className="mr-2 h-5 w-5" />,
  "Other": <Utensils className="mr-2 h-5 w-5" />,
  "Soups and Salads": <Salad className="mr-2 h-5 w-5" />,
  "Sandwiches": <Utensils className="mr-2 h-5 w-5" />
};

const getSortedMenu = (
  menuItemsToSort: MenuItem[],
  schedules: OverrideSchedule[] | undefined
): MenuItem[] => {
  const sorted = [...menuItemsToSort];
  const now = new Date();
  const currentUtcHours = now.getUTCHours();
  const currentUtcMinutes = now.getUTCMinutes();
  const currentTimeInMinutes = currentUtcHours * 60 + currentUtcMinutes;

  const activeOverrides = new Map<string, number>();

  if (schedules && schedules.length > 0) {
    schedules.forEach(schedule => {
      if (!/^\d{2}:\d{2}$/.test(schedule.start_time) || !/^\d{2}:\d{2}$/.test(schedule.end_time)) {
        return; // Skip invalid time formats
      }
      const [startH, startM] = schedule.start_time.split(':').map(Number);
      const [endH, endM] = schedule.end_time.split(':').map(Number);
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      const isActive = (startTime <= endTime)
        ? (currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime)
        : (currentTimeInMinutes >= startTime || currentTimeInMinutes < endTime);

      if (isActive) {
        activeOverrides.set(schedule.food_name, schedule.display_order_override);
      }
    });
  }

  sorted.sort((a, b) => {
    const orderA = activeOverrides.get(a.name) ?? a.displayOrder ?? Infinity;
    const orderB = activeOverrides.get(b.name) ?? b.displayOrder ?? Infinity;

    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name);
  });

  return sorted;
};


export default function MenuPage() {
  const params = useParams();
  const ownerId = params.ownerId as string;
  const menuId = params.menuId as string;
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [overrideSchedules, setOverrideSchedules] = useState<OverrideSchedule[]>([]);
  const [sortedMenuItems, setSortedMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [selectedItemForUpsell, setSelectedItemForUpsell] = useState<MenuItem | null>(null);
  const [isUpsellDialogOpen, setIsUpsellDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [viewMode, setViewMode] = useState<'feed' | 'category'>('feed');
  const { toast } = useToast();

  useEffect(() => {
    if (!ownerId || !menuId) {
      setIsLoading(false);
      setFetchError("Missing restaurant owner or menu ID.");
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    const asExperiment = Math.random() < 0.5;

    fetchPublicMenuData(ownerId, menuId, asExperiment)
      .then(result => {
        if (result.success && result.menu) {
          setMenuItems(result.menu);
          setOverrideSchedules(result.overrideSchedules || []);
          setRestaurantName(result.restaurantName || menuId);
        } else {
          setFetchError(result.message || "Failed to load menu data.");
          toast({
            title: "Error Loading Menu",
            description: result.message || "Could not fetch the menu for this restaurant.",
            variant: "destructive",
          });
        }
      })
      .catch(err => {
        console.error("Fetch error in MenuPage:", err);
        setFetchError("An unexpected error occurred while fetching the menu.");
        toast({
          title: "Network Error",
          description: "Could not connect to the server to fetch the menu.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [ownerId, menuId, toast]);

  useEffect(() => {
    const newlySortedItems = getSortedMenu(menuItems, overrideSchedules);
    setSortedMenuItems(newlySortedItems);
  }, [menuItems, overrideSchedules]);


  useEffect(() => {
    let itemsToFilter = sortedMenuItems; 
    
    if (viewMode === 'category' && activeTab !== 'All') {
        itemsToFilter = categories.find(c => c.name === activeTab)?.items || [];
    }
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const results = Array.isArray(itemsToFilter) ? itemsToFilter.filter(item =>
      item.name.toLowerCase().includes(lowercasedSearchTerm) ||
      (item.description && item.description.toLowerCase().includes(lowercasedSearchTerm))
    ) : [];

    setFilteredItems(results);
  }, [searchTerm, sortedMenuItems, activeTab, categories, viewMode]);

   useEffect(() => {
    if (sortedMenuItems.length > 0) {
      const uniqueCategories = Array.from(new Set(sortedMenuItems.map(item => item.category || "Other")));
      const categorizedMenuData: MenuCategory[] = uniqueCategories
        .sort()
        .map(catName => ({
          name: catName,
          items: sortedMenuItems.filter(item => (item.category || "Other") === catName)
        }));
      setCategories([{ name: "All", items: sortedMenuItems }, ...categorizedMenuData]);
      
      // Only set active tab if it's not already set, to avoid resetting user selection
      if (!activeTab || activeTab === "All") {
        setActiveTab("All");
      }

    } else {
      setCategories([]);
    }
  }, [sortedMenuItems, activeTab]);


  const handleUpsellClick = (item: MenuItem) => {
    setSelectedItemForUpsell(item);
    setIsUpsellDialogOpen(true);
  };
  
  const currentCategoryItems = useMemo(() => {
    if (activeTab === "All") return filteredItems;
    const category = categories.find(c => c.name === activeTab);
    const categoryItems = category ? category.items : [];
    
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    return categoryItems.filter(item =>
      item.name.toLowerCase().includes(lowercasedSearchTerm) ||
      (item.description && item.description.toLowerCase().includes(lowercasedSearchTerm))
    );

  }, [activeTab, categories, searchTerm, filteredItems]);


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

  if (fetchError) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col items-center justify-center text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
          <h1 className="text-3xl font-bold text-destructive mb-3">Oops! Something went wrong.</h1>
          <p className="text-lg text-muted-foreground mb-2">{fetchError}</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page or contact support if the issue persists.</p>
          <Button onClick={() => window.location.reload()} className="mt-6">Refresh Page</Button>
        </div>
      </div>
    );
  }


  return (
    <div className={`flex flex-col ${viewMode === 'feed' ? 'h-screen bg-gradient-to-br from-primary to-black' : 'min-h-screen bg-background'}`}>
      <AppHeader />
      
      {viewMode === 'feed' ? (
        <main className="flex-1 relative overflow-hidden flex items-center justify-center">
          <SwipeFeed 
            items={sortedMenuItems} 
            onUpsellClick={handleUpsellClick} 
            allMenuItems={sortedMenuItems} 
          />
          <div className="fixed bottom-6 right-6 z-20">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full shadow-lg border-white/20 bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60"
              onClick={() => setViewMode('category')}
            >
              <LayoutGrid className="mr-2 h-5 w-5" />
              Discover More
            </Button>
          </div>
        </main>
      ) : (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary mb-3">
              {restaurantName ? `${restaurantName}` : "Our Menu"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our delicious offerings.
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
          
          {categories.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8 flex flex-col">
              <TabsList className="flex flex-wrap h-auto justify-start rounded-lg bg-muted p-2 gap-2 mb-8">
                {categories.map(category => (
                  <TabsTrigger 
                    key={category.name} 
                    value={category.name} 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                  >
                    {categoryIcons[category.name] || <Utensils className="mr-2 h-5 w-5" />}
                    {category.name} ({category.name === "All" ? sortedMenuItems.length : category.items.length})
                  </TabsTrigger>
                ))}
              </TabsList>
              
               <TabsContent key={activeTab} value={activeTab} forceMount>
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
            </Tabs>
          ) : (
             <div className="text-center py-20 text-muted-foreground">
                <Utensils className="mx-auto h-16 w-16 mb-6 opacity-50" />
                <p className="text-xl">Menu Coming Soon!</p>
                <p>This restaurant's menu is currently being updated. Please check back later.</p>
            </div>
          )}
        </div>
      )}

      {selectedItemForUpsell && (
        <UpsellDialog
          isOpen={isUpsellDialogOpen}
          onOpenChange={setIsUpsellDialogOpen}
          selectedItem={selectedItemForUpsell}
          menuItems={sortedMenuItems} 
        />
      )}

      {viewMode === 'category' && (
         <footer className="py-6 border-t bg-muted mt-auto">
            <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
              Enjoy your meal at {restaurantName || `Menu for ${menuId}`}!
            </div>
          </footer>
      )}
    </div>
  );
}
