
"use client";

import React, { useState, useEffect } from "react";
import type { MenuItem, MediaObject } from "@/lib/types";
import { FOOD_CATEGORIES, COMMON_ALLERGENS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EditMenuItemDialogProps {
  item: MenuItem | null;
  isOpen: boolean;
  allMenuItems: MenuItem[];
  onOpenChange: (isOpen: boolean) => void;
  onSave: (updatedItem: MenuItem) => void;
}

export function EditMenuItemDialog({ item, isOpen, allMenuItems, onOpenChange, onSave }: EditMenuItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number | string>("");
  const [ingredients, setIngredients] = useState("");
  const [youMayAlsoLike, setYouMayAlsoLike] = useState<string[]>([]);
  const [allergenTags, setAllergenTags] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name);
      setDescription(item.description || "");
      setPrice(item.price);
      setCategory(item.category || FOOD_CATEGORIES[FOOD_CATEGORIES.length -1]);
      setPrimaryImageUrl(item.media && item.media.length > 0 && item.media[0].type === 'image' ? item.media[0].url : "");
      setDisplayOrder(item.displayOrder !== undefined ? item.displayOrder : "");
      setIngredients(item.ingredients || "");
      setYouMayAlsoLike(item.youMayAlsoLike || []);
      setAllergenTags(item.allergenTags || []);
    } else if (!isOpen) {
      // Reset form fields when dialog is closed or no item
      setName("");
      setDescription("");
      setPrice("");
      setCategory("");
      setPrimaryImageUrl("");
      setDisplayOrder("");
      setIngredients("");
      setYouMayAlsoLike([]);
      setAllergenTags([]);
    }
  }, [item, isOpen]);

  const handleSave = () => {
    if (!item) return;
    if (!name.trim() || !price.trim() || !category.trim()) {
      toast({
        title: "Validation Error",
        description: "Name, price, and category cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    if (!price.startsWith("$") || isNaN(parseFloat(price.substring(1)))) {
        toast({
            title: "Validation Error",
            description: "Price must be in a valid format (e.g., $10.99).",
            variant: "destructive",
        });
        return;
    }
    const parsedDisplayOrder = displayOrder === "" ? undefined : parseInt(String(displayOrder), 10);
    if (displayOrder !== "" && (isNaN(parsedDisplayOrder) || parsedDisplayOrder < 0)) {
         toast({
            title: "Validation Error",
            description: "Display Order must be a non-negative number.",
            variant: "destructive",
        });
        return;
    }

    const updatedMedia: MediaObject[] = [];
    if (primaryImageUrl.trim()) {
      updatedMedia.push({
        type: 'image',
        url: primaryImageUrl.trim(),
        dataAiHint: item.media && item.media.length > 0 && item.media[0].dataAiHint ? item.media[0].dataAiHint : name.toLowerCase().split(' ').slice(0,2).join(' '),
      });
    }


    onSave({
      ...item,
      name: name.trim(),
      description: description.trim(),
      price: price.trim(),
      category: category.trim(),
      media: updatedMedia.length > 0 ? updatedMedia : undefined,
      displayOrder: parsedDisplayOrder,
      ingredients: ingredients.trim() || undefined,
      youMayAlsoLike: youMayAlsoLike, // Directly use the array of selected names
      allergenTags: allergenTags,
    });
    onOpenChange(false);
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    setAllergenTags(prev =>
      checked ? [...prev, allergen] : prev.filter(tag => tag !== allergen)
    );
  };

  const handleYouMayAlsoLikeToggle = (itemName: string) => {
    setYouMayAlsoLike(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const availableRecommendations = allMenuItems.filter(menuItem => menuItem.id !== item?.id);

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Menu Item: {item.name}</DialogTitle>
          <DialogDescription>
            Make changes to the menu item details below. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <TooltipProvider>
        <ScrollArea className="max-h-[calc(80vh-200px)] pr-6">
        <div className="grid gap-6 py-4 ">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-name" className="text-right col-span-1">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="edit-description" className="text-right col-span-1 pt-2">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 min-h-[80px]" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-price" className="text-right col-span-1">Price</Label>
            <Input id="edit-price" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" placeholder="$0.00" required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-category" className="text-right col-span-1">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {FOOD_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
             <div className="flex items-center justify-end col-span-1">
                <Label htmlFor="edit-image-url" className="text-right mr-1">Main Graphic Url</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Determines what the customer sees as the visual representation of the food item (e.g., a photo).</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            <Input id="edit-image-url" value={primaryImageUrl} onChange={(e) => setPrimaryImageUrl(e.target.value)} className="col-span-3" placeholder="https://example.com/image.png" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="flex items-center justify-end col-span-1">
                <Label htmlFor="edit-display-order" className="text-right mr-1">Display Order</Label>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Determines the order in which food items are shown to the user, e.g., in lists or carousels. Lower numbers usually appear first.</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <Input id="edit-display-order" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} className="col-span-3" placeholder="e.g., 1, 2, 3..." />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="flex items-center justify-end col-span-1 pt-2">
                <Label htmlFor="edit-ingredients" className="text-right mr-1">Ingredients</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">List the main ingredients of the dish. This can be a descriptive sentence or a comma-separated list.</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <Textarea id="edit-ingredients" value={ingredients} onChange={(e) => setIngredients(e.target.value)} className="col-span-3 min-h-[60px]" placeholder="e.g., Flour, sugar, eggs or Rich tomato sauce with herbs" />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <div className="flex items-center justify-end col-span-1 pt-2">
                <Label className="text-right mr-1">Also Recommend</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Suggest other menu items that pair well with this one by selecting them from the list.</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <div className="col-span-3 space-y-2">
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px] bg-background">
                    {availableRecommendations.length > 0 ? availableRecommendations.map(recItem => (
                        <Badge
                            key={recItem.id}
                            variant={youMayAlsoLike.includes(recItem.name) ? "default" : "outline"}
                            onClick={() => handleYouMayAlsoLikeToggle(recItem.name)}
                            className="cursor-pointer select-none"
                        >
                            {recItem.name}
                        </Badge>
                    )) : <p className="text-sm text-muted-foreground">No other items available to recommend.</p>}
                </div>
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <div className="flex items-center justify-end col-span-1 pt-2">
                <Label className="text-right mr-1">Allergens</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Select common allergens present in this dish. This helps customers with dietary restrictions.</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <div className="col-span-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 max-h-48">
                {COMMON_ALLERGENS.map(allergen => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${allergen.replace(/\s+/g, '-')}`} // Ensure valid ID
                      checked={allergenTags.includes(allergen)}
                      onCheckedChange={(checked) => handleAllergenChange(allergen, !!checked)}
                    />
                    <Label htmlFor={`allergen-${allergen.replace(/\s+/g, '-')}`} className="font-normal text-sm">{allergen}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
        </ScrollArea>
        </TooltipProvider>
        <DialogFooter className="pt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
