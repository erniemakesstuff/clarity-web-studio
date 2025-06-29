
"use client";

import Image from "next/image";
import type { MenuItem, DietaryIcon } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Leaf, WheatOff, Flame, Zap } from "lucide-react";
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";

interface FeedItemDisplayProps {
  item: MenuItem;
  allMenuItems: MenuItem[];
  onUpsellClick: (item: MenuItem) => void;
  onUpsellViewed: (itemId: string) => void;
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

export function FeedItemDisplay({ item, allMenuItems, onUpsellViewed }: FeedItemDisplayProps) {
    const upsellItems = useMemo(() => {
        if (!item.youMayAlsoLike || !allMenuItems) return [];
        const upsellMap = new Map(allMenuItems.map(i => [i.name, i]));
        return item.youMayAlsoLike.map(name => upsellMap.get(name)).filter((i): i is MenuItem => !!i);
    }, [item.youMayAlsoLike, allMenuItems]);

    const slides = useMemo(() => [item, ...upsellItems], [item, upsellItems]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        const slideWidth = scroller.offsetWidth;
        if (slideWidth === 0) return;
        const newIndex = Math.round(scroller.scrollLeft / slideWidth);
        
        setCurrentSlide(newIndex);
        if(newIndex > 0) {
            onUpsellViewed(slides[newIndex].id);
        }
    }, [slides, onUpsellViewed]);

    useEffect(() => {
        const scroller = scrollRef.current;
        if (!scroller) return;
        scroller.addEventListener("scroll", handleScroll, { passive: true });
        return () => scroller.removeEventListener("scroll", handleScroll);
    }, [handleScroll]);

    const renderSlideContent = (slideItem: MenuItem, isMainItem: boolean) => {
        const primaryImage = slideItem.media?.[0];
        return (
            <>
                <div className="absolute inset-0 z-0">
                    {primaryImage?.url ? (
                        <Image src={primaryImage.url} alt={slideItem.name} layout="fill" objectFit="cover" priority={isMainItem} data-ai-hint={primaryImage.dataAiHint || "food item"} />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-br from-primary via-primary/80 to-secondary flex items-center justify-center">
                            <Zap size={128} className="text-primary-foreground opacity-30" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                </div>
                <div className="relative z-10 flex-grow flex flex-col justify-end p-6 md:p-10 space-y-3">
                    {!isMainItem && <p className="text-sm font-semibold text-gray-200 shadow-black [text-shadow:_0_1px_3px_var(--tw-shadow-color)]">Pairs well with {item.name}</p>}
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)]">{slideItem.name}</h2>
                    {slideItem.dietaryIcons && slideItem.dietaryIcons.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                           {slideItem.dietaryIcons.map((iconType) => (
                               <Badge key={iconType} variant="outline" className="flex items-center gap-1.5 py-1 px-2.5 text-sm bg-white/20 backdrop-blur-sm border-white/30 text-white" title={dietaryIconTooltip[iconType]}>
                                   {dietaryIconMap[iconType]}
                                   <span>{dietaryIconTooltip[iconType]}</span>
                               </Badge>
                           ))}
                        </div>
                    )}
                    <p className="text-sm md:text-base text-gray-200 line-clamp-2 md:line-clamp-3 leading-relaxed shadow-black [text-shadow:_0_1px_3px_var(--tw-shadow-color)]">{slideItem.description}</p>
                    <p className="text-2xl md:text-3xl font-extrabold text-white shadow-black [text-shadow:_0_2px_4px_var(--tw-shadow-color)] pt-1">{slideItem.price}</p>
                </div>
            </>
        );
    };

    return (
        <div className="relative h-full w-full flex flex-col text-white overflow-hidden bg-black rounded-2xl shadow-lg">
            <div ref={scrollRef} className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth">
                {slides.map((slideItem, index) => (
                    <div key={slideItem.id} className="relative h-full w-full snap-center flex-shrink-0 flex flex-col">
                        {renderSlideContent(slideItem, index === 0)}
                    </div>
                ))}
            </div>

            {slides.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-2 pointer-events-none">
                    {slides.map((_, index) => (
                        <div key={index} className={`h-2 w-2 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-white scale-125' : 'bg-white/50'}`} />
                    ))}
                </div>
            )}
        </div>
    );
}
