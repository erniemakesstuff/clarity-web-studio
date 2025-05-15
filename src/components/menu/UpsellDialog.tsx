
"use client";

import type { MenuItem } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card"; // Removed CardHeader, CardTitle as they are not used in the loop
import { Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import { getUpsellSuggestions, type UpsellSuggestionsInput } from "@/ai/flows/upsell-suggestions"; 
import { Skeleton } from "@/components/ui/skeleton";

interface UpsellDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedItem: MenuItem | null;
  menuItems: MenuItem[]; 
}

export function UpsellDialog({ isOpen, onOpenChange, selectedItem, menuItems }: UpsellDialogProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedItem) {
      setIsLoading(true);
      const menuDescription = menuItems.map(item => `${item.name} - ${item.description} (${item.price})`).join("\n");
      const input: UpsellSuggestionsInput = {
        menuDescription: menuDescription,
        orderedItem: selectedItem.name,
      };

      getUpsellSuggestions(input)
        .then(response => {
          setSuggestions(response.upsellSuggestions.slice(0, 3)); 
        })
        .catch(error => {
          console.error("Error fetching upsell suggestions:", error);
          // Fallback suggestions for dialog
          const potentialUpsells = menuItems.filter(mi => mi.id !== selectedItem.id && mi.category !== selectedItem.category).slice(0,2);
          if (potentialUpsells.length > 0) {
            setSuggestions(potentialUpsells.map(mi => `How about our ${mi.name}?`));
          } else {
            setSuggestions([`A refreshing drink?`]);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, selectedItem, menuItems]);

  if (!selectedItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Lightbulb className="h-6 w-6 text-primary mr-2" />
            Great Choice!
          </DialogTitle>
          <DialogDescription className="pt-2">
            You've selected: <strong>{selectedItem.name}</strong>.
            How about adding one of these?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </>
          ) : suggestions.length > 0 ? (
            suggestions.map((suggestion, index) => (
              <Card key={index} className="bg-secondary/50 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-secondary-foreground">{suggestion}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-center">No specific suggestions right now, but enjoy your meal!</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Maybe Next Time</Button>
          <Button onClick={() => {
            alert(`Added ${selectedItem.name} and (mock) suggestions to order!`);
            onOpenChange(false);
          }}>Add to Order (Mock)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
