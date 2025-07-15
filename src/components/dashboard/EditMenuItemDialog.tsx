
"use client";

import React, { useState, useEffect } from "react";
import type { MenuItem, MediaObject, OverrideSchedule } from "@/lib/types";
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
import { Info, Loader2, PlusCircle, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { updateMenuItemOnBackend } from "@/app/(dashboard)/dashboard/menu-management/actions";
import { cn } from "@/lib/utils";
import { patchDigitalMenu } from "@/app/(dashboard)/dashboard/menu-management/actions";

interface EditMenuItemDialogProps {
  item: MenuItem | null;
  isOpen: boolean;
  allMenuItems: MenuItem[];
  onOpenChange: (isOpen: boolean) => void;
  onSave: (updatedItem: MenuItem) => void;
}

const formatTimeToUTC = (localTime: string): string => {
  if (!localTime) return "00:00";
  const [hours, minutes] = localTime.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  const utcHours = String(now.getUTCHours()).padStart(2, '0');
  const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
  return `${utcHours}:${utcMinutes}`;
};

const formatUtcToLocal = (utcTime: string): string => {
  if (!utcTime) return "00:00";
  const [utcHours, utcMinutes] = utcTime.split(':').map(Number);
  const now = new Date();
  now.setUTCHours(utcHours, utcMinutes, 0, 0);
  const localHours = String(now.getHours()).padStart(2, '0');
  const localMinutes = String(now.getMinutes()).padStart(2, '0');
  return `${localHours}:${localMinutes}`;
};


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
  const [schedules, setSchedules] = useState<Omit<OverrideSchedule, 'food_name'>[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const { jwtToken, selectedMenuInstance, ownerId, updateMenuSchedules } = useAuth();

  useEffect(() => {
    if (item && isOpen && selectedMenuInstance) {
      setName(item.name);
      setDescription(item.description || "");
      setPrice(item.price);
      setCategory(item.category || FOOD_CATEGORIES[FOOD_CATEGORIES.length -1]);
      setPrimaryImageUrl(item.media && item.media.length > 0 && item.media[0].type === 'image' ? item.media[0].url : "");
      setDisplayOrder(item.displayOrder !== undefined ? item.displayOrder : "");
      setIngredients(item.ingredients || "");
      setYouMayAlsoLike(item.youMayAlsoLike || []);
      setAllergenTags(item.allergenTags || []);
      
      const itemSchedules = (selectedMenuInstance.overrideSchedules || [])
        .filter(s => s.food_name === item.name)
        .map(({ food_name, ...rest }) => ({
            ...rest,
            start_time: formatUtcToLocal(rest.start_time),
            end_time: formatUtcToLocal(rest.end_time),
        }));

      setSchedules(itemSchedules);

    } else if (!isOpen) {
      // Reset state when dialog closes
      setName("");
      setDescription("");
      setPrice("");
      setCategory("");
      setPrimaryImageUrl("");
      setDisplayOrder("");
      setIngredients("");
      setYouMayAlsoLike([]);
      setAllergenTags([]);
      setSchedules([]);
      setIsSaving(false);
    }
  }, [item, isOpen, selectedMenuInstance]);

  const handleSave = async () => {
    if (!item || !selectedMenuInstance) {
        toast({ title: "Error", description: "Required item or menu context is missing.", variant: "destructive" });
        return;
    }
    if (!name.trim() || !price.trim() || !category.trim()) {
      toast({ title: "Validation Error", description: "Name, price, and category cannot be empty.", variant: "destructive" });
      return;
    }
    if (!price.startsWith("$") || isNaN(parseFloat(price.substring(1)))) {
        toast({ title: "Validation Error", description: "Price must be in a valid format (e.g., $10.99).", variant: "destructive" });
        return;
    }
    const parsedDisplayOrder = displayOrder === "" ? undefined : parseInt(String(displayOrder), 10);
    if (displayOrder !== "" && (isNaN(parsedDisplayOrder) || parsedDisplayOrder < 0)) {
         toast({ title: "Validation Error", description: "Display Order must be a non-negative number.", variant: "destructive" });
        return;
    }
    
    for (const schedule of schedules) {
        if (!/^\d{2}:\d{2}$/.test(schedule.start_time) || !/^\d{2}:\d{2}$/.test(schedule.end_time)) {
             toast({ title: "Validation Error", description: "Schedule times must be in HH:MM format.", variant: "destructive" });
            return;
        }
    }


    setIsSaving(true);

    const originalDataAiHint = item.media?.[0]?.dataAiHint;
    const effectiveVisualDescription = originalDataAiHint || name.trim().toLowerCase().split(' ').slice(0,2).join(' ') || "food item";

    const updatedMediaObjects: MediaObject[] = [];
    if (primaryImageUrl.trim()) {
      updatedMediaObjects.push({ type: 'image', url: primaryImageUrl.trim(), dataAiHint: effectiveVisualDescription });
    }

    const updatedItemFromDialog: MenuItem = {
      ...item,
      name: name.trim(),
      description: description.trim(),
      price: price.trim(),
      category: category.trim(),
      media: updatedMediaObjects.length > 0 ? updatedMediaObjects : undefined,
      displayOrder: parsedDisplayOrder,
      ingredients: ingredients.trim() || undefined,
      youMayAlsoLike: youMayAlsoLike,
      allergenTags: allergenTags,
      _tempVisualDescriptionForSave: effectiveVisualDescription,
    };

    const otherSchedules = (selectedMenuInstance.overrideSchedules || []).filter(s => s.food_name !== item.name);
    
    const newSchedulesForPatch = schedules.map(s => ({
        food_name: name.trim(),
        start_time: formatTimeToUTC(s.start_time),
        end_time: formatTimeToUTC(s.end_time),
        display_order_override: s.display_order_override
    }));

    const finalSchedules = [...otherSchedules, ...newSchedulesForPatch];


    const [itemUpdateResult, scheduleUpdateResult] = await Promise.all([
        updateMenuItemOnBackend({
            ownerId, menuId: selectedMenuInstance.id, targetEntryName: item.name, itemData: updatedItemFromDialog, jwtToken
        }),
        patchDigitalMenu({
            ownerId, menuId: selectedMenuInstance.id, overrideSchedules: finalSchedules
        }, jwtToken)
    ]);


    if (itemUpdateResult.success && scheduleUpdateResult.success) {
      onSave(updatedItemFromDialog); 
      updateMenuSchedules(selectedMenuInstance.id, finalSchedules);
      toast({
        title: "Item Updated",
        description: `"${updatedItemFromDialog.name}" and its schedules updated successfully.`,
        variant: "default",
        className: "bg-green-500 text-white",
      });
      onOpenChange(false);
    } else {
      let errors = [];
      if (!itemUpdateResult.success) errors.push(`Item Details: ${itemUpdateResult.message}`);
      if (!scheduleUpdateResult.success) errors.push(`Schedules: ${scheduleUpdateResult.message}`);
      toast({
        title: "Update Failed",
        description: `Could not save all changes. Errors: ${errors.join(', ')}`,
        variant: "destructive",
      });
    }
    setIsSaving(false);
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

  const handleAddSchedule = () => {
    setSchedules(prev => [...prev, { start_time: '00:00', end_time: '00:00', display_order_override: 0 }]);
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedules(prev => prev.filter((_, i) => i !== index));
  };

  const handleScheduleChange = <K extends keyof Omit<OverrideSchedule, 'food_name'>>(
    index: number,
    field: K,
    value: Omit<OverrideSchedule, 'food_name'>[K]
  ) => {
    setSchedules(prev => {
        const newSchedules = [...prev];
        const schedule = { ...newSchedules[index], [field]: value };
        newSchedules[index] = schedule;
        return newSchedules;
    });
  };

  const availableRecommendations = allMenuItems.filter(menuItem => menuItem.id !== item?.id);

  if (!item) return null;
  const isBusy = isSaving;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isBusy) onOpenChange(open); }}>
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
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required disabled={isBusy} />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="edit-description" className="text-right col-span-1 pt-2">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 min-h-[80px]" disabled={isBusy} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-price" className="text-right col-span-1">Price</Label>
            <Input id="edit-price" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" placeholder="$0.00" required disabled={isBusy} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-category" className="text-right col-span-1">Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={isBusy}>
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
             <div className="flex items-center justify-end col-span-1 text-right">
                <Label htmlFor="edit-image-url" className="mr-1">Main Graphic Url</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Provide a URL for the item's image.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            <div className="col-span-3 flex items-center gap-2">
              <Input id="edit-image-url" value={primaryImageUrl} onChange={(e) => setPrimaryImageUrl(e.target.value)} className="flex-grow" placeholder="https://..." disabled={isBusy} />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="flex items-center justify-end col-span-1">
                <Label htmlFor="edit-display-order" className="text-right mr-1">Base Display Order</Label>
                 <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Default order for this item. Lower numbers appear first. Can be overridden by schedules.</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <Input id="edit-display-order" type="number" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} className="col-span-3" placeholder="e.g., 1, 2, 3..." disabled={isBusy} />
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
            <Textarea id="edit-ingredients" value={ingredients} onChange={(e) => setIngredients(e.target.value)} className="col-span-3 min-h-[60px]" placeholder="e.g., Flour, sugar, eggs or Rich tomato sauce with herbs" disabled={isBusy} />
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
                            onClick={() => !isBusy && handleYouMayAlsoLikeToggle(recItem.name)}
                            className={cn("cursor-pointer select-none", isBusy && "cursor-not-allowed opacity-50")}
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
                      id={`allergen-${allergen.replace(/\s+/g, '-')}`} 
                      checked={allergenTags.includes(allergen)}
                      onCheckedChange={(checked) => !isBusy && handleAllergenChange(allergen, !!checked)}
                      disabled={isBusy}
                    />
                    <Label htmlFor={`allergen-${allergen.replace(/\s+/g, '-')}`} className="font-normal text-sm">{allergen}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

           <div className="grid grid-cols-4 items-start gap-4">
             <div className="flex items-center justify-end col-span-1 pt-2">
                <Label className="text-right mr-1 flex items-center gap-1.5"><Clock size={14}/> Overrides (Local Time)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Set a different display order for this item during specific times (e.g., make it appear first during lunch hours). Times are shown in your local timezone and saved in UTC.</p>
                  </TooltipContent>
                </Tooltip>
            </div>
            <div className="col-span-3 space-y-3">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-secondary/30">
                  <Input type="time" value={schedule.start_time} onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)} className="w-24" disabled={isBusy}/>
                  <span className="text-muted-foreground">-</span>
                  <Input type="time" value={schedule.end_time} onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)} className="w-24" disabled={isBusy}/>
                  <Input type="number" placeholder="Order" value={schedule.display_order_override} onChange={(e) => handleScheduleChange(index, 'display_order_override', parseInt(e.target.value, 10) || 0)} className="w-20" disabled={isBusy}/>
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSchedule(index)} disabled={isBusy}>
                    <Trash2 className="h-4 w-4 text-destructive"/>
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddSchedule} disabled={isBusy}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Schedule
              </Button>
            </div>
          </div>

        </div>
        </ScrollArea>
        </TooltipProvider>
        <DialogFooter className="pt-6">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isBusy}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isBusy}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
