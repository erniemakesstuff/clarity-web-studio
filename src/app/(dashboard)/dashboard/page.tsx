
"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Utensils, TrendingUp, ShoppingBag, Users, Code2 } from "lucide-react";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart, Cell } from "recharts"
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { subMonths, startOfWeek, format } from "date-fns";
import type { ChartConfig as ChartConfigType } from "@/components/ui/chart";
import { Textarea } from "@/components/ui/textarea";

const DEV_USER_RAW_ID = "admin@example.com";

// Expanded, deterministic color palette for categories
const CATEGORY_COLORS = [
  "hsl(220, 85%, 60%)",
  "hsl(150, 75%, 45%)",
  "hsl(350, 85%, 65%)",
  "hsl(45, 95%, 55%)",
  "hsl(270, 75%, 65%)",
  "hsl(25, 90%, 50%)",
  "hsl(190, 80%, 55%)",
  "hsl(320, 70%, 60%)",
  "hsl(90, 65%, 50%)",
  "hsl(0, 75%, 60%)",
  "hsl(240, 60%, 65%)",
  "hsl(170, 60%, 40%)",
  "hsl(60, 80%, 45%)",
  "hsl(300, 50%, 55%)",
  "hsl(200, 90%, 50%)",
  "hsl(120, 50%, 40%)",
  "hsl(30, 100%, 50%)",
  "hsl(280, 45%, 50%)",
  "hsl(10, 80%, 55%)",
  "hsl(130, 70%, 50%)",
];

const getSafeCategory = (catString?: string | null): string => {
  const trimmed = catString?.trim();
  return (trimmed && trimmed.length > 0) ? trimmed : "Other";
};

