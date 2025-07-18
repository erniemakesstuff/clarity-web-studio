
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Utensils, PlusCircle, ArrowLeft } from "lucide-react";
import { createMenuOnBackend } from "./actions";

export default function CreateMenuPage() {
  const [menuName, setMenuName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { addMenuInstance, jwtToken, ownerId } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMenuName = menuName.trim();
    if (!trimmedMenuName) {
      toast({
        title: "Menu name required",
        description: "Please enter a name for your new menu.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const result = await createMenuOnBackend(ownerId, trimmedMenuName, jwtToken);

    if (result.success && result.menuId) {
      const newMenu = addMenuInstance(trimmedMenuName);
      toast({
        title: "Menu Created!",
        description: `Successfully created "${newMenu.name}" and registered with backend.`,
        variant: "default",
        className: "bg-green-500 text-white",
      });
      router.push("/dashboard");
    } else {
      toast({
        title: "Error Creating Menu",
        description: result.message || "An unknown error occurred while trying to create the menu on the backend.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="flex justify-center items-start pt-10">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Utensils className="mr-3 h-7 w-7 text-primary" />
            Create New Menu
          </CardTitle>
          <CardDescription>
            Let's get your new menu set up on Clarity Menu.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="menu-name" className="text-base">Menu Name</Label>
              <Input
                id="menu-name"
                placeholder="e.g., The Gourmet Spot Evening Menu"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
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
              disabled={isLoading || !menuName.trim()}
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
                  Create Menu
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
