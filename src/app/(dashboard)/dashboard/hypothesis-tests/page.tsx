
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateAbTests, type GenerateAbTestsInput, type AbTestHypothesis } from "@/ai/flows/generate-ab-tests";
import { Loader2, Lightbulb, FlaskConical, Wand2, Power, Zap, BrainCircuit, CheckCircle, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();
  const { selectedMenuInstance, toggleABTesting, isLoadingMenuInstances } = useAuth();

  const allowABTesting = selectedMenuInstance?.allowABTesting;

  const fetchHypotheses = async (context?: string) => {
    setIsLoading(true);
    try {
      const input: GenerateAbTestsInput = {
        currentMenuSummary: mockMenuSummary,
        adminContext: context || undefined,
      };
      const result = await generateAbTests(input);
      setHypotheses(result.hypotheses);
      if (context) {
        toast({
          title: "Hypotheses Refreshed",
          description: "New A/B test suggestions generated with your context.",
        });
      }
    } catch (err: any) {
      console.error("Error generating A/B tests:", err);
      toast({
        title: "Error Generating Hypotheses",
        description: err.message || "Could not fetch A/B test suggestions.",
        variant: "destructive",
      });
      setHypotheses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (allowABTesting && selectedMenuInstance) {
      fetchHypotheses();
    } else {
      setIsLoading(false);
    }
  }, [allowABTesting, selectedMenuInstance]);

  const handleToggleClick = async () => {
    if (selectedMenuInstance) {
      setIsToggling(true);
      const currentStatus = selectedMenuInstance.allowABTesting ?? false;
      await toggleABTesting(selectedMenuInstance.id, !currentStatus);
      setIsToggling(false);
    }
  };

  const handleAdminContextSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingContext(true);
    await fetchHypotheses(adminContextInput);
    setIsSubmittingContext(false);
  };
  
  if (isLoadingMenuInstances) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading menu settings...</p>
        </div>
      );
  }

  if (!selectedMenuInstance) {
    return (
      <Alert variant="default" className="border-primary/50 bg-primary/5">
        <FlaskConical className="h-5 w-5 text-primary" />
        <AlertTitleUI className="text-primary">Select a Menu</AlertTitleUI>
        <AlertDescriptionUI>
          Please select a menu instance to manage A/B Hypothesis Testing.
        </AlertDescriptionUI>
      </Alert>
    );
  }

  const tooltipContent = (
    <TooltipContent className="max-w-sm">
      <h4 className="font-bold mb-2">What is A/B Testing?</h4>
      <p className="text-sm text-muted-foreground mb-2">
        It's a simple experiment to find what customers like best, using data to make decisions.
      </p>
      <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
        <li><strong>Hypothesis (A Guess):</strong> We guess a change will help, e.g., "Suggesting drinks with pizza will increase order value."</li>
        <li><strong>The Test (A vs. B):</strong> We show the old menu (A) to some customers and the new menu (B) to others.</li>
        <li><strong>The Decision:</strong> We compare the results. If B performs better, we keep it. If not, we learn from it and try another hypothesis.</li>
      </ul>
    </TooltipContent>
  );

  if (!allowABTesting) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 className="text-3xl font-bold tracking-tight flex items-center cursor-help">
                  <FlaskConical className="mr-3 h-8 w-8 text-primary" />
                  A/B Hypothesis Tests
                  <Info className="ml-2 h-5 w-5 text-muted-foreground" />
                </h1>
              </TooltipTrigger>
              {tooltipContent}
            </Tooltip>
          </TooltipProvider>
          <p className="text-muted-foreground mt-2">
            Enable AI-powered menu optimization to automatically improve revenue.
          </p>
        </div>
        <Card className="shadow-lg bg-secondary/30">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Zap className="mr-3 h-7 w-7 text-yellow-500" />
              What is AI-Powered Hypothesis Testing?
            </CardTitle>
            <CardDescription>
              It's an autonomous system that works to achieve your goals by running smart experiments on your menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-foreground">
              <li className="flex items-start gap-3">
                <BrainCircuit className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Define Your Goal, Let AI Do the Work</h4>
                  <p className="text-sm text-muted-foreground">The AI's purpose is to maximize revenue. You can guide it by providing goals like "promote high-margin desserts" or "upsell more side salads with pizza".</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <FlaskConical className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Autonomous Experimentation</h4>
                  <p className="text-sm text-muted-foreground">The AI formulates hypotheses (e.g., "Suggesting garlic bread with pasta will increase order value") and tests them over a set timeframe, dynamically re-evaluating its approach.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Automatic Promotion & Iteration</h4>
                  <p className="text-sm text-muted-foreground">When a hypothesis is proven true, it's automatically promoted to the main customer experience. If it's false, the AI learns and iterates with a new hypothesis.</p>
                </div>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button size="lg" onClick={handleToggleClick} disabled={isToggling}>
              {isToggling ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Power className="mr-2 h-5 w-5" />
                  Enable Hypothesis Testing
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h1 className="text-3xl font-bold tracking-tight flex items-center cursor-help">
                  <FlaskConical className="mr-3 h-8 w-8 text-primary" />
                  A/B Hypothesis Tests
                  <Info className="ml-2 h-5 w-5 text-muted-foreground" />
                </h1>
              </TooltipTrigger>
              {tooltipContent}
            </Tooltip>
          </TooltipProvider>
          <p className="text-muted-foreground mt-2">
            Review AI-generated A/B tests to optimize menu upsells and provide context for new suggestions.
          </p>
        </div>
        <Button variant="destructive" onClick={handleToggleClick} disabled={isToggling}>
          {isToggling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Disabling...
            </>
          ) : (
            <>
              <Power className="mr-2 h-4 w-4" />
              Disable Hypothesis Testing
            </>
          )}
        </Button>
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
