
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your menu performance, customer engagement, and upsell effectiveness.
        </p>
      </div>
      
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
