
"use client";

import Image from "next/image";
import type { MenuItem, MediaObject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ImageOff } from "lucide-react";

interface UpsellCarouselCardProps {
  item: MenuItem;
  onOrderClick: (item: MenuItem) => void;
}

export function UpsellCarouselCard({ item, onOrderClick }: UpsellCarouselCardProps) {
  const firstImage: MediaObject | undefined = item.media?.find(m => m.type === 'image');

  return (
    <Card className="w-full max-w-xs mx-auto bg-background/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden flex flex-col h-auto max-h-[90vh]">
      <div className="relative w-full aspect-[4/3]">
        {firstImage && firstImage.url ? (
          <Image
            src={firstImage.url}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={firstImage.dataAiHint || "food item"}
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <ImageOff className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardHeader className="p-4">
        <CardTitle className="text-lg font-semibold text-foreground truncate">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow overflow-y-auto">
        <CardDescription className="text-sm text-muted-foreground line-clamp-3">{item.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 border-t border-border/20 flex flex-col items-stretch gap-3">
        <p className="text-xl font-bold text-primary self-center">{item.price}</p>
        <Button 
          onClick={() => onOrderClick(item)} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          Add to Order
        </Button>
      </CardFooter>
    </Card>
  );
}
