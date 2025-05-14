"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { extractMenuItems, type ExtractMenuItemsInput, type ExtractMenuItemsOutput } from "@/ai/flows/extract-menu-items";
import { UploadCloud, FileText, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import type { ExtractedMenuItem } from "@/lib/types";

export function MenuUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedMenuItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setExtractedItems(null); // Reset previous results
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image of your menu to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setError(null);
    setExtractedItems(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        const input: ExtractMenuItemsInput = { menuImage: base64Image };
        const result: ExtractMenuItemsOutput = await extractMenuItems(input);
        
        if (result.menuItems && result.menuItems.length > 0) {
          setExtractedItems(result.menuItems);
          toast({
            title: "Menu Extracted Successfully!",
            description: `${result.menuItems.length} items found. Review and save.`,
            variant: "default",
            className: "bg-green-500 text-white"
          });
        } else {
           setError("No menu items could be extracted. Try a clearer image or check the format.");
           toast({
            title: "Extraction Issue",
            description: "No menu items found. Please try a different image.",
            variant: "destructive",
          });
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setError("Failed to read the image file.");
        toast({
          title: "File Read Error",
          description: "Could not read the selected image file.",
          variant: "destructive",
        });
        setIsUploading(false);
      };
    } catch (err: any) {
      console.error("Error extracting menu items:", err);
      const errorMessage = err.message || "An unknown error occurred during menu extraction.";
      setError(`Extraction failed: ${errorMessage}`);
      toast({
        title: "Extraction Error",
        description: `Failed to extract menu items: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <UploadCloud className="mr-3 h-7 w-7 text-primary" />
          Upload Your Menu
        </CardTitle>
        <CardDescription>
          Upload an image of your menu (e.g., JPG, PNG). Our AI will extract the items.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="menu-image" className="text-base">Menu Image File</Label>
            <Input
              id="menu-image"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="mt-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isUploading}
            />
            {file && <p className="mt-2 text-sm text-muted-foreground">Selected: {file.name}</p>}
          </div>
          
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 shrink-0"/> 
              <p className="text-sm">{error}</p>
            </div>
          )}

        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button type="submit" disabled={isUploading || !file} className="w-full sm:w-auto">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Extract Menu Items
              </>
            )}
          </Button>
        </CardFooter>
      </form>
      
      {extractedItems && extractedItems.length > 0 && (
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 mr-2 text-green-600"/>
            Extracted Items ({extractedItems.length})
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 rounded-md border p-4 bg-secondary/30">
            {extractedItems.map((item, index) => (
              <Card key={index} className="bg-background shadow-sm">
                <CardContent className="p-3">
                  <p className="font-semibold text-base text-primary">{item.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{item.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button className="mt-4 w-full sm:w-auto" onClick={() => alert("Save functionality not implemented yet.")}>
            Review and Save Menu
          </Button>
        </div>
      )}
    </Card>
  );
}
