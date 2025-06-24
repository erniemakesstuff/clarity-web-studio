
"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Utensils, TrendingUp, ShoppingBag, Users } from "lucide-react";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from "recharts"
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { subMonths, startOfWeek, format } from "date-fns";
import type { ChartConfig as ChartConfigType } from "@/components/ui/chart";

const getSafeCategory = (catString?: string | null): string => {
  const trimmed = catString?.trim();
  return (trimmed && trimmed.length > 0) ? trimmed : "Other";
};

export default function DashboardOverviewPage() {
  const { selectedMenuInstance, isLoadingMenuInstances } = useAuth();
  const analyticsData = selectedMenuInstance?.analytics;

  const { stats, weeklyChartData, uniqueCategories } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { stats: null, weeklyChartData: [], uniqueCategories: [] };
    }
    
    // --- STATS CALCULATION (uses all data) ---
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

    // --- CHART DATA CALCULATION (uses filtered data) ---
    const twoMonthsAgo = subMonths(new Date(), 2);
    const categories = new Set<string>();
    const weeklyAggregates: { [weekStart: string]: { week: string; date: Date } & { [category: string]: number } } = {};

    analyticsData.forEach(entry => {
        // Robust date parsing for "MM/DD/YYYY" format
        const parts = entry.timestamp_day.split('/');
        if (parts.length !== 3) return; // Skip malformed dates
        const [month, day, year] = parts.map(Number);
        const entryDate = new Date(year, month - 1, day);

        if (isNaN(entryDate.getTime()) || entryDate < twoMonthsAgo) {
            return; // Skip if invalid or too old
        }

        const category = getSafeCategory(entry.food_category);
        categories.add(category);
        
        const weekStartDate = startOfWeek(entryDate);
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

    return {
      stats: { totalItemsSold, totalCoPurchases, trendingItem },
      weeklyChartData: calculatedChartData,
      uniqueCategories: sortedCategories,
    };
  }, [analyticsData]);

  const chartConfig = useMemo(() => {
    const config: ChartConfigType = {};
    const colors = [
        "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
        "hsl(var(--chart-4))", "hsl(var(--chart-5))", 'hsl(262.1 83.3% 57.8%)', 'hsl(346.8 77.2% 49.8%)'
    ];
    uniqueCategories.forEach((category, index) => {
        config[category] = {
            label: category,
            color: colors[index % colors.length],
        };
    });
    return config;
  }, [uniqueCategories]);

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
            <CardDescription>Sales performance by food category over the last two months.</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                        {uniqueCategories.map((category, index) => (
                           <Bar
                             key={category}
                             dataKey={category}
                             stackId="a"
                             fill={chartConfig[category]?.color || "#8884d8"}
                             radius={index === uniqueCategories.length - 1 ? [4, 4, 0, 0] : 0}
                           />
                        ))}
                    </RechartsBarChart>
                </ChartContainer>
            ) : (
                 <Alert>
                    <BarChart className="h-5 w-5" />
                    <AlertTitle>No Analytics Data Available</AlertTitle>
                    <AlertDescription>
                        No sales data found for the last two months. Once you upload receipts for "{selectedMenuInstance.name}", your performance data will appear here.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      </div>
  );

  return renderDashboardContent();
}