export default function DashboardOverviewPage() {
  const { selectedMenuInstance, isLoadingMenuInstances, rawOwnerId, rawMenuApiResponseText } = useAuth();
  const analyticsData = selectedMenuInstance?.analytics;

  const { stats, weeklyChartData, weeklyChartConfig, topSellingItems, itemChartConfig, itemLegendPayload } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { stats: null, weeklyChartData: [], weeklyChartConfig: {}, topSellingItems: [], itemChartConfig: {}, itemLegendPayload: [] };
    }
    
    // --- Logic for Stat Cards ---
    let totalItemsSold = 0;
    let totalCoPurchases = 0;
    let trendingItem = { name: "N/A", purchase_count: -1, category: "N/A" };

    analyticsData.forEach(entry => {
      totalItemsSold += entry.purchase_count;
      totalCoPurchases += entry.purchased_with.reduce((sum, pw) => sum + pw.purchase_count, 0);

      if (entry.purchase_count > trendingItem.purchase_count) {
        trendingItem = { name: entry.food_name, purchase_count: entry.purchase_count, category: entry.food_category };
      }
    });

    // --- Logic for Weekly Sales Chart ---
    const allDates = analyticsData.map(entry => {
        const parts = entry.timestamp_day.split('/');
        if (parts.length !== 3) return null;
        const d = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
        return isNaN(d.getTime()) ? null : d;
    }).filter((d): d is Date => d !== null);
    
    if (allDates.length === 0) {
        return { stats: { totalItemsSold, totalCoPurchases, trendingItem }, weeklyChartData: [], weeklyChartConfig: {}, topSellingItems: [], itemChartConfig: {}, itemLegendPayload: [] };
    }
    
    const maxDate = new Date(Math.max.apply(null, allDates.map(d => d.getTime())));
    const dataWindowStart = subMonths(maxDate, 2);

    const categories = new Set<string>();
    const weeklyAggregates: { [weekStart: string]: { week: string; date: Date } & { [category: string]: number } } = {};

    analyticsData.forEach(entry => {
        const parts = entry.timestamp_day.split('/');
        if (parts.length !== 3) return;
        
        const entryDate = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
        if (isNaN(entryDate.getTime()) || entryDate < dataWindowStart) return;

        const category = getSafeCategory(entry.food_category);
        categories.add(category);
        
        const weekStartDate = startOfWeek(entryDate, { weekStartsOn: 1 });
        const weekKey = format(weekStartDate, 'yyyy-MM-dd');

        if (!weeklyAggregates[weekKey]) {
            weeklyAggregates[weekKey] = { week: format(weekStartDate, 'MMM d'), date: weekStartDate };
        }
        weeklyAggregates[weekKey][category] = (weeklyAggregates[weekKey][category] || 0) + entry.purchase_count;
    });

    const sortedCategories = Array.from(categories).sort();
    
    Object.values(weeklyAggregates).forEach(weekData => {
        sortedCategories.forEach(cat => {
            if (!weekData[cat]) {
                weekData[cat] = 0;
            }
        });
    });

    const calculatedChartData = Object.values(weeklyAggregates).sort((a, b) => a.date.getTime() - b.date.getTime());

    const wConfig: ChartConfigType = {};
    sortedCategories.forEach((category, index) => {
        wConfig[category] = {
            label: category,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        };
    });

    // --- Logic for Top Selling Items Chart ---
    const topItems = (analyticsData || [])
        .slice()
        .sort((a, b) => b.purchase_count - a.purchase_count)
        .slice(0, 15)
        .map(item => ({
            name: item.food_name,
            count: item.purchase_count,
            category: getSafeCategory(item.food_category),
        }))
        .reverse(); // Reverse for horizontal chart so highest is at top

    const itemCategories = [...new Set(topItems.map(item => item.category))].sort();
    
    const iConfig: ChartConfigType = {};
    const iPayload = itemCategories.map((category, index) => {
      const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
      iConfig[category] = {
        label: category,
        color: color,
      };
      return {
        value: category,
        type: 'square',
        id: category,
        color: color,
      };
    });

    return {
      stats: { totalItemsSold, totalCoPurchases, trendingItem },
      weeklyChartData: calculatedChartData,
      weeklyChartConfig: wConfig,
      topSellingItems: topItems,
      itemChartConfig: iConfig,
      itemLegendPayload: iPayload
    };
  }, [analyticsData]);

  const totalMenuItems = selectedMenuInstance?.menu?.length ?? 0;

  if (isLoadingMenuInstances) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedMenuInstance) {
     return (
        <Alert>
          <BarChart className="h-5 w-5" />
          <AlertTitle>No Menu Selected</AlertTitle>
          <AlertDescription>
            Please select a menu from the dropdown in the header to view its overview.
          </AlertDescription>
        </Alert>
     );
  }

  const renderDashboardContent = () => (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats ? stats.totalItemsSold.toLocaleString() : 0}</div>
              <p className="text-xs text-muted-foreground">{stats ? "From all processed receipts" : "Upload receipts to see data"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Co-Purchase Events</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats ? stats.totalCoPurchases.toLocaleString() : 0}</div>
              <p className="text-xs text-muted-foreground">Based on item pairings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trending Item</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate" title={stats?.trendingItem.name}>{stats ? stats.trendingItem.name : "N/A"}</div>
              <p className="text-xs text-muted-foreground">Most purchased item</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
              <Utensils className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMenuItems.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Active items in menu</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Sales by Category</CardTitle>
            <CardDescription>Sales performance by food category over the last two months of available data.</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length > 0 ? (
                <ChartContainer config={weeklyChartConfig} className="h-[300px] w-full">
                    <RechartsBarChart accessibilityLayer data={weeklyChartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="week"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <YAxis allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {Object.keys(weeklyChartConfig).map((category) => (
                           <Bar
                             key={category}
                             dataKey={category}
                             fill={`var(--color-${category.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()})`}
                             stackId="a"
                             radius={[4, 4, 0, 0]}
                           />
                        ))}
                    </RechartsBarChart>
                </ChartContainer>
            ) : (
                 <Alert>
                    <BarChart className="h-5 w-5" />
                    <AlertTitle>No Analytics Data Available</AlertTitle>
                    <AlertDescription>
                        No sales data found in the required format. Once you upload receipts for "{selectedMenuInstance.name}", your performance data will appear here.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Top 15 Selling Items</CardTitle>
                <CardDescription>
                    Your most popular items by purchase count across all categories. Bars are colored by category.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {topSellingItems.length > 0 ? (
                    <ChartContainer config={itemChartConfig} className="h-[450px] w-full">
                        <RechartsBarChart
                            data={topSellingItems}
                            layout="vertical"
                            margin={{ left: 120, top: 5, right: 20, bottom: 20 }}
                        >
                            <CartesianGrid horizontal={false} />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tick={{ fontSize: 12 }}
                                interval={0}
                                width={120}
                            />
                            <XAxis dataKey="count" type="number" />
                            <ChartTooltip
                                cursor={{ fill: "hsl(var(--muted))" }}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <ChartLegend content={<ChartLegendContent />} payload={itemLegendPayload} />
                            <Bar dataKey="count" layout="vertical" radius={4}>
                                {topSellingItems.map((item) => (
                                    <Cell
                                        key={`cell-${item.name}`}
                                        fill={itemChartConfig[item.category]?.color || '#8884d8'}
                                    />
                                ))}
                            </Bar>
                        </RechartsBarChart>
                    </ChartContainer>
                ) : (
                    <Alert>
                        <BarChart className="h-5 w-5" />
                        <AlertTitle>No Item Data Available</AlertTitle>
                        <AlertDescription>
                            No top selling item data found. Upload receipts to see this chart.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>

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

  return renderDashboardContent();

    