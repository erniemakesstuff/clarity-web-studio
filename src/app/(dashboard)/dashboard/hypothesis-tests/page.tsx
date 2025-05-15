
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateAbTests, type GenerateAbTestsInput, type AbTestHypothesis } from "@/ai/flows/generate-ab-tests";
import { Loader2, Lightbulb, FlaskConical, Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Mock menu summary for demonstration purposes
const mockMenuSummary = `
Appetizers:
- Calamari: Lightly fried, served with marinara. $12
- Bruschetta: Toasted bread, tomatoes, garlic, basil. $10
Main Courses:
- Spaghetti Carbonara: Creamy pasta, pancetta, egg. $18
- Grilled Salmon: Served with roasted vegetables. $24
- Margherita Pizza: Classic tomato, mozzarella, basil. $15
Desserts:
- Tiramisu: Coffee-flavored Italian dessert. $9
- Chocolate Lava Cake: Warm cake, molten center. $10
Drinks:
- Soda: Coke, Sprite, Diet Coke. $3
- Wine: Red, White selection. $8/glass
`;


export default function HypothesisTestsPage() {
  const [hypotheses, setHypotheses] = useState<AbTestHypothesis[]>([]);
  const [adminContextInput, setAdminContextInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingContext, setIsSubmittingContext] = useState(false);
  const { toast } = useToast();

  const fetchHypotheses = async (context?: string) => {
    setIsLoading(true);
    try {
      const input: GenerateAbTestsInput = {
        currentMenuSummary: mockMenuSummary, // In a real app, fetch this dynamically
        adminContext: context || undefined,
      };
      const result = await generateAbTests(input);
      setHypotheses(result.hypotheses);
      if (context) {
        toast({
          title: "Hypotheses Refreshed",
          description: "New A/B test suggestions generated with your context.",
          variant: "default",
          className: "bg-green-500 text-white"
        });
      }
    } catch (err: any) {
      console.error("Error generating A/B tests:", err);
      toast({
        title: "Error Generating Hypotheses",
        description: err.message || "Could not fetch A/B test suggestions.",
        variant: "destructive",
      });
      setHypotheses([]); // Clear hypotheses on error or show placeholder
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHypotheses();
  }, []);

  const handleAdminContextSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingContext(true);
    await fetchHypotheses(adminContextInput);
    setIsSubmittingContext(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <FlaskConical className="mr-3 h-8 w-8 text-primary" />
          A/B Hypothesis Tests
        </h1>
        <p className="text-muted-foreground">
          Review AI-generated A/B tests to optimize menu upsells and provide context for new suggestions.
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Wand2 className="mr-3 h-7 w-7 text-primary" />
            Provide AI Context
          </CardTitle>
          <CardDescription>
            Guide the AI by providing additional information or specific goals for A/B test generation.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAdminContextSubmit}>
          <CardContent>
            <Label htmlFor="admin-context" className="text-base">Your Instructions / Context</Label>
            <Textarea
              id="admin-context"
              placeholder="e.g., Focus on promoting high-margin desserts with main courses, or try to upsell more side salads with pizzas."
              value={adminContextInput}
              onChange={(e) => setAdminContextInput(e.target.value)}
              rows={4}
              className="mt-2"
              disabled={isSubmittingContext || isLoading}
            />
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="submit" disabled={isSubmittingContext || isLoading} className="w-full sm:w-auto">
              {isSubmittingContext ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating with Context...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Generate/Refine Hypotheses
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <FlaskConical className="mr-3 h-7 w-7 text-primary" />
            Current A/B Test Hypotheses
          </CardTitle>
          <CardDescription>
            These are potential A/B tests suggested by the AI based on the menu and provided context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
            </>
          ) : hypotheses.length > 0 ? (
            hypotheses.map((hypo) => (
              <Card key={hypo.id} className="bg-background shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-primary">{hypo.id}: {hypo.changeDescription}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">AI Reasoning:</p>
                  <p className="text-sm text-foreground">{hypo.reasoning}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <FlaskConical className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No A/B test hypotheses available at the moment.</p>
              <p className="text-sm">Try providing some context above or check back later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
