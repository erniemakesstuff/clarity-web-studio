
"use client";

import Image from "next/image";
import type { MenuItem, DietaryIcon, MediaObject } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// import { Button } from "@/components/ui/button"; // Button no longer used
import { Badge } from "@/components/ui/badge";
import { Leaf, WheatOff, Flame, ImageOff } from "lucide-react"; // Removed ShoppingCart, Info

interface MenuItemCardProps {
  item: MenuItem;
  onUpsellClick: (item: MenuItem) => void; // Prop remains, though button is removed
}

const dietaryIconMap: Record<DietaryIcon, React.ReactNode> = {
  vegetarian: <Leaf size={16} className="text-green-600" />,
  vegan: <Leaf size={16} className="text-green-700" />, 
  "gluten-free": <WheatOff size={16} className="text-orange-600" />,
  spicy: <Flame size={16} className="text-red-600" />,
};

const dietaryIconTooltip: Record<DietaryIcon, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-Free",
  spicy: "Spicy",
};

export function MenuItemCard({ item, onUpsellClick }: MenuItemCardProps) {
  const firstImage: MediaObject | undefined = item.media?.find(m => m.type === 'image');

  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl bg-card">
      <div className="relative w-full h-48 bg-secondary flex items-center justify-center">
        {firstImage ? (
          <Image
            src={firstImage.url}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={firstImage.dataAiHint || "food item"}
          />
        ) : (
          <ImageOff className="h-16 w-16 text-muted-foreground" />
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight text-card-foreground">{item.name}</CardTitle>
        {item.dietaryIcons && item.dietaryIcons.length > 0 && (
          <div className="flex space-x-2 mt-1">
            {item.dietaryIcons.map((iconType) => (
              <Badge key={iconType} variant="outline" className="flex items-center gap-1 py-0.5 px-1.5 text-xs border-border text-muted-foreground" title={dietaryIconTooltip[iconType]}>
                {dietaryIconMap[iconType]}
                <span className="hidden sm:inline">{dietaryIconTooltip[iconType]}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow pb-3">
        <CardDescription className="text-sm text-muted-foreground line-clamp-3">{item.description}</CardDescription>
      </CardContent>
      <CardFooter className="flex justify-start items-center pt-0 pb-4 px-4">
        <p className="text-lg font-bold text-primary">{item.price}</p>
        {/* "Order" Button removed as per request */}
      </CardFooter>
    </Card>
  );
}
