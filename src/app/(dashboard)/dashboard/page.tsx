
"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Utensils, TrendingUp, ShoppingBag, Users } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from "recharts"
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const chartConfig = {
  sales: {
    label: "Items Sold",
    color: "hsl(var(--chart-1))",
  },
  coPurchases: {
    label: "Co-Purchases",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function DashboardOverviewPage() {
  const { selectedMenuInstance, isLoadingMenuInstances } = useAuth();
  const analyticsData = selectedMenuInstance?.analytics;

  const { stats, chartData } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { stats: null, chartData: [] };
    }

    let totalItemsSold = 0;
    let totalCoPurchases = 0;
    let trendingItem = { name: "N/A", purchase_count: -1, category: "N/A" };
    const monthlyAggregates: { [key: string]: { month: string, sales: number, coPurchases: number, date: Date } } = {};

    analyticsData.forEach(entry => {
      totalItemsSold += entry.purchase_count;
      totalCoPurchases += entry.purchased_with.reduce((sum, pw) => sum + pw.purchase_count, 0);

      if (entry.purchase_count > trendingItem.purchase_count) {
        trendingItem = { name: entry.food_name, purchase_count: entry.purchase_count, category: entry.food_category };
      }

      const date = new Date(entry.timestamp_day);
      if (isNaN(date.getTime())) {
          return;
      }
      const monthName = date.toLocaleString('en-US', { month: 'long' });
      const year = date.getFullYear();
      const monthKey = `${year}-${date.getMonth()}`;

      if (!monthlyAggregates[monthKey]) {
        monthlyAggregates[monthKey] = { month: monthName, sales: 0, coPurchases: 0, date: date };
      }
      monthlyAggregates[monthKey].sales += entry.purchase_count;
      monthlyAggregates[monthKey].coPurchases += entry.purchased_with.reduce((sum, pw) => sum + pw.purchase_count, 0);
    });

    const calculatedChartData = Object.values(monthlyAggregates).sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      stats: {
        totalItemsSold,
        totalCoPurchases,
        trendingItem,
      },
      chartData: calculatedChartData,
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

  if (!stats) {
    return (
      <div className="space-y-6">
        <Alert>
          <BarChart className="h-5 w-5" />
          <AlertTitle>No Analytics Data Available</AlertTitle>
          <AlertDescription>
            Once you upload receipts for "{selectedMenuInstance.name}", your performance data will appear here.
          </AlertDescription>
        </Alert>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Upload receipts to see data</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Co-Purchase Events</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+0</div>
              <p className="text-xs text-muted-foreground">Based on item pairings</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trending Item</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">N/A</div>
              <p className="text-xs text-muted-foreground">Most purchased item</p>
            </CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
              <Utensils className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMenuItems}</div>
              <p className="text-xs text-muted-foreground">Active items in menu</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items Sold</CardTitle>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItemsSold.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all processed receipts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Co-Purchase Events</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalCoPurchases.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Based on item pairings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trending Item</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={stats.trendingItem.name}>{stats.trendingItem.name}</div>
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
          <CardTitle>Sales &amp; Co-Purchase Overview</CardTitle>
          <CardDescription>Monthly performance of item sales and associated co-purchases.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsBarChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis allowDecimals={false}/>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
              <Bar dataKey="coPurchases" fill="var(--color-co-purchases)" radius={4} />
            </RechartsBarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
