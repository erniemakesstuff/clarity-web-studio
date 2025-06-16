
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Building, PlusCircle, ArrowLeft } from "lucide-react";

export default function CreateRestaurantPage() {
  const [restaurantName, setRestaurantName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { addRestaurant } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurantName.trim()) {
      toast({
        title: "Restaurant name required",
        description: "Please enter a name for your new restaurant.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newRestaurant = addRestaurant(restaurantName.trim());
      toast({
        title: "Restaurant Created!",
        description: `Successfully created "${newRestaurant.name}".`,
        variant: "default",
        className: "bg-green-500 text-white",
      });
      router.push("/dashboard"); // Redirect to dashboard, which should now show the new restaurant
    } catch (error: any) {
      toast({
        title: "Error Creating Restaurant",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
    // setIsLoading(false) will be implicitly handled by navigation or if error occurs
  };

  return (
    <div className="flex justify-center items-start pt-10">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Building className="mr-3 h-7 w-7 text-primary" />
            Create New Restaurant
          </CardTitle>
          <CardDescription>
            Let's get your new restaurant set up on Clarity Menu.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="restaurant-name" className="text-base">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                placeholder="e.g., The Gourmet Spot"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="mt-2"
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !restaurantName.trim()}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Restaurant
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
