
"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig, AlertTriangle, Activity, HelpCircle, Share2, ZoomIn } from "lucide-react";
import { ReceiptUploadForm } from "@/components/dashboard/ReceiptUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart, TooltipProps, Cell } from "recharts";
import type { AnalyticsEntry, AnalyticsPurchasedWithEntry } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { NetworkGraphChart } from "@/components/dashboard/analytics/NetworkGraphChart";
import type { NetworkNode, NetworkLinkMap } from "@/components/dashboard/analytics/NetworkGraphChart";


// Helper for Heatmap cell color
const getHeatmapColor = (value: number, maxValue: number): string => {
  if (maxValue === 0 || value <= 0) return "hsl(var(--secondary))"; // Use secondary for no/low data
  const intensity = Math.min(1, value / maxValue);
  // Using a teal-based sequential scale
  // Base lightness (for low values, closer to background)
  const baseLightness = 90; // Lighter for less intense
  // Target lightness (for high values, more intense color)
  const targetLightness = 30; // Darker for more intense
  // Interpolate lightness
  const lightness = baseLightness - (baseLightness - targetLightness) * intensity;
  return `hsl(180, 60%, ${lightness}%)`; // Hue 180 is Teal
};

const CustomHeatmapTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as any; // Cast to any to access xCat, yCat, count
    if (!data || data.xCat === data.yCat || !data.count || data.count <= 0) return null; // Don't show for diagonal or zero count
    return (
      <div className="bg-background border border-border shadow-lg rounded-md p-3 text-sm">
        <p className="font-semibold text-foreground">{data.xCat} & {data.yCat}</p>
        <p className="text-muted-foreground">Co-purchased: <span className="font-medium text-foreground">{data.count}</span> times</p>
      </div>
    );
  }
  return null;
};

// Category Colors for Network Graph
const CATEGORY_COLORS: Record<string, string> = {
  "Appetizers": "hsl(var(--chart-1))", // Teal-ish
  "Entrees": "hsl(var(--chart-2))", // Orange-ish
  "Main Courses": "hsl(var(--chart-2))", // Alias for Entrees
  "Drinks": "hsl(var(--chart-3))", // Blue-ish
  "Desserts": "hsl(var(--chart-4))", // Pink-ish
  "Sides": "hsl(var(--chart-5))", // Green-ish
  "Salads": "hsl(39, 90%, 60%)", // yellowish-orange
  "Pizzas": "hsl(10, 80%, 60%)", // reddish
  "Pastas": "hsl(45, 85%, 65%)", // gold
  "Soups": "hsl(190, 70%, 55%)", // light blue
  "Burgers": "hsl(25, 75%, 55%)", // brownish-orange
  "Sandwiches": "hsl(60, 60%, 50%)", // olive
  "Seafood": "hsl(210, 70%, 60%)", // blue
  "Kids Menu": "hsl(300, 70%, 70%)", // pinkish-purple
  "Other": "hsl(var(--muted-foreground))", // Grey for uncategorized or 'Other'
};
const DEFAULT_CATEGORY_COLOR = "hsl(var(--muted))"; // A default fallback

function getCategoryColorForGraph(category?: string): string {
  if (!category) return DEFAULT_CATEGORY_COLOR;
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR;
}


