"use client";

import Image from "next/image";
import type { MenuItem, DietaryIcon } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, WheatOff, Flame, Info } from "lucide-react"; // Placeholder icons

interface MenuItemCardProps {
  item: MenuItem;
  onUpsellClick: (item: MenuItem) => void;
}

const dietaryIconMap: Record<DietaryIcon, React.ReactNode> = {
  vegetarian: <Leaf size={16} className="text-green-600" />,
  vegan: <Leaf size={16} className="text-green-700" />, // Differentiate slightly if needed
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
  return (
    <Card className="flex flex-col overflow-hidden h-full shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
      {item.imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={item.imageUrl}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint="food item"
          />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-semibold tracking-tight">{item.name}</CardTitle>
        {item.dietaryIcons && item.dietaryIcons.length > 0 && (
          <div className="flex space-x-2 mt-1">
            {item.dietaryIcons.map((iconType) => (
              <Badge key={iconType} variant="outline" className="flex items-center gap-1 py-0.5 px-1.5 text-xs" title={dietaryIconTooltip[iconType]}>
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
      <CardFooter className="flex justify-between items-center pt-0 pb-4 px-4">
        <p className="text-lg font-bold text-primary">{item.price}</p>
        <Button size="sm" onClick={() => onUpsellClick(item)}>
          Order
        </Button>
      </CardFooter>
    </Card>
  );
}
