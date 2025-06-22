
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lightbulb, FlaskConical, Wand2, Power, Zap, BrainCircuit, CheckCircle, Info, Edit, History, TestTube, ArrowUp, Pencil, List, PlusCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { patchMenu, startABTestWorkflow } from "./actions";
import type { MenuItem } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function HypothesisTestsPage() {
  const { toast } = useToast();
  const { selectedMenuInstance, isLoadingMenuInstances, hashedOwnerId, jwtToken, refreshMenuInstances } = useAuth();

  const allowABTesting = selectedMenuInstance?.allowABTesting;
  const existingGoal = selectedMenuInstance?.testGoal;

  const [goalInput, setGoalInput] = useState(existingGoal || "");
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(!existingGoal);
  const [isPolling, setIsPolling] = useState(false);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanupPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupPolling();
    };
  }, [cleanupPolling]);

  useEffect(() => {
    const currentGoal = selectedMenuInstance?.testGoal || "";
    setGoalInput(currentGoal);
    setIsEditingGoal(!currentGoal);
  }, [selectedMenuInstance]);

  const handleToggleClick = async () => {
    if (selectedMenuInstance) {
      setIsToggling(true);
      const currentStatus = selectedMenuInstance.allowABTesting ?? false;
      
      const result = await patchMenu({
        ownerId: hashedOwnerId,
        menuId: selectedMenuInstance.id,
        payload: { allowABTesting: !currentStatus },
        jwtToken,
      });

      if (result.success) {
        toast({
          title: `A/B Testing ${!currentStatus ? 'Enabled' : 'Disabled'}`,
          description: "Settings updated successfully.",
          variant: 'default',
          className: 'bg-green-500 text-white',
        });
        await refreshMenuInstances();
      } else {
        toast({
          title: "Update Failed",
          description: result.message || "Could not update setting.",
          variant: "destructive",
        });
      }
      setIsToggling(false);
    }
  };

  const handleGoalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMenuInstance) {
      toast({
        title: "No Menu Selected",
        description: "Please select a menu instance to set a goal.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingGoal(true);
    cleanupPolling();

    try {
      const patchResult = await patchMenu({
        ownerId: hashedOwnerId,
        menuId: selectedMenuInstance.id,
        payload: { testGoal: goalInput },
        jwtToken: jwtToken,
      });

      if (!patchResult.success) {
        throw new Error(patchResult.message || "Failed to set the A/B test goal.");
      }

      toast({
        title: "Goal Set Successfully",
        description: "Your goal has been saved. Initiating A/B test workflow.",
      });

      setTimeout(async () => {
        try {
          const startResult = await startABTestWorkflow({
            ownerId: hashedOwnerId,
            menuId: selectedMenuInstance.id,
            jwtToken: jwtToken,
          });
          if (!startResult.success) {
            toast({
              title: "Workflow Start Failed",
              description: startResult.message || "Could not start the backend A/B test workflow.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "A/B Test Initiated",
              description: "The backend is processing your goal. Syncing data...",
              variant: "default",
              className: "bg-green-500 text-white",
            });
            
            setIsPolling(true);
            await refreshMenuInstances(); // Initial refresh
            let pollCount = 0;
            
            pollingIntervalRef.current = setInterval(async () => {
                pollCount++;
                toast({ title: `Syncing data... (Check ${pollCount + 1})` });
                await refreshMenuInstances();
            }, 60000); // Refresh every 1 minute

            pollingTimeoutRef.current = setTimeout(() => {
                cleanupPolling();
                toast({ title: "Auto-sync finished.", description: "You can manually refresh if needed." });
            }, 180000); // Expire after 3 minutes
          }
        } catch (startErr: any) {
          toast({
            title: "Workflow Start Error",
            description: startErr.message,
            variant: "destructive",
          });
        }
      }, 500);

    } catch (err: any) {
      toast({
        title: "Error Setting Goal",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGoal(false);
      setIsEditingGoal(false);
    }
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

  const controlMenuMap = new Map((selectedMenuInstance.menu || []).map(item => [item.name, item]));
  const testMenu = selectedMenuInstance.testMenu || [];

  const significantChanges = testMenu.filter(testItem => {
    const controlItem = controlMenuMap.get(testItem.name);

    if (!controlItem) {
      return true; // New items are always significant.
    }

    if (testItem.description !== controlItem.description) {
      return true;
    }

    const displayOrderDelta = Math.abs((testItem.displayOrder ?? Infinity) - (controlItem.displayOrder ?? Infinity));
    if (displayOrderDelta >= 5) {
      return true;
    }
    
    const controlLikes = new Set(controlItem.youMayAlsoLike || []);
    const testLikes = new Set(testItem.youMayAlsoLike || []);
    const addedLikes = [...testLikes].filter(like => !controlLikes.has(like)).length;
    const removedLikes = [...controlLikes].filter(like => !testLikes.has(like)).length;
    if (addedLikes + removedLikes >= 2) {
      return true;
    }

    return false;
  });

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
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Review AI-generated A/B tests designed to achieve your goals. When active, this experiment shows a modified menu to 50% of your customers to test the hypothesis. You can disable testing at any time or provide a new goal for the AI.
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
        <form onSubmit={handleGoalSubmit}>
          {existingGoal && !isEditingGoal ? (
            <>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="flex items-center text-2xl">
                    <Wand2 className="mr-3 h-7 w-7 text-primary" />
                    Active AI Goal
                    {isPolling && (
                        <span className="ml-4 flex items-center text-sm font-normal text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing changes...
                        </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    An A/B test is running with the goal below.
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" onClick={() => setIsEditingGoal(true)} disabled={isToggling || isPolling}>
                        <Edit className="mr-2 h-4 w-4" />
                        Refine Goal
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Updating the goal will interrupt the currently running test and start a new one.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardHeader>
              <CardContent>
                <div className="p-3 border rounded-md bg-secondary/40 text-sm text-foreground">
                  {existingGoal}
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                  <Wand2 className="mr-3 h-7 w-7 text-primary" />
                  {existingGoal ? "Refine AI Goal" : "Provide AI Goal"}
                </CardTitle>
                <CardDescription>
                  Guide the AI by providing a specific goal for it to achieve.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="goal-input" className="text-base">Your Goal / Instructions</Label>
                  <Textarea
                    id="goal-input"
                    placeholder="e.g., Focus on promoting high-margin desserts with main courses, or try to upsell more side salads with pizzas."
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    rows={4}
                    className="mt-2"
                    disabled={isSubmittingGoal || isPolling}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-6 flex justify-start items-center gap-4">
                  <Button type="submit" disabled={isSubmittingGoal || !goalInput.trim() || isPolling}>
                    {isSubmittingGoal ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        {existingGoal ? 'Update Goal & Regenerate' : 'Generate Hypotheses'}
                      </>
                    )}
                  </Button>
                  {existingGoal && (
                    <Button type="button" variant="ghost" onClick={() => { setIsEditingGoal(false); setGoalInput(existingGoal); }} disabled={isSubmittingGoal || isPolling}>
                      Cancel
                    </Button>
                  )}
              </CardFooter>
            </>
          )}
        </form>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Lightbulb className="mr-3 h-7 w-7 text-primary" />
            Current A/B Test Hypothesis
          </CardTitle>
          <CardDescription>
            This is the active hypothesis being tested by the AI based on your goal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedMenuInstance.testHypothesis ? (
            <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert bg-secondary/30 p-4 rounded-md">
              <ReactMarkdown>{selectedMenuInstance.testHypothesis}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Lightbulb className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No active hypothesis found.</p>
              <p className="text-sm">The AI may be formulating one. Check back soon.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <TestTube className="mr-3 h-7 w-7 text-primary" />
              A/B Test Menu Changes
            </CardTitle>
            <CardDescription>
              Minimalist view of significant changes in the test menu vs. the control menu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {significantChanges.length > 0 ? (
              significantChanges.map((testItem) => {
                const controlItem = controlMenuMap.get(testItem.name);
                const diffs: { type: string; label: string, icon: React.ReactNode }[] = [];
                let highlightClass = 'bg-background';

                if (!controlItem) {
                  highlightClass = 'bg-blue-100 dark:bg-blue-900/40';
                  diffs.push({ type: 'new', label: 'New Item', icon: <PlusCircle size={14} /> });
                } else {
                  const controlDisplayOrder = controlItem.displayOrder ?? Infinity;
                  const testDisplayOrder = testItem.displayOrder ?? Infinity;
                  
                  if (testDisplayOrder < controlDisplayOrder) {
                    highlightClass = 'bg-green-100 dark:bg-green-900/40';
                    diffs.push({ type: 'order', label: `Order Promoted: ${controlDisplayOrder} -> ${testDisplayOrder}`, icon: <ArrowUp size={14}/> });
                  }
                  if (testItem.description !== controlItem.description) {
                    diffs.push({ type: 'desc', label: 'Description', icon: <Pencil size={14} /> });
                  }
                  if (testItem.price !== controlItem.price) {
                    diffs.push({ type: 'price', label: `Price: ${controlItem.price} -> ${testItem.price}`, icon: <Pencil size={14} /> });
                  }
                  const controlRecs = new Set(controlItem.youMayAlsoLike || []);
                  const testRecs = new Set(testItem.youMayAlsoLike || []);
                  if (JSON.stringify([...controlRecs].sort()) !== JSON.stringify([...testRecs].sort())) {
                     diffs.push({ type: 'recs', label: 'Recommendations', icon: <List size={14} /> });
                  }
                }

                return (
                  <div key={testItem.id} className={cn("p-3 border rounded-lg transition-colors", highlightClass)}>
                    <div className="flex justify-between items-center">
                      <p className="font-semibold">{testItem.name}</p>
                      <p className="font-bold text-primary">{testItem.price}</p>
                    </div>
                    {diffs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {diffs.map(d => (
                          <Badge key={d.type} variant="secondary" className="font-normal">
                            {d.icon}<span className="ml-1.5">{d.label}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <TestTube className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No significant menu changes are being tested.</p>
                <p className="text-sm">Minor changes may exist but do not meet the threshold for display.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <History className="mr-3 h-7 w-7 text-primary" />
              Test History & Evaluations
            </CardTitle>
            <CardDescription>
              History of currently running hypotheses and their daily evaluations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedMenuInstance.testHistory ? (
              <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert bg-secondary/30 p-4 rounded-md max-h-96 overflow-y-auto">
                <ReactMarkdown>{selectedMenuInstance.testHistory}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No test history available yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
