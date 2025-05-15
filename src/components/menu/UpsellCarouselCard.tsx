
"use client";

import Image from "next/image";
import type { MenuItem, MediaObject } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageOff } from "lucide-react";

interface UpsellCarouselCardProps {
  item: MenuItem; // The upsell item
  mainItemName: string; // Name of the main item this upsell relates to
  onOrderClick: (item: MenuItem) => void;
}

export function UpsellCarouselCard({ item, mainItemName, onOrderClick }: UpsellCarouselCardProps) {
  const firstImage: MediaObject | undefined = item.media?.find(m => m.type === 'image');

  return (
    <Card className="w-full max-w-xs mx-auto bg-background/90 backdrop-blur-sm shadow-xl rounded-2xl overflow-hidden flex flex-col h-auto max-h-[90vh]">
      {/* Suggestion Header */}
      <div className="p-4 text-center bg-primary/10">
        <p className="text-xs text-primary/80">Goes great with your</p>
        <p className="text-sm font-semibold text-primary mb-1">{mainItemName}</p>
        <h4 className="text-md font-bold text-foreground">You Might Also Like:</h4>
      </div>

      {/* Actual Item Media and Details */}
      <div className="relative w-full aspect-[4/3] mt-2">
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
      <CardHeader className="p-4 pt-2">
        <CardTitle className="text-lg font-semibold text-foreground truncate">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-grow overflow-y-auto">
        <CardDescription className="text-sm text-muted-foreground line-clamp-3">{item.description}</CardDescription>
      </CardContent>
      <CardFooter className="p-4 border-t border-border/20 flex flex-col items-stretch gap-3">
        <p className="text-xl font-bold text-primary self-center">{item.price}</p>
      </CardFooter>
    </Card>
  );
}
