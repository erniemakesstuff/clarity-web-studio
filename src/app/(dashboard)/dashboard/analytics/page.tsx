
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, GitCompareArrows, Activity, HelpCircle, Code2, BarChart as BarChartIcon } from "lucide-react";
import { ReceiptUploadForm } from "@/components/dashboard/ReceiptUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart, Cell } from "recharts";
import type { AnalyticsEntry, MenuItem } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ChartConfig } from "@/components/ui/chart";

const ADMIN_USER_RAW_IDS = ["admin@example.com", "valerm09@gmail.com"];

const CATEGORY_COLORS = [
  "hsl(220, 85%, 60%)", "hsl(150, 75%, 45%)", "hsl(350, 85%, 65%)", "hsl(45, 95%, 55%)",
  "hsl(270, 75%, 65%)", "hsl(25, 90%, 50%)", "hsl(190, 80%, 55%)", "hsl(320, 70%, 60%)",
  "hsl(90, 65%, 50%)", "hsl(0, 75%, 60%)", "hsl(240, 60%, 65%)", "hsl(170, 60%, 40%)",
  "hsl(60, 80%, 45%)", "hsl(300, 50%, 55%)", "hsl(200, 90%, 50%)", "hsl(120, 50%, 40%)",
  "hsl(30, 100%, 50%)", "hsl(280, 45%, 50%)", "hsl(10, 80%, 55%)", "hsl(130, 70%, 50%)",
];

const getSafeCategory = (catString?: string | null): string => {
  const trimmed = catString?.trim();
  return (trimmed && trimmed.length > 0) ? trimmed : "Other";
};

