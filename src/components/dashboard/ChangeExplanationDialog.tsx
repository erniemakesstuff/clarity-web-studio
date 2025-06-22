
"use client";

import type { MenuItem } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, List, Pencil, PlusCircle, TrendingUp } from "lucide-react";
import { Badge } from "../ui/badge";

interface ChangeExplanationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  data: {
    control?: MenuItem;
    test: MenuItem;
  } | null;
}

const getChangeExplanation = (control?: MenuItem, test?: MenuItem) => {
  if (!test) return [];

  const explanations: {
    title: string;
    description: string;
    icon: React.ReactNode;
    details?: React.ReactNode;
  }[] = [];
  const controlItem = control;

  // New Item
  if (!controlItem) {
    explanations.push({
      title: "New Item Introduced",
      description: "This is a brand new item added to the menu for this experiment. We are testing to see how customers respond to new offerings.",
      icon: <PlusCircle className="h-5 w-5 text-blue-500" />,
    });
    return explanations;
  }

  // Display Order Change
  const controlDisplayOrder = controlItem.displayOrder ?? Infinity;
  const testDisplayOrder = test.displayOrder ?? Infinity;
  if (testDisplayOrder !== controlDisplayOrder && controlDisplayOrder !== Infinity) {
    explanations.push({
      title: "Prominence Changed",
      description: "This item's position on the menu was adjusted. A lower number means it appears earlier or more prominently to customers (e.g., higher up in a list). We are testing if changing its visibility affects how often it's ordered.",
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      details: (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">From Position: {controlDisplayOrder}</Badge>
          <ArrowRight size={16} />
          <Badge variant="default">To Position: {testDisplayOrder}</Badge>
        </div>
      )
    });
  }

  // Description Change
  if (test.description !== controlItem.description) {
     explanations.push({
      title: "Description Updated",
      description: "The description of this item was updated. We are testing if different wording can make the item more appealing and informative to customers.",
      icon: <Pencil className="h-5 w-5 text-orange-500" />,
       details: (
        <div className="space-y-2 text-sm bg-background/50 p-2 rounded-md">
           <p className="text-muted-foreground"><strong className="text-foreground">From:</strong> {controlItem.description || "N/A"}</p>
           <hr/>
           <p className="text-muted-foreground"><strong className="text-foreground">To:</strong> {test.description || "N/A"}</p>
        </div>
      )
    });
  }

  // Recommendations Change
  const controlRecs = new Set(controlItem.youMayAlsoLike || []);
  const testRecs = new Set(test.youMayAlsoLike || []);
  if (JSON.stringify([...controlRecs].sort()) !== JSON.stringify([...testRecs].sort())) {
     const added = [...testRecs].filter(rec => !controlRecs.has(rec));
     const removed = [...controlRecs].filter(rec => !testRecs.has(rec));
     explanations.push({
        title: "Recommendations Changed",
        description: "We've adjusted the 'You May Also Like' suggestions for this item. This experiment helps us learn which item pairings are most effective at increasing order sizes and customer satisfaction.",
        icon: <List className="h-5 w-5 text-purple-500" />,
        details: (
          <div className="space-y-2 text-sm">
            {added.length > 0 && <p><strong className="text-green-600">Added:</strong> {added.join(', ')}</p>}
            {removed.length > 0 && <p><strong className="text-red-600">Removed:</strong> {removed.join(', ')}</p>}
          </div>
        )
     });
  }
  
  // Price Change
  if (test.price !== controlItem.price) {
    explanations.push({
      title: "Price Adjusted",
      description: "The price was changed for this test. We are analyzing how price adjustments affect customer purchasing decisions and overall revenue.",
      icon: <Pencil className="h-5 w-5 text-yellow-500" />,
      details: (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">From: {controlItem.price}</Badge>
          <ArrowRight size={16} />
          <Badge variant="default">To: {test.price}</Badge>
        </div>
      )
    });
  }

  return explanations;
};


export function ChangeExplanationDialog({ isOpen, onOpenChange, data }: ChangeExplanationDialogProps) {
  if (!isOpen || !data) return null;

  const explanations = getChangeExplanation(data.control, data.test);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Why did "{data.test.name}" change?</DialogTitle>
          <DialogDescription>
            Here's a breakdown of the experimental changes made to this item.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {explanations.length > 0 ? explanations.map((exp, index) => (
                <div key={index} className="flex items-start gap-4 p-3 rounded-lg border bg-secondary/30">
                    <div className="flex-shrink-0 pt-1">{exp.icon}</div>
                    <div>
                        <h4 className="font-semibold text-foreground">{exp.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{exp.description}</p>
                        {exp.details && <div className="mt-2">{exp.details}</div>}
                    </div>
                </div>
            )) : (
                <p className="text-center text-muted-foreground">No significant changes were detected for this item based on the current criteria.</p>
            )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
