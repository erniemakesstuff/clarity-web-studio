
"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig, AlertTriangle, Activity, HelpCircle, ZoomIn } from "lucide-react";
import { ReceiptUploadForm } from "@/components/dashboard/ReceiptUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart, TooltipProps, Rectangle, Cell } from "recharts";
import type { AnalyticsEntry, AnalyticsPurchasedWithEntry, MenuItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Helper for Heatmap cell color
const getHeatmapColor = (value: number, maxValue: number): string => {
  if (maxValue === 0 || value <= 0) return "hsl(var(--secondary))"; 
  const intensity = Math.min(1, value / maxValue); 
  const baseLightness = 90; 
  const targetLightness = 30; 
  const lightness = baseLightness - (baseLightness - targetLightness) * intensity;
  return `hsl(180, 60%, ${lightness}%)`; 
};


const CustomHeatmapTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as any; // Cast to any to access custom props like xCat, yCat, count
    if (!data || data.xCat === data.yCat || !data.count || data.count <= 0) return null; 
    return (
      <div className="bg-background border border-border shadow-lg rounded-md p-3 text-sm">
        <p className="font-semibold text-foreground">{data.xCat} & {data.yCat}</p>
        <p className="text-muted-foreground">Co-purchased: <span className="font-medium text-foreground">{data.count}</span> times</p>
      </div>
    );
  }
  return null;
};

interface AugmentedBarChartData {
  name: string;
  count: number;
}

