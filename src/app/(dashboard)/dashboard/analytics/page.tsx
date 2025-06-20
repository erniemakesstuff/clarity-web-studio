
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig, ScatterChart as ScatterIcon, TrendingUp, AlertTriangle } from "lucide-react";
import { ReceiptUploadForm } from "@/components/dashboard/ReceiptUploadForm";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart, ScatterChart, Scatter, ZAxis, Label as RechartsLabel, TooltipProps } from "recharts";
import type { AnalyticsEntry } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to generate a color from a string
const generateColorFromString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return `#${"00000".substring(0, 6 - c.length)}${c}`;
};

// Custom Tooltip for Scatter Plot
const CustomScatterTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border shadow-lg rounded-md p-3 text-sm">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="text-muted-foreground">Main Item Count: <span className="font-medium text-foreground">{data.x}</span></p>
        <p className="text-muted-foreground">Related Item Count: <span className="font-medium text-foreground">{data.y}</span></p>
        <p className="text-muted-foreground">Co-purchased: <span className="font-medium text-foreground">{data.z}</span> times</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { selectedMenuInstance, isLoadingMenuInstances } = useAuth();

  const analyticsData: AnalyticsEntry[] | null | undefined = selectedMenuInstance?.analytics;

  const { monthlySalesData, monthlySalesChartConfig } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { monthlySalesData: [], monthlySalesChartConfig: {} };
    }

    const salesByMonth: Record<string, Record<string, number>> = {};
    const allFoodNames = new Set<string>();

    analyticsData.forEach(entry => {
      try {
        const dateParts = entry.timestamp_day.split('/');
        if (dateParts.length !== 3) {
          console.warn("Invalid date format in analytics entry:", entry.timestamp_day);
          return; 
        }
        const date = new Date(parseInt(dateParts[2]), parseInt(dateParts[0]) - 1, parseInt(dateParts[1]));
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });

        if (!salesByMonth[monthYear]) {
          salesByMonth[monthYear] = { month: monthYear } as any;
        }
        salesByMonth[monthYear][entry.food_name] = (salesByMonth[monthYear][entry.food_name] || 0) + entry.purchase_count;
        allFoodNames.add(entry.food_name);
      } catch (e) {
        console.warn("Error parsing date:", entry.timestamp_day, e);
      }
    });
    
    const chartData = Object.values(salesByMonth).sort((a,b) => {
        const dateA = new Date( (a as any).month.split(" ")[1], ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf((a as any).month.split(" ")[0]));
        const dateB = new Date( (b as any).month.split(" ")[1], ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf((b as any).month.split(" ")[0]));
        return dateA.getTime() - dateB.getTime();
    });

    const chartConfig: ChartConfig = Array.from(allFoodNames).reduce((acc, foodName) => {
      acc[foodName] = {
        label: foodName,
        color: generateColorFromString(foodName),
      };
      return acc;
    }, {} as ChartConfig);

    return { monthlySalesData: chartData, monthlySalesChartConfig: chartConfig };
  }, [analyticsData]);

  const scatterPlotData = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return [];
    }
    const foodItemPurchaseCounts: Record<string, number> = {};
    analyticsData.forEach(entry => {
      foodItemPurchaseCounts[entry.food_name] = entry.purchase_count;
    });

    return analyticsData.flatMap(mainEntry =>
      mainEntry.purchased_with.map(relatedEntry => ({
        x: mainEntry.purchase_count,
        y: foodItemPurchaseCounts[relatedEntry.food_name] || 0,
        z: relatedEntry.purchase_count,
        name: `${mainEntry.food_name} + ${relatedEntry.food_name}`,
      }))
    ).filter(d => d.x > 0 && d.y > 0 && d.z > 0); // Filter out zero counts for cleaner plot
  }, [analyticsData]);


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
              <Skeleton className="h-[300px] w-full" />
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
              <BarChartBig className="mr-3 h-7 w-7 text-primary" />
              Performance Insights
            </CardTitle>
            <CardDescription>
              Track your menu performance, customer engagement, and upsell effectiveness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-20 text-muted-foreground">
              <TrendingUp className="mx-auto h-16 w-16 mb-6 opacity-50" />
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
              <BarChartBig className="mr-3 h-7 w-7 text-primary" />
              Monthly Sales by Item
            </CardTitle>
            <CardDescription>
              Purchase counts of food items, grouped by month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySalesData.length > 0 ? (
              <ChartContainer config={monthlySalesChartConfig} className="h-[400px] w-full">
                <RechartsBarChart data={monthlySalesData} margin={{ top: 5, right: 20, left: -20, bottom: 50 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-45} textAnchor="end" height={70} interval={0} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {Object.keys(monthlySalesChartConfig).map((foodName) => (
                    <Bar key={foodName} dataKey={foodName} fill={`var(--color-${foodName})`} radius={[4, 4, 0, 0]} stackId="a" />
                  ))}
                </RechartsBarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-4">No sales data to display for the bar chart.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <ScatterIcon className="mr-3 h-7 w-7 text-primary" />
              Item Purchase Relationships
            </CardTitle>
            <CardDescription>
              Relative density of items purchased together. X-axis: Main item purchases, Y-axis: Related item purchases, Size: Co-purchases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scatterPlotData.length > 0 ? (
              <ChartContainer config={{}} className="h-[450px] w-full">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Main Item Purchase Count" unit="" allowDecimals={false}>
                     <RechartsLabel value="Main Item Purchase Count" offset={-45} position="insideBottom" style={{textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: '0.875rem'}} />
                  </XAxis>
                  <YAxis type="number" dataKey="y" name="Related Item Purchase Count" unit="" allowDecimals={false}>
                    <RechartsLabel value="Related Item Purchase Count" angle={-90} offset={-10} position="insideLeft" style={{textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: '0.875rem'}} />
                  </YAxis>
                  <ZAxis type="number" dataKey="z" range={[50, 1000]} name="Co-purchase Count" />
                  <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                  <Scatter name="Purchase Pairs" data={scatterPlotData} fill="hsl(var(--primary))" shape="circle" />
                </ScatterChart>
              </ChartContainer>
            ) : (
               <p className="text-muted-foreground text-center py-4">No relationship data to display for the scatter plot.</p>
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
          Upload receipts and track your menu performance, customer engagement, and upsell effectiveness.
        </p>
      </div>
      
      <ReceiptUploadForm />
      {renderContent()}
    </div>
  );
}
