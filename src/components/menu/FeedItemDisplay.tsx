
"use client";

import Image from "next/image";
import type { MenuItem, DietaryIcon } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Leaf, WheatOff, Flame, ShoppingCart, Zap } from "lucide-react";

interface FeedItemDisplayProps {
  item: MenuItem;
  onUpsellClick: (item: MenuItem) => void;
}

const dietaryIconMap: Record<DietaryIcon, React.ReactNode> = {
  vegetarian: <Leaf size={18} className="text-green-500" />,
  vegan: <Leaf size={18} className="text-green-600" />,
  "gluten-free": <WheatOff size={18} className="text-orange-500" />,
  spicy: <Flame size={18} className="text-red-500" />,
};

const dietaryIconTooltip: Record<DietaryIcon, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  "gluten-free": "Gluten-Free",
  spicy: "Spicy",
};

export function FeedItemDisplay({ item, onUpsellClick }: FeedItemDisplayProps) {
  return (
    <div className="relative h-full w-full flex flex-col text-white overflow-hidden bg-gradient-to-t from-black/80 via-black/30 to-transparent">
      {/* Background Media Layer */}
      <div className="absolute inset-0 z-0">
        {item.videoUrl ? (
          <video
            src={item.videoUrl}
            autoPlay
            loop
            muted
            playsInline // Important for iOS
            className="h-full w-full object-cover"
            onError={(e) => console.error("Video error:", e)}
            data-ai-hint="food video"
          />
        ) : item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            priority // Prioritize image loading for visible item
            data-ai-hint="food item"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center">
             <Zap size={128} className="text-primary-foreground opacity-30" />
          </div>
        )}
      </div>
      
      {/* Overlay Gradient for text visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-5"></div>


      {/* Content Layer */}
      <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-10 space-y-4">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
          {item.name}
        </h2>
        
        {item.dietaryIcons && item.dietaryIcons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.dietaryIcons.map((iconType) => (
              <Badge 
                key={iconType} 
                variant="outline" 
                className="flex items-center gap-1.5 py-1 px-2.5 text-sm bg-white/20 backdrop-blur-sm border-white/30 text-white" 
                title={dietaryIconTooltip[iconType]}
              >
                {dietaryIconMap[iconType]}
                <span>{dietaryIconTooltip[iconType]}</span>
              </Badge>
            ))}
          </div>
        )}

        <p className="text-base md:text-lg text-gray-200 line-clamp-3 leading-relaxed  shadow-black [text-shadow:_0_1px_3px_var(--tw-shadow-color)]">
          {item.description}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
          <p className="text-3xl md:text-4xl font-extrabold text-white shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">
            {item.price}
          </p>
          <Button 
            size="lg" 
            onClick={() => onUpsellClick(item)} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-3 rounded-lg shadow-lg transition-transform hover:scale-105 w-full sm:w-auto"
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Order Now
          </Button>
        </div>
      </div>
    </div>
  );
}
