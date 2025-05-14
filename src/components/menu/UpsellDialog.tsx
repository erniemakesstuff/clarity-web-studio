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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";
import { getUpsellSuggestions, type UpsellSuggestionsInput } from "@/ai/flows/upsell-suggestions"; // Ensure correct path
import { Skeleton } from "@/components/ui/skeleton";

interface UpsellDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedItem: MenuItem | null;
  menuItems: MenuItem[]; // Full menu to provide context for AI
}

// Mock function to simulate fetching AI suggestions
async function fetchMockUpsellSuggestions(item: MenuItem, allItems: MenuItem[]): Promise<string[]> {
  // In a real scenario, you'd call the AI flow:
  // const input: UpsellSuggestionsInput = {
  //   menuDescription: allItems.map(mi => `${mi.name}: ${mi.description}`).join('\n'),
  //   orderedItem: item.name,
  // };
  // const result = await getUpsellSuggestions(input);
  // return result.upsellSuggestions;
  
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  const potentialUpsells = allItems.filter(mi => mi.id !== item.id && mi.category !== item.category).slice(0,3);
  if (potentialUpsells.length === 0 && allItems.length > 1) {
     return allItems.filter(mi => mi.id !== item.id).slice(0,1).map(mi => `How about a ${mi.name}?`);
  }
  return potentialUpsells.map(mi => `Perhaps a ${mi.name} to go with your ${item.name}?`);
}


export function UpsellDialog({ isOpen, onOpenChange, selectedItem, menuItems }: UpsellDialogProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedItem) {
      setIsLoading(true);
      // Generate a simple menu description for the AI
      const menuDescription = menuItems.map(item => `${item.name} - ${item.description} (${item.price})`).join("\n");
      const input: UpsellSuggestionsInput = {
        menuDescription: menuDescription,
        orderedItem: selectedItem.name,
      };

      getUpsellSuggestions(input)
        .then(response => {
          setSuggestions(response.upsellSuggestions.slice(0, 3)); // Take top 3
        })
        .catch(error => {
          console.error("Error fetching upsell suggestions:", error);
          // Fallback suggestions
          setSuggestions([
            `A refreshing drink?`,
            `Our popular side dish?`
          ]);
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
          <Button onClick={() => onOpenChange(false)}>Add to Order (Mock)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
