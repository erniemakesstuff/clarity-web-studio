
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, GitCompareArrows, AlertTriangle, Activity, HelpCircle, Code2 } from "lucide-react";
import { ReceiptUploadForm } from "@/components/dashboard/ReceiptUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from "recharts";
import type { AnalyticsEntry } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEV_USER_RAW_ID = "admin@example.com";

const getSafeCategory = (catString?: string | null): string => {
  const trimmed = catString?.trim();
  return (trimmed && trimmed.length > 0) ? trimmed : "Other";
};

export default function AnalyticsPage() {
  const { selectedMenuInstance, isLoadingMenuInstances, rawOwnerId, rawMenuApiResponseText } = useAuth();
  const [selectedItemForExplorer, setSelectedItemForExplorer] = useState<string | null>(null);

  const analyticsData: AnalyticsEntry[] | null | undefined = selectedMenuInstance?.analytics;

  const { topPairs, allItemsForDropdown } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { topPairs: [], allItemsForDropdown: [] };
    }

    const coOccurrence: { [key: string]: number } = {};
    const allItems = new Set<string>();

    analyticsData.forEach(entry => {
      const itemA = entry.food_name.trim();
      allItems.add(itemA);

      entry.purchased_with.forEach(relatedEntry => {
        const itemB = relatedEntry.food_name.trim();
        allItems.add(itemB);
        
        const pairKey = [itemA, itemB].sort().join("||");
        
        if (itemA !== itemB) {
            coOccurrence[pairKey] = (coOccurrence[pairKey] || 0) + relatedEntry.purchase_count;
        }
      });
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
    if (!selectedItemData) {
        return [];
    }
    
    return selectedItemData.purchased_with
      .sort((a, b) => b.purchase_count - a.purchase_count)
      .slice(0, 10)
      .map(pw => ({
        name: pw.food_name,
        count: pw.purchase_count,
        category: getSafeCategory(pw.food_category)
      }));
  }, [selectedItemForExplorer, analyticsData]);


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

      {rawOwnerId === DEV_USER_RAW_ID && rawMenuApiResponseText && (
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
