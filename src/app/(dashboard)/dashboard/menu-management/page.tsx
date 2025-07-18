
"use client";

import { useState, useEffect } from "react";
import { MenuUploadForm } from "@/components/dashboard/MenuUploadForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ListChecks, Utensils, Leaf, WheatOff, Flame, ImageOff, Pencil, Eye, DollarSign, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem, DietaryIcon, MenuCategory as MenuCategoryType, MediaObject, CurrencyCode } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EditMenuItemDialog } from "@/components/dashboard/EditMenuItemDialog";
import Link from "next/link";
import { generateDeterministicIdHash } from "@/lib/hash-utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { patchDigitalMenu } from "./actions";


const dietaryIconMap: Record<DietaryIcon, React.ReactNode> = {
  vegetarian: <Leaf size={14} className="text-green-600 mr-1" />,
  vegan: <Leaf size={14} className="text-green-700 mr-1" />,
  "gluten-free": <WheatOff size={14} className="text-orange-600 mr-1" />,
  spicy: <Flame size={14} className="text-red-600 mr-1" />,
};

const dietaryIconTooltip: Record<DietaryIcon, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-Free",
  spicy: "Spicy",
};

const ADMIN_USER_RAW_IDS = ["admin@example.com", "valerm09@gmail.com"]; 

