
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

interface EditMenuItemDialogProps {
  item: MenuItem | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (updatedItem: MenuItem) => void;
}

export function EditMenuItemDialog({ item, isOpen, onOpenChange, onSave }: EditMenuItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [primaryImageUrl, setPrimaryImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number | string>("");
  const [ingredients, setIngredients] = useState("");
  const [youMayAlsoLike, setYouMayAlsoLike] = useState(""); // Comma-separated string
  const [allergenTags, setAllergenTags] = useState<string[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name);
      setDescription(item.description || "");
      setPrice(item.price);
      setCategory(item.category || FOOD_CATEGORIES[FOOD_CATEGORIES.length -1]); // Default to "Other" or last in list
      setPrimaryImageUrl(item.media && item.media.length > 0 ? item.media[0].url : "");
      setDisplayOrder(item.displayOrder !== undefined ? item.displayOrder : "");
      setIngredients(item.ingredients || "");
      setYouMayAlsoLike(item.youMayAlsoLike ? item.youMayAlsoLike.join(", ") : "");
      setAllergenTags(item.allergenTags || []);
    } else if (!isOpen) {
      // Reset form when dialog is closed
      setName("");
      setDescription("");
      setPrice("");
      setCategory("");
      setPrimaryImageUrl("");
      setDisplayOrder("");
      setIngredients("");
      setYouMayAlsoLike("");
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
      youMayAlsoLike: youMayAlsoLike.split(',').map(s => s.trim()).filter(s => s),
      allergenTags: allergenTags,
    });
    onOpenChange(false);
  };

  const handleAllergenChange = (allergen: string, checked: boolean) => {
    setAllergenTags(prev =>
      checked ? [...prev, allergen] : prev.filter(tag => tag !== allergen)
    );
  };

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
            <Label htmlFor="edit-image-url" className="text-right col-span-1">Primary Image URL</Label>
            <Input id="edit-image-url" value={primaryImageUrl} onChange={(e) => setPrimaryImageUrl(e.target.value)} className="col-span-3" placeholder="https://example.com/image.png" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-display-order" className="text-right col-span-1">Display Order</Label>
            <Input id="edit-display-order" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} className="col-span-3" placeholder="e.g., 1, 2, 3..." />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="edit-ingredients" className="text-right col-span-1 pt-2">Ingredients</Label>
            <Textarea id="edit-ingredients" value={ingredients} onChange={(e) => setIngredients(e.target.value)} className="col-span-3 min-h-[60px]" placeholder="e.g., Flour, sugar, eggs (can be descriptive or comma-separated)" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="edit-recommend" className="text-right col-span-1 pt-2">Also Recommend</Label>
            <Textarea id="edit-recommend" value={youMayAlsoLike} onChange={(e) => setYouMayAlsoLike(e.target.value)} className="col-span-3 min-h-[60px]" placeholder="e.g., Item A, Item B, Item C (comma-separated)" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right col-span-1 pt-2">Allergens</Label>
            <div className="col-span-3 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 max-h-48">
                {COMMON_ALLERGENS.map(allergen => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox
                      id={`allergen-${allergen}`}
                      checked={allergenTags.includes(allergen)}
                      onCheckedChange={(checked) => handleAllergenChange(allergen, !!checked)}
                    />
                    <Label htmlFor={`allergen-${allergen}`} className="font-normal text-sm">{allergen}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
        </ScrollArea>
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
