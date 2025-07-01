
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { generateMarketingContent, type GenerateMarketingContentInput, type GenerateMarketingContentOutput } from "@/ai/flows/generate-marketing-content";
import { Sparkles, Loader2, FileText, Wand2, List } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import type { MenuItem } from "@/lib/types";
import ReactMarkdown from "react-markdown";

type ContentType = "blog post" | "social media update" | "recipe";

export function ContentGeneratorForm() {
  const { selectedMenuInstance } = useAuth();
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [contentType, setContentType] = useState<ContentType>("blog post");
  const [tone, setTone] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const { toast } = useToast();

  const menu: MenuItem[] = selectedMenuInstance?.menu || [];
  const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleSelectAll = () => {
    const allItemIds = menu.reduce((acc, item) => {
      acc[item.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setSelectedItems(allItemIds);
  };

  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedItemIds.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one menu item to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    const selectedMenuItems = menu
      .filter(item => selectedItemIds.includes(item.id))
      .map(item => ({
        name: item.name,
        description: item.description || "A delicious menu item.",
        imageUrl: item.media?.[0]?.url,
      }));

    try {
      const input: GenerateMarketingContentInput = {
        menuItems: selectedMenuItems,
        contentType,
        tone: tone || undefined,
      };
      const result: GenerateMarketingContentOutput = await generateMarketingContent(input);
      setGeneratedContent(result.content);
      toast({
        title: "Content Draft Generated!",
        description: "Your marketing content draft is ready for review and posting.",
        variant: "default",
        className: "bg-green-500 text-white"
      });
    } catch (err: any) {
      console.error("Error generating content:", err);
      toast({
        title: "Content Generation Error",
        description: `Failed to generate content: ${err.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Sparkles className="mr-3 h-7 w-7 text-primary" />
          AI Marketing Assistant
        </CardTitle>
        <CardDescription>
          Select items from your menu and let AI help you draft engaging marketing content. You can then refine and post it.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="menu-items-list" className="text-base">
                Menu Items for AI Context
              </Label>
              {menu.length > 0 && (
                <div className="flex gap-2">
                    <Button type="button" variant="link" size="sm" onClick={handleSelectAll} disabled={isGenerating}>Select All</Button>
                    <Button type="button" variant="link" size="sm" onClick={handleDeselectAll} disabled={isGenerating}>Deselect All</Button>
                </div>
              )}
            </div>
            {menu.length > 0 ? (
              <ScrollArea className="h-72 w-full rounded-md border p-4">
                <div id="menu-items-list" className="space-y-3">
                  {menu.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`item-${item.id}`}
                        checked={!!selectedItems[item.id]}
                        onCheckedChange={() => handleItemToggle(item.id)}
                        disabled={isGenerating}
                      />
                      <label
                        htmlFor={`item-${item.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                      >
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
                <Alert>
                  <List className="h-4 w-4" />
                  <AlertTitleUI>No Menu Items Available</AlertTitleUI>
                  <AlertDescriptionUI>
                    Please select a menu instance with items in the header or upload a new menu in the "Menu Management" section to begin.
                  </AlertDescriptionUI>
                </Alert>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="content-type" className="text-base">Content Type</Label>
              <Select
                value={contentType}
                onValueChange={(value: string) => setContentType(value as ContentType)}
                disabled={isGenerating}
              >
                <SelectTrigger id="content-type" className="mt-2">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog post">Blog Post</SelectItem>
                  <SelectItem value="social media update">Social Media Update</SelectItem>
                  <SelectItem value="recipe">Recipe Idea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tone" className="text-base">Tone (Optional)</Label>
              <Input
                id="tone"
                placeholder="e.g., Professional, Funny, Casual"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-2"
                disabled={isGenerating}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button type="submit" disabled={isGenerating || selectedItemIds.length === 0} className="w-full sm:w-auto">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Draft...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Content Draft
              </>
            )}
          </Button>
        </CardFooter>
      </form>

      {generatedContent && (
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-primary" />
            Generated Content Draft
          </h3>
          <div className="prose prose-sm sm:prose-base max-w-none p-4 border rounded-md bg-secondary/30 max-h-[500px] overflow-y-auto">
            <ReactMarkdown>{generatedContent}</ReactMarkdown>
          </div>
           <Button className="mt-4 w-full sm:w-auto" onClick={() => navigator.clipboard.writeText(generatedContent).then(() => toast({ title: "Copied to clipboard!"}))}>
            Copy Content
          </Button>
        </div>
      )}
    </Card>
  );
}