export default function AnalyticsPage() {
  const { selectedMenuInstance, isLoadingMenuInstances } = useAuth();
  const [selectedFoodForDetails, setSelectedFoodForDetails] = useState<string | null>(null);

  const analyticsData: AnalyticsEntry[] | null | undefined = selectedMenuInstance?.analytics;

  const { allFoodNames, heatmapData, maxHeatmapValue } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0 || !selectedMenuInstance || !selectedMenuInstance.menu) {
      return { allFoodNames: [], heatmapData: [], maxHeatmapValue: 0 };
    }

    // 1. Create a map of food_name to food_category from the main menu items
    const foodNameToCategoryMap = new Map<string, string>();
    selectedMenuInstance.menu.forEach(menuItem => {
      if (menuItem.name && menuItem.category) {
        foodNameToCategoryMap.set(menuItem.name.trim(), menuItem.category.trim());
      }
    });
    
    // 2. Collect all unique food names involved in analytics
    const foodNameSet = new Set<string>();
    analyticsData.forEach(entry => {
      const mainFoodName = entry.food_name?.trim();
      if (mainFoodName) foodNameSet.add(mainFoodName);
      entry.purchased_with.forEach(pw => {
         const purchasedWithName = pw.food_name?.trim();
         if (purchasedWithName) foodNameSet.add(purchasedWithName);
      });
    });

    // 3. Create a list of objects { name: string, category: string } for sorting
    const itemsWithCategories = Array.from(foodNameSet).map(name => ({
      name,
      category: foodNameToCategoryMap.get(name) || "Uncategorized" // Fallback category
    }));

    // 4. Sort by category, then by name
    itemsWithCategories.sort((a, b) => {
      if (a.category < b.category) return -1;
      if (a.category > b.category) return 1;
      return a.name.localeCompare(b.name);
    });
    
    const sortedFoodNames = itemsWithCategories.map(item => item.name);

    const coOccurrence: { [keyA: string]: { [keyB: string]: number } } = {};
    let currentMax = 0;

    analyticsData.forEach(entry => {
      const itemA = entry.food_name ? entry.food_name.trim() : "";
      if (!itemA || !sortedFoodNames.includes(itemA)) return; 
      if (!coOccurrence[itemA]) coOccurrence[itemA] = {};
      
      entry.purchased_with.forEach(relatedEntry => {
        const itemB = relatedEntry.food_name ? relatedEntry.food_name.trim() : "";
        if (!itemB || !sortedFoodNames.includes(itemB)) return; 
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
    if (sortedFoodNames.length > 0) {
      for (let i = 0; i < sortedFoodNames.length; i++) {
          for (let j = 0; j < sortedFoodNames.length; j++) {
              const nameA = sortedFoodNames[i];
              const nameB = sortedFoodNames[j];
              const count = nameA === nameB ? 0 : (coOccurrence[nameA]?.[nameB] || 0) ;
              hData.push({ xCat: nameA, yCat: nameB, count, _cellSize: 1 });
          }
      }
    }

    return { allFoodNames: sortedFoodNames, heatmapData: hData, maxHeatmapValue: currentMax };
  }, [analyticsData, selectedMenuInstance]);
  
  const augmentedBarChartData = useMemo((): AugmentedBarChartData[] => {
    if (!selectedFoodForDetails || !analyticsData) return [];
    const selectedEntry = analyticsData.find(entry => entry.food_name === selectedFoodForDetails);
    if (!selectedEntry) return [];
    return selectedEntry.purchased_with
        .map(pw => ({ name: pw.food_name, count: pw.purchase_count }))
        .sort((a, b) => b.count - a.count); 
  }, [selectedFoodForDetails, analyticsData]);

  const handleHeatmapCellClick = useCallback((data: any) => {
    if (typeof data === 'string') { 
        setSelectedFoodForDetails(data);
    } else if (data && data.xCat) { 
        setSelectedFoodForDetails(data.xCat); 
    }
  }, []);

  const augmentedChartConfig = useMemo((): ChartConfig => {
    if (!augmentedBarChartData.length) return {};
    return {
      count: { label: "Co-Purchases", color: "hsl(var(--primary))" }, // Adjusted color for clarity
    };
  }, [augmentedBarChartData]);

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
              Visualizes how frequently pairs of items are purchased together. Darker cells indicate stronger co-purchase. Food items are grouped by category. Click an item name or cell to see detailed pairings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {heatmapData.length > 0 && allFoodNames.length > 0 ? (
              <ScrollArea className="w-full whitespace-nowrap">
                <div style={{ minWidth: `${Math.max(600, allFoodNames.length * 70)}px` }} className="pb-4"> {/* Increased multiplier for better spacing */}
                  <ChartContainer config={{}} className="h-[500px] w-full"> {/* Increased height */}
                    <RechartsBarChart
                        layout="vertical" 
                        data={heatmapData} 
                        margin={{ top: 20, right: 50, bottom: 100, left: 150 }} // Increased bottom margin for angled X-axis labels
                        barCategoryGap={0} 
                        barGap={0}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            type="category" 
                            dataKey="xCat" 
                            name="Food Item A" 
                            ticks={allFoodNames}
                            tick={{ fontSize: 10, angle: -60, textAnchor: 'end' }} // Increased angle for X-axis
                            height={100} // Adjusted height for X-axis
                            interval={0}
                            allowDuplicatedCategory={true} 
                            onClick={(e: any) => e.value && handleHeatmapCellClick(e.value)}
                            className="cursor-pointer"
                        />
                        <YAxis 
                            type="category" 
                            dataKey="yCat" 
                            name="Food Item B"
                            ticks={allFoodNames}
                            tick={{ fontSize: 10 }}
                            width={140} // Adjusted width for Y-axis
                            interval={0}
                            allowDuplicatedCategory={true} 
                            onClick={(e: any) => e.value && handleHeatmapCellClick(e.value)}
                            className="cursor-pointer"
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

        {selectedFoodForDetails && (
          <Card className="shadow-lg mt-8">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <ZoomIn className="mr-3 h-7 w-7 text-primary" />
                Frequently Purchased With: <span className="text-primary ml-2">{selectedFoodForDetails}</span>
              </CardTitle>
              <CardDescription>
                Items most commonly bought alongside "{selectedFoodForDetails}".
              </CardDescription>
            </CardHeader>
            <CardContent>
              {augmentedBarChartData.length > 0 ? (
                <ChartContainer config={augmentedChartConfig} className="h-[350px] w-full">
                  <RechartsBarChart data={augmentedBarChartData} layout="vertical" margin={{ right: 30, left: 150, bottom: 20}}> {/* Increased left margin for Y-axis labels */}
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 12}} interval={0} /> {/* Adjusted width */}
                    <ChartTooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}}/>
                    <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={30} />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <p className="text-muted-foreground text-center py-4">No specific co-purchase data found for "{selectedFoodForDetails}".</p>
              )}
            </CardContent>
          </Card>
        )}
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