export default function MenuManagementPage() {
  const { selectedMenuInstance, isLoadingMenuInstances, updateMenuItem, rawOwnerId, ownerId, selectedMenuOwnerId, updateMenuCurrencyCode, jwtToken } = useAuth();
  const { toast } = useToast();
  const [menuCategories, setMenuCategories] = useState<MenuCategoryType[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('GBP');
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  useEffect(() => {
    if (selectedMenuInstance) {
      setSelectedCurrency(selectedMenuInstance.currencyCode || 'GBP');
    }
  }, [selectedMenuInstance]);

  useEffect(() => {
    if (selectedMenuInstance && selectedMenuInstance.menu.length > 0) {
      const categoriesMap: { [key: string]: MenuItem[] } = {};
      selectedMenuInstance.menu.forEach(item => {
        const categoryName = item.category || "Uncategorized";
        if (!categoriesMap[categoryName]) {
          categoriesMap[categoryName] = [];
        }
        categoriesMap[categoryName].push(item);
      });
      
      const sortedCategories = Object.keys(categoriesMap)
        .sort() 
        .map(name => ({
          name,
          items: categoriesMap[name].sort((a,b) => (a.displayOrder ?? Infinity) - (b.displayOrder ?? Infinity) || a.name.localeCompare(b.name)) 
        }));
      setMenuCategories(sortedCategories);
    } else {
      setMenuCategories([]);
    }
  }, [selectedMenuInstance]);

  const renderMediaPreview = (media?: MediaObject[]) => {
    const firstImage = media?.find(m => m.type === 'image');
    if (firstImage?.url) {
      return (
        <div className="w-20 h-20 relative rounded-md overflow-hidden mr-4 flex-shrink-0">
          <Image src={firstImage.url} alt={firstImage.dataAiHint || "menu item"} layout="fill" objectFit="cover" data-ai-hint={firstImage.dataAiHint}/>
        </div>
      );
    }
    return (
      <div className="w-20 h-20 rounded-md bg-secondary flex items-center justify-center mr-4 flex-shrink-0">
        <ImageOff className="w-8 h-8 text-muted-foreground" />
      </div>
    );
  };

  const handleEditClick = (item: MenuItem) => {
    setItemToEdit(item);
    setIsEditModalOpen(true);
  };

  const handleSaveMenuItem = (updatedItem: MenuItem) => {
    if (!selectedMenuInstance) {
      toast({ title: "Error", description: "No menu instance selected.", variant: "destructive" });
      return;
    }
    const success = updateMenuItem(selectedMenuInstance.id, updatedItem); 
    if (success) {
      // UI update success handled by dialog's backend call toast
    } else {
      toast({
        title: "UI Update Issue",
        description: `Could not fully update UI for "${updatedItem.name}". Backend changes may have succeeded. Please refresh.`,
        variant: "destructive",
      });
    }
    setIsEditModalOpen(false);
    setItemToEdit(null);
  };
  
  const handleCurrencyUpdate = async () => {
    if (!selectedMenuInstance) {
      toast({ title: "No menu selected", variant: "destructive" });
      return;
    }
    setIsUpdatingCurrency(true);
    const result = await patchDigitalMenu({
      ownerId: selectedMenuOwnerId,
      menuId: selectedMenuInstance.id,
      currencyCode: selectedCurrency,
    }, jwtToken);

    if (result.success) {
      updateMenuCurrencyCode(selectedMenuInstance.id, selectedCurrency);
      toast({
        title: "Currency Updated",
        description: `Menu currency set to ${selectedCurrency}.`,
        variant: "default",
        className: "bg-green-500 text-white",
      });
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Could not update currency.",
        variant: "destructive",
      });
      // Revert UI on failure
      setSelectedCurrency(selectedMenuInstance.currencyCode || 'GBP');
    }
    setIsUpdatingCurrency(false);
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
        <p className="text-muted-foreground">
          Upload new menus, view, and edit your existing digital menu items.
        </p>
      </div>
      
      <MenuUploadForm />
      
      {selectedMenuInstance && (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
              <DollarSign className="mr-3 h-7 w-7 text-primary" />
              Menu Currency
          </CardTitle>
          <CardDescription>
            Set the currency that will be displayed on your public digital menu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
              <Select value={selectedCurrency} onValueChange={(v) => setSelectedCurrency(v as CurrencyCode)} disabled={isUpdatingCurrency}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            <Button onClick={handleCurrencyUpdate} disabled={isUpdatingCurrency || selectedCurrency === (selectedMenuInstance.currencyCode || 'GBP')}>
              {isUpdatingCurrency && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Currency
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-2xl">
              <ListChecks className="mr-3 h-7 w-7 text-primary" />
              Current Menu Overview
            </CardTitle>
            <CardDescription>
              {selectedMenuInstance ? `Items for "${selectedMenuInstance.name}"` : "No menu selected or menu is empty."}
            </CardDescription>
          </div>
          {selectedMenuInstance && ownerId && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/menu/${selectedMenuOwnerId}/${selectedMenuInstance.id}`} target="_blank" rel="noopener noreferrer">
                <Eye className="mr-2 h-4 w-4" /> View As Customer
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingMenuInstances ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : menuCategories.length > 0 ? (
            <Accordion type="multiple" className="w-full" defaultValue={[]}>
              {menuCategories.map(category => (
                <AccordionItem value={category.name} key={category.name}>
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    <div className="flex items-center">
                       <Utensils className="mr-2 h-5 w-5 text-primary/80" />
                      {category.name} ({category.items.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-3">
                      {category.items.map(item => (
                        <li key={item.id} className="p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
                          <div className="flex items-start">
                            {renderMediaPreview(item.media)}
                            <div className="flex-grow">
                              <div className="flex justify-between items-start">
                                <h4 className="text-md font-semibold text-foreground">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                   <p className="text-md font-bold text-primary">{item.price}</p>
                                   <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}>
                                     <Pencil className="h-4 w-4" />
                                     <span className="sr-only">Edit {item.name}</span>
                                   </Button>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5 mb-1.5 line-clamp-2">{item.description || "No description available."}</p>
                              {item.dietaryIcons && item.dietaryIcons.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {item.dietaryIcons.map(icon => (
                                    <Badge key={icon} variant="outline" className="text-xs py-0.5 px-1.5">
                                      {dietaryIconMap[icon]}
                                      {dietaryIconTooltip[icon]}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Utensils className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{selectedMenuInstance ? "No items found in this menu. Try uploading a menu image or ensure the backend processing has completed." : "Please select a menu or upload one to see an overview."}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <EditMenuItemDialog
        item={itemToEdit}
        isOpen={isEditModalOpen}
        allMenuItems={selectedMenuInstance?.menu || []}
        onOpenChange={setIsEditModalOpen}
        onSave={handleSaveMenuItem}
      />
    </div>
  );
}