export default function AnalyticsPage() {
  const { selectedMenuInstance, isLoadingMenuInstances, rawOwnerId, rawMenuApiResponseText } = useAuth();
  const [selectedItemForExplorer, setSelectedItemForExplorer] = useState<string | null>(null);
  
  const menuItems: MenuItem[] = selectedMenuInstance?.menu || [];
  const analyticsData: AnalyticsEntry[] | null | undefined = selectedMenuInstance?.analytics;
  
  const itemCategoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (menuItems) {
      menuItems.forEach(item => {
        map.set(item.name, getSafeCategory(item.category));
      });
    }
    return map;
  }, [menuItems]);


  const { topPairs, allItemsForDropdown } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { topPairs: [], allItemsForDropdown: [] };
    }

    const coOccurrence: { [key: string]: number } = {};
    const allItems = new Set<string>();

    analyticsData.forEach(entry => {
      const itemA = entry.food_name.trim();
      allItems.add(itemA);

      if (Array.isArray(entry.purchased_with)) {
        entry.purchased_with.forEach(relatedEntry => {
          const itemB = relatedEntry.food_name.trim();
          allItems.add(itemB);
          
          const pairKey = [itemA, itemB].sort().join("||");
          const count = relatedEntry.purchase_count || 0;

          if (itemA !== itemB && count > 0) {
             coOccurrence[pairKey] = (coOccurrence[pairKey] || 0) + count;
          }
        });
      }
    });
    
    // Since the data is bidirectional (A->B and B->A), divide counts by 2.
    Object.keys(coOccurrence).forEach(key => {
        coOccurrence[key] = Math.ceil(coOccurrence[key] / 2);
    });

    const sortedPairs = Object.entries(coOccurrence)
      .map(([pairKey, count]) => {
        const [itemA, itemB] = pairKey.split("||");
        return { itemA, itemB, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { topPairs: sortedPairs, allItemsForDropdown: Array.from(allItems).sort() };
  }, [analyticsData]);

  const explorerChartData = useMemo(() => {
    if (!selectedItemForExplorer || !analyticsData) {
      return [];
    }
    const selectedItemData = analyticsData.find(entry => entry.food_name.trim() === selectedItemForExplorer);
    if (!selectedItemData || !Array.isArray(selectedItemData.purchased_with)) {
        return [];
    }
    
    return selectedItemData.purchased_with
      .sort((a, b) => b.purchase_count - a.purchase_count)
      .slice(0, 10)
      .map(pw => ({
        name: pw.food_name,
        count: pw.purchase_count,
        category: itemCategoryMap.get(pw.food_name) || "Other",
      }));
  }, [selectedItemForExplorer, analyticsData, itemCategoryMap]);

  const { itemPerformanceData, itemPerformanceChartConfig, dateRangeString } = useMemo(() => {
    if (!analyticsData) return { itemPerformanceData: [], itemPerformanceChartConfig: { config: {}, payload: [] }, dateRangeString: "" };
    
    const itemMap = new Map<string, { name: string; count: number; category: string }>();

    analyticsData.forEach(entry => {
        const name = entry.food_name.trim();
        const existing = itemMap.get(name);
        if (existing) {
            existing.count += entry.purchase_count;
        } else {
            itemMap.set(name, {
                name: name,
                count: entry.purchase_count,
                category: itemCategoryMap.get(name) || "Other",
            });
        }
    });

    const allItems = Array.from(itemMap.values())
        .sort((a, b) => {
            if (a.category < b.category) return -1;
            if (a.category > b.category) return 1;
            return b.count - a.count;
        });

    const itemCategories = [...new Set(allItems.map(item => item.category))].sort();
    
    const config: ChartConfig = {};
    const payload = itemCategories.map((category, index) => {
      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
      config[category] = {
        label: category,
        color: color,
      };
      return {
        value: category,
        type: 'square' as const,
        id: category,
        color: color,
      };
    });
    
    const dates = analyticsData.map(entry => {
      const dateString = entry.timestamp_day; // "YYYY-MM-DD"
      const entryDate = new Date(`${dateString}T00:00:00`);
      return isNaN(entryDate.getTime()) ? null : entryDate;
    }).filter((d): d is Date => d !== null);

    let calculatedDateRangeString = '';
    if (dates.length > 0) {
      const minDate = new Date(Math.min.apply(null, dates.map(d => d.getTime())));
      const maxDate = new Date(Math.max.apply(null, dates.map(d => d.getTime())));
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
      if (minDate.getTime() === maxDate.getTime()) {
        calculatedDateRangeString = `Data for ${minDate.toLocaleDateString(undefined, options)}.`;
      } else {
        calculatedDateRangeString = `Data from ${minDate.toLocaleDateString(undefined, options)} to ${maxDate.toLocaleDateString(undefined, options)}.`;
      }
    }

    return { itemPerformanceData: allItems, itemPerformanceChartConfig: { config, payload }, dateRangeString: calculatedDateRangeString };
  }, [analyticsData, itemCategoryMap]);


  const renderContent = () => {
    if (isLoadingMenuInstances) {
      return (
        <>
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Loading Menu Context...</CardTitle></CardHeader>
            <CardContent><p>Please wait while we load your menu information.</p></CardContent>
          </Card>
          <Card className="shadow-lg"><CardHeader><CardTitle>Loading Analytics...</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-[250px] w-full" />
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </>
      );
    }
    if (!selectedMenuInstance) {
       return (
         <Alert variant="default" className="border-primary/50 bg-primary/5">
            <Activity className="h-5 w-5 text-primary" />
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
            <CardTitle className="flex items-center gap-2 text-2xl">
              <TrendingUp className="mr-2 h-7 w-7 text-primary" />
              <span>Top Upsell Opportunities</span>
            </CardTitle>
            <CardDescription>
              These are the most frequently co-purchased item pairs across all receipts, representing your strongest upsell opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item Pair</TableHead>
                        <TableHead className="text-right">Times Purchased Together</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topPairs.length > 0 ? topPairs.map((pair, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <span className="font-medium">{pair.itemA}</span> + <span className="font-medium">{pair.itemB}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-primary">{pair.count}</TableCell>
                        </TableRow>
                    )) : (
                       <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground py-10">
                                Not enough data to determine top pairs.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <GitCompareArrows className="mr-2 h-7 w-7 text-primary" />
                    <span>Explore Item Connections</span>
                </CardTitle>
                <CardDescription>
                    Select an item from the dropdown to see which other items it's most frequently purchased with.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Select onValueChange={setSelectedItemForExplorer} value={selectedItemForExplorer || ""}>
                    <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue placeholder="Select an item to explore..." />
                    </SelectTrigger>
                    <SelectContent>
                        {allItemsForDropdown.map(item => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedItemForExplorer && (
                    <div className="mt-6">
                        {explorerChartData.length > 0 ? (
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <RechartsBarChart data={explorerChartData} layout="vertical" margin={{ right: 20, left:120 }}>
                                  <CartesianGrid horizontal={false} />
                                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={110} interval={0} />
                                  <XAxis dataKey="count" type="number" allowDecimals={false} />
                                  <ChartTooltip 
                                    cursor={{fill: 'hsl(var(--muted))'}}
                                    content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className="bg-background border p-2 shadow-lg rounded-md text-sm">
                                            <p className="font-bold text-foreground">{`${payload[0].payload.name}`}</p>
                                            <p className="text-muted-foreground">{`Purchased with ${selectedItemForExplorer}: ${payload[0].value} times`}</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                  <Bar dataKey="count" layout="vertical" radius={4} barSize={20} fill="hsl(var(--primary))" />
                                </RechartsBarChart>
                            </ChartContainer>
                        ) : (
                            <p className="text-center text-muted-foreground pt-10">No co-purchase data found for "{selectedItemForExplorer}".</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="shadow-lg mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                    <BarChartIcon className="mr-2 h-7 w-7 text-primary" />
                    <span>Item Performance by Category</span>
                </CardTitle>
                <CardDescription>
                    Purchase counts for individual items, visually grouped by category. {dateRangeString}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {itemPerformanceData.length > 0 ? (
                  <div className="flex gap-4">
                    <ChartContainer config={itemPerformanceChartConfig.config} className="h-[450px] flex-1">
                        <RechartsBarChart 
                            data={itemPerformanceData}
                            margin={{ top: 5, right: 20, left: 20, bottom: 90 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 10 }}
                                angle={-60}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis dataKey="count" allowDecimals={false} />
                            <ChartTooltip
                                cursor={{ fill: "hsl(var(--muted))" }}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="count" radius={4}>
                                {itemPerformanceData.map((item) => (
                                    <Cell
                                        key={`cell-${item.name}`}
                                        fill={itemPerformanceChartConfig.config[item.category]?.color || '#8884d8'}
                                    />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ChartContainer>
                    <div className="w-48 space-y-2 py-4 pl-4 border-l">
                      <h4 className="font-semibold text-sm mb-2 border-b pb-2">Categories</h4>
                      {itemPerformanceChartConfig.payload.map(entry => (
                          <div key={entry.id as string} className="flex items-center gap-2 text-xs">
                              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                              <span className="text-muted-foreground">{entry.value as string}</span>
                          </div>
                      ))}
                    </div>
                  </div>
                ) : (
                    <p className="text-center text-muted-foreground py-10">No item performance data available to display.</p>
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

      {ADMIN_USER_RAW_IDS.includes(rawOwnerId || "") && rawMenuApiResponseText && (
        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
                <Code2 className="mr-2 h-6 w-6 text-muted-foreground" />
                Dev: Raw API Response (Menu Data)
            </CardTitle>
            <CardDescription>
              This is the raw JSON text received from the menu fetch API for the currently selected or loaded menu(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={rawMenuApiResponseText}
              className="h-96 font-mono text-xs bg-secondary/30 border-border"
              placeholder="No raw API response available..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
