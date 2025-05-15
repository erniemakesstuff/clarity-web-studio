"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; // Added import
import { useToast } from "@/hooks/use-toast";
import { generateMarketingContent, type GenerateMarketingContentInput, type GenerateMarketingContentOutput } from "@/ai/flows/generate-marketing-content";
import { Sparkles, Loader2, FileText, Wand2 } from "lucide-react";

type ContentType = "blog post" | "social media update" | "recipe";

export function ContentGeneratorForm() {
  const [menuText, setMenuText] = useState("");
  const [contentType, setContentType] = useState<ContentType>("blog post");
  const [tone, setTone] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!menuText.trim()) {
      toast({
        title: "Menu text is empty",
        description: "Please provide some menu text to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const input: GenerateMarketingContentInput = {
        menuText,
        contentType,
        tone: tone || undefined, // Pass undefined if empty
      };
      const result: GenerateMarketingContentOutput = await generateMarketingContent(input);
      setGeneratedContent(result.content);
      toast({
        title: "Content Generated Successfully!",
        description: "Your marketing content is ready.",
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
          <Wand2 className="mr-3 h-7 w-7 text-primary" />
          AI Marketing Content Generator
        </CardTitle>
        <CardDescription>
          Paste your menu text (or key items) and let AI create engaging marketing content for you.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="menu-text" className="text-base">Menu Text / Key Items</Label>
            <Textarea
              id="menu-text"
              placeholder="e.g., Margherita Pizza - Classic delight with mozzarella cheese...\nSpicy Thai Green Curry - Aromatic curry with chicken..."
              value={menuText}
              onChange={(e) => setMenuText(e.target.value)}
              rows={8}
              className="mt-2"
              required
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground mt-1">Provide as much detail as possible for better results.</p>
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
          <Button type="submit" disabled={isGenerating || !menuText.trim()} className="w-full sm:w-auto">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>
        </CardFooter>
      </form>

      {generatedContent && (
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="h-6 w-6 mr-2 text-primary" />
            Generated Content
          </h3>
          <div className="prose prose-sm sm:prose-base max-w-none p-4 border rounded-md bg-secondary/30 max-h-[500px] overflow-y-auto whitespace-pre-wrap">
            {generatedContent}
          </div>
           <Button className="mt-4 w-full sm:w-auto" onClick={() => navigator.clipboard.writeText(generatedContent).then(() => toast({ title: "Copied to clipboard!"}))}>
            Copy Content
          </Button>
        </div>
      )}
    </Card>
  );
}
