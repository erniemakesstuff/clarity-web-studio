
"use client";

import { useState, useEffect } from "react";
import { MenuUploadForm } from "@/components/dashboard/MenuUploadForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListChecks, Eye, Edit3, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function MenuManagementPage() {
  const { selectedRestaurant, renameRestaurant, isLoadingRestaurants } = useAuth();
  const { toast } = useToast();
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (selectedRestaurant) {
      setNewRestaurantName(selectedRestaurant.name);
    }
  }, [selectedRestaurant]);

  const handleRenameSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRestaurant || !newRestaurantName.trim()) {
      toast({
        title: "Cannot Rename",
        description: "Please select a restaurant and provide a valid name.",
        variant: "destructive",
      });
      return;
    }
    if (newRestaurantName.trim() === selectedRestaurant.name) {
      toast({
        title: "No Change",
        description: "The new name is the same as the current name.",
        variant: "default",
      });
      return;
    }

    setIsRenaming(true);
    try {
      const success = renameRestaurant(selectedRestaurant.id, newRestaurantName.trim());
      if (success) {
        toast({
          title: "Restaurant Renamed!",
          description: `"${selectedRestaurant.name}" is now "${newRestaurantName.trim()}".`,
          variant: "default",
          className: "bg-green-500 text-white",
        });
      } else {
         toast({
          title: "Rename Failed",
          description: "Could not rename the restaurant. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error Renaming",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Menu Management</h1>
        <p className="text-muted-foreground">
          Upload new menus, view, and edit your existing digital menu items.
        </p>
      </div>
      
      <MenuUploadForm />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ListChecks className="mr-3 h-7 w-7 text-primary" />
            Current Menu Overview
          </CardTitle>
          <CardDescription>
            A summary of your currently active menu. (This section is a placeholder for displaying and editing the active menu).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <Eye className="mx-auto h-12 w-12 mb-4" />
            <p>Your active menu display and editing tools will appear here.</p>
            <p className="text-sm">For now, please use the upload form above to process new menus.</p>
          </div>
        </CardContent>
      </Card>

      {selectedRestaurant && !isLoadingRestaurants && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Edit3 className="mr-3 h-7 w-7 text-primary" />
              Rename Restaurant
            </CardTitle>
            <CardDescription>
              Change the name of your currently selected restaurant: <span className="font-semibold">{selectedRestaurant.name}</span>
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRenameSubmit}>
            <CardContent>
              <Label htmlFor="new-restaurant-name" className="text-base">New Restaurant Name</Label>
              <Input
                id="new-restaurant-name"
                value={newRestaurantName}
                onChange={(e) => setNewRestaurantName(e.target.value)}
                placeholder="Enter new restaurant name"
                className="mt-2"
                disabled={isRenaming}
                required
              />
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button type="submit" disabled={isRenaming || !newRestaurantName.trim() || newRestaurantName.trim() === selectedRestaurant.name}>
                {isRenaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  "Save New Name"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
