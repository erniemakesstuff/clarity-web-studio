
"use client"; // Ensure client component for hooks

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig } from "lucide-react";
import { ReceiptUploadForm } from "@/components/dashboard/ReceiptUploadForm"; // Import the new component
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle as AlertTitleUI } from "@/components/ui/alert";

export default function AnalyticsPage() {
  const { selectedMenuInstance, isLoadingMenuInstances } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Upload receipts and track your menu performance, customer engagement, and upsell effectiveness.
        </p>
      </div>

      {/* Receipt Upload Section */}
      {isLoadingMenuInstances ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Loading Menu Context...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please wait while we load your menu information for receipt processing.</p>
          </CardContent>
        </Card>
      ) : selectedMenuInstance ? (
        <ReceiptUploadForm />
      ) : (
        <Alert variant="default" className="border-primary/50 bg-primary/5">
            <BarChartBig className="h-5 w-5 text-primary" />
            <AlertTitleUI className="text-primary">Select a Menu to Upload Receipts</AlertTitleUI>
            <AlertDescription>
              Please select a menu instance from the dropdown in the header to enable receipt uploads for analytics.
            </AlertDescription>
        </Alert>
      )}
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <BarChartBig className="mr-3 h-7 w-7 text-primary" />
            Performance Insights
          </CardTitle>
          <CardDescription>
            Detailed analytics and reports will be available here in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-20 text-muted-foreground">
            <BarChartBig className="mx-auto h-16 w-16 mb-6 opacity-50" />
            <p className="text-xl">Analytics Coming Soon!</p>
            <p>This section will provide insights into your restaurant's performance.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