export default function AnalyticsPage() {
  const { selectedMenuInstance, isLoadingMenuInstances } = useAuth();
  const [itemForDetailedView, setItemForDetailedView] = useState<string | null>(null);

  const analyticsData: AnalyticsEntry[] | null | undefined = selectedMenuInstance?.analytics;

  const { allFoodNamesWithCategories, heatmapData, maxHeatmapValue } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { allFoodNamesWithCategories: [], heatmapData: [], maxHeatmapValue: 0 };
    }

    const itemsMap = new Map<string, { name: string, category: string }>();
    analyticsData.forEach(entry => {
      const mainFoodName = entry.food_name?.trim();
      const mainFoodCategory = entry.FoodCategory?.trim() || "Other";
      if (mainFoodName && !itemsMap.has(mainFoodName)) {
        itemsMap.set(mainFoodName, { name: mainFoodName, category: mainFoodCategory });
      }
      entry.purchased_with.forEach(pw => {
         const purchasedWithName = pw.food_name?.trim();
         const purchasedWithCategory = pw.FoodCategory?.trim() || "Other";
         if (purchasedWithName && !itemsMap.has(purchasedWithName)) {
           itemsMap.set(purchasedWithName, { name: purchasedWithName, category: purchasedWithCategory });
         }
      });
    });

    const sortedItems = Array.from(itemsMap.values()).sort((a, b) => {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      return a.name.localeCompare(b.name);
    });

    const foodNames = sortedItems.map(item => item.name); 

    const coOccurrence: { [keyA: string]: { [keyB: string]: number } } = {};
    let currentMax = 0;

    analyticsData.forEach(entry => {
      const itemA = entry.food_name?.trim();
      if (!itemA || !foodNames.includes(itemA)) return; 
      if (!coOccurrence[itemA]) coOccurrence[itemA] = {};

      entry.purchased_with.forEach(relatedEntry => {
        const itemB = relatedEntry.food_name?.trim();
        if (!itemB || !foodNames.includes(itemB)) return; 
        if (!coOccurrence[itemB]) coOccurrence[itemB] = {}; 
        
        const count = relatedEntry.purchase_count;
        
        coOccurrence[itemA][itemB] = (coOccurrence[itemA][itemB] || 0) + count;
        if (itemA !== itemB) { 
            coOccurrence[itemB][itemA] = (coOccurrence[itemB][itemA] || 0) + count;
        }
        if (itemA !== itemB && count > currentMax) currentMax = count;
      });
    });

    const hData = [];
    if (foodNames.length > 0) {
      for (let i = 0; i < foodNames.length; i++) {
          for (let j = 0; j < foodNames.length; j++) {
              const nameA = foodNames[i];
              const nameB = foodNames[j];
              const count = nameA === nameB ? 0 : (coOccurrence[nameA]?.[nameB] || 0);
              hData.push({ xCat: nameA, yCat: nameB, count, _cellSize: 1 });
          }
      }
    }
    return { allFoodNamesWithCategories: sortedItems, heatmapData: hData, maxHeatmapValue: currentMax };
  }, [analyticsData]);


  const { networkNodes, networkLinksMap } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { networkNodes: [], networkLinksMap: new Map() };
    }

    const nodes: Omit<NetworkNode, 'x' | 'y'>[] = [];
    const linksMap: NetworkLinkMap = new Map();
    const foodItemDetails = new Map<string, { category: string, total_purchase_count: number }>();

    analyticsData.forEach(entry => {
      const name = entry.food_name.trim();
      if (name) {
        foodItemDetails.set(name, {
          category: entry.FoodCategory?.trim() || "Other",
          total_purchase_count: entry.purchase_count,
        });

        if (!linksMap.has(name)) {
          linksMap.set(name, []);
        }
        entry.purchased_with.forEach(pw => {
          const linkedName = pw.food_name.trim();
          if (linkedName) {
            linksMap.get(name)?.push({ target: linkedName, count: pw.purchase_count });
            if (!foodItemDetails.has(linkedName)) {
                const linkedItemEntry = analyticsData.find(e => e.food_name.trim() === linkedName);
                foodItemDetails.set(linkedName, {
                    category: pw.FoodCategory?.trim() || linkedItemEntry?.FoodCategory?.trim() || "Other",
                    total_purchase_count: linkedItemEntry?.purchase_count || 0,
                });
            }
          }
        });
      }
    });

    foodItemDetails.forEach((details, name) => {
      nodes.push({
        id: name,
        name: name,
        category: details.category,
        value: details.total_purchase_count,
        color: getCategoryColorForGraph(details.category),
      });
    });
    
    const finalNodes: NetworkNode[] = nodes.map((node, i, arr) => {
        const angle = (i / arr.length) * 2 * Math.PI;
        const radius = Math.min(250, arr.length * 15);
        return {
            ...node,
            x: 300 + radius * Math.cos(angle),
            y: 200 + radius * Math.sin(angle),
        };
    });

    return { networkNodes: finalNodes, networkLinksMap: linksMap };
  }, [analyticsData]);


  const handleHeatmapCellClick = useCallback((data: any) => {
    if (typeof data === 'string') {
        setItemForDetailedView(data);
    } else if (data && data.xCat) {
        setItemForDetailedView(data.xCat);
    }
  }, []);


  const heatmapCellsToRender = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return null;

    return heatmapData.map((entry) => {
        const isVisibleCell = entry.xCat !== entry.yCat && entry.count > 0;
        return (
            <Cell
                key={`heatmap-cell-${entry.xCat}-${entry.yCat}`}
                fill={isVisibleCell ? getHeatmapColor(entry.count, maxHeatmapValue) : 'transparent'}
                onClick={isVisibleCell ? () => handleHeatmapCellClick(entry) : undefined}
                className={isVisibleCell ? "cursor-pointer hover:opacity-70" : "pointer-events-none"}
            />
        );
    });
  }, [heatmapData, maxHeatmapValue, handleHeatmapCellClick]);

  const allFoodNames = allFoodNamesWithCategories.map(item => item.name);

  const renderContent = () => {
    if (isLoadingMenuInstances) {
      return (
        <>
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Loading Menu Context...</CardTitle></CardHeader>
            <CardContent><p>Please wait while we load your menu information.</p></CardContent>
          </Card>
          <Card className="shadow-lg"><CardHeader><CardTitle>Loading Charts...</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-[400px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </>
      );
    }
    if (!selectedMenuInstance) {
       return (
         <Alert variant="default" className="border-primary/50 bg-primary/5">
            <BarChartBig className="h-5 w-5 text-primary" />
            <AlertTitleUI className="text-primary">Select a Menu</AlertTitleUI>
            <AlertDescription>
              Please select a menu instance from the dropdown in the header to enable receipt uploads and view analytics.
            </AlertDescription>
        </Alert>
       );
    }

    if (!analyticsData || analyticsData.length === 0) {
      return (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Activity className="mr-3 h-7 w-7 text-primary" />
              Performance Insights
            </CardTitle>
            <CardDescription>
              Track item co-purchase patterns and specific item relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-20 text-muted-foreground">
              <HelpCircle className="mx-auto h-16 w-16 mb-6 opacity-50" />
              <p className="text-xl">No Analytics Data Available</p>
              <p>Upload receipts or check back later once data is processed for this menu.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Activity className="mr-3 h-7 w-7 text-primary" />
              Item Co-purchase Heatmap
            </CardTitle>
            <CardDescription>
              Visualizes how frequently pairs of items are purchased together. Darker cells indicate stronger co-purchase. Food items are grouped by category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {heatmapData.length > 0 && allFoodNames.length > 0 ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <div style={{ minWidth: `${Math.max(600, allFoodNames.length * 70)}px` }} className="pb-4"> 
                  <ChartContainer config={{}} className="h-[500px] w-full"> 
                    <RechartsBarChart
                        layout="vertical"
                        data={heatmapData}
                        margin={{ top: 20, right: 50, bottom: 100, left: 150 }} 
                        barCategoryGap={0} 
                        barGap={0} 
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            type="category"
                            dataKey="xCat" 
                            name="Food Item A"
                            ticks={allFoodNames}
                            tick={{ fontSize: 10, angle: -60, textAnchor: 'end' }}
                            height={100} 
                            interval={0} 
                            allowDuplicatedCategory={true}
                        />
                        <YAxis
                            type="category"
                            dataKey="yCat" 
                            name="Food Item B"
                            ticks={allFoodNames}
                            tick={{ fontSize: 10 }}
                            width={140} 
                            interval={0} 
                            allowDuplicatedCategory={true}
                        />
                         <ChartTooltip content={<CustomHeatmapTooltip />} cursor={{ strokeDasharray: '3 3', fill: 'transparent' }}/>
                         <Bar dataKey="_cellSize" isAnimationActive={false} barSize={40}> 
                           {heatmapCellsToRender}
                         </Bar>
                    </RechartsBarChart>
                  </ChartContainer>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4">No co-purchase data to display for the heatmap.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Share2 className="mr-3 h-7 w-7 text-primary" />
              Co-purchase Network Graph
            </CardTitle>
            <CardDescription>
              Visualizes item relationships. Nodes are food items (sized by total purchases, colored by category). Hover for co-purchase details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {networkNodes.length > 0 ? (
                <NetworkGraphChart nodes={networkNodes} linksMap={networkLinksMap} />
            ) : (
              <p className="text-muted-foreground text-center py-4">No data available for the network graph.</p>
            )}
          </CardContent>
        </Card>
      </>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Upload receipts and analyze item co-purchase patterns and relationships.
        </p>
      </div>
      
      <ReceiptUploadForm />
      {renderContent()}
    </div>
  );
}

