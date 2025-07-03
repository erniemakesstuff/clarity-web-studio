
"use client";
import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart, Utensils, TrendingUp, ShoppingBag, Users, Code2, QrCode as QrCodeIcon, Share2, Printer, Download } from "lucide-react";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from "recharts"
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { subMonths, startOfWeek, format } from "date-fns";
import type { ChartConfig as ChartConfigType } from "@/components/ui/chart";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const ADMIN_USER_RAW_IDS = ["admin@example.com", "valerm09@gmail.com"];

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
  const { selectedMenuInstance, isLoadingMenuInstances, rawOwnerId, ownerId, rawMenuApiResponseText } = useAuth();
  const { toast } = useToast();
  const analyticsData = selectedMenuInstance?.analytics;

  const [publicMenuUrl, setPublicMenuUrl] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  useEffect(() => {
    if (selectedMenuInstance && ownerId && typeof window !== 'undefined') {
      const url = `${window.location.origin}/menu/${ownerId}/${selectedMenuInstance.id}`;
      setPublicMenuUrl(url);

      QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: 'H'
      })
        .then(dataUrl => {
          setQrCodeDataUrl(dataUrl);
        })
        .catch(err => {
          console.error('Failed to generate QR code', err);
          toast({
            title: "QR Code Error",
            description: "Could not generate a QR code for the menu URL.",
            variant: "destructive",
          });
          setQrCodeDataUrl('');
        });
    } else {
      setPublicMenuUrl("");
      setQrCodeDataUrl("");
    }
  }, [selectedMenuInstance, ownerId, toast]);

  const handleShare = async () => {
    if (!publicMenuUrl || !selectedMenuInstance) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${selectedMenuInstance.name} Menu`,
          text: `Check out the menu for ${selectedMenuInstance.name}`,
          url: publicMenuUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: "Share Canceled",
          description: "The share action was canceled or failed.",
          variant: "default"
        });
      }
    } else {
      await navigator.clipboard.writeText(publicMenuUrl);
      toast({ title: 'URL Copied!', description: 'Menu URL copied to your clipboard.' });
    }
  };

  const handlePrint = () => {
    if (!qrCodeDataUrl) return;
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print QR Code</title><style>body { display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; } img { max-width: 90%; max-height: 90%; object-fit: contain; }</style></head><body>');
      printWindow.document.write('<img src="' + qrCodeDataUrl + '" />');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };


  const { stats, weeklyChartData, weeklyChartConfig } = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return { stats: null, weeklyChartData: [], weeklyChartConfig: {} };
    }
    
    // --- Logic for Stat Cards ---
    let totalItemsSold = 0;
    let totalCoPurchases = 0;
    let trendingItem = { name: "N/A", purchase_count: -1, category: "N/A" };

    analyticsData.forEach(entry => {
      totalItemsSold += entry.purchase_count;
      if (Array.isArray(entry.purchased_with)) {
        totalCoPurchases += entry.purchased_with.reduce((sum, pw) => sum + pw.purchase_count, 0);
      }

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
        return { stats: { totalItemsSold, totalCoPurchases, trendingItem }, weeklyChartData: [], weeklyChartConfig: {} };
    }
    
    const maxDate = new Date(); // Use today as the anchor for the look-back window
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
    
    return {
      stats: { totalItemsSold, totalCoPurchases, trendingItem },
      weeklyChartData: calculatedChartData,
      weeklyChartConfig: wConfig,
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
                             stackId="a"
                             fill={`var(--color-${category.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase()})`}
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

        {selectedMenuInstance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCodeIcon className="h-6 w-6" />
              Share Your Digital Menu
            </CardTitle>
            <CardDescription>
              Customers can scan this QR code with their phone to view your interactive menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4">
            {qrCodeDataUrl ? (
              <Image src={qrCodeDataUrl} width={200} height={200} alt="Menu QR Code" className="rounded-lg shadow-md" />
            ) : (
              <Skeleton className="h-[200px] w-[200px]" />
            )}
            <p className="text-sm text-muted-foreground break-all bg-secondary p-2 rounded-md max-w-full">
              {publicMenuUrl || "Generating URL..."}
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleShare} disabled={!publicMenuUrl}>
              <Share2 className="mr-2" /> Share
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!qrCodeDataUrl}>
              <Printer className="mr-2" /> Print
            </Button>
            <Button asChild disabled={!qrCodeDataUrl}>
              <a href={qrCodeDataUrl} download={`${selectedMenuInstance.id}-qr-code.png`}>
                <Download className="mr-2" /> Save
              </a>
            </Button>
          </CardFooter>
        </Card>
      )}

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

  return renderDashboardContent();

    