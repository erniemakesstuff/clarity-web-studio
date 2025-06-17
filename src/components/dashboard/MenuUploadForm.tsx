
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPresignedUploadUrl } from "@/app/(dashboard)/dashboard/menu-management/actions";
import { extractMenuItems, type ExtractMenuItemsInput, type ExtractMenuItemsOutput } from "@/ai/flows/extract-menu-items";
import { UploadCloud, FileText, Loader2, CheckCircle, AlertTriangle, Camera, XCircle } from "lucide-react";
import type { ExtractedMenuItem } from "@/lib/types";
import Image from "next/image";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";

interface QueuedItem {
  id: string;
  file: File;
  previewUrl: string;
  source: 'upload' | 'capture';
}

export function MenuUploadForm() {
  const [queuedItems, setQueuedItems] = useState<QueuedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedMenuItem[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const { toast } = useToast();
  const { jwtToken, selectedMenuInstance } = useAuth();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const requestCameraPermission = useCallback(async () => {
    if (isCameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
        setIsCameraActive(false);
      }
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraActive, toast]);

  useEffect(() => {
    requestCameraPermission();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [requestCameraPermission]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const newQueuedItems: QueuedItem[] = newFiles.map(file => ({
        id: `${file.name}-${Date.now()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        source: 'upload',
      }));
      setQueuedItems(prev => [...prev, ...newQueuedItems].slice(0, 5)); // Limit to 5 for now
      setExtractedItems([]);
      setProcessingError(null);
      if (newFiles.length > 5) {
        toast({ title: "File Limit", description: "You can upload a maximum of 5 images at a time.", variant: "default" });
      }
    }
    event.target.value = '';
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const fileName = `capture-${Date.now()}.png`;
            const capturedFile = new File([blob], fileName, { type: 'image/png' });
            const newQueuedItem: QueuedItem = {
              id: fileName,
              file: capturedFile,
              previewUrl: URL.createObjectURL(capturedFile),
              source: 'capture',
            };
            if (queuedItems.length < 5) {
              setQueuedItems(prev => [...prev, newQueuedItem]);
            } else {
              toast({ title: "File Limit", description: "You can process a maximum of 5 images at a time.", variant: "default" });
            }
          }
        }, 'image/png');
      }
    } else {
      toast({
        title: "Camera not ready",
        description: "Please wait for the camera feed to load before capturing.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveQueuedItem = (itemId: string) => {
    const itemToRemove = queuedItems.find(item => item.id === itemId);
    if (itemToRemove) {
      URL.revokeObjectURL(itemToRemove.previewUrl);
    }
    setQueuedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (queuedItems.length === 0) {
      toast({
        title: "No images selected",
        description: "Please upload or capture at least one menu image.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMenuInstance) {
      toast({
        title: "No Menu Selected",
        description: "Please select a menu from the dropdown in the header before uploading images.",
        variant: "destructive",
      });
      return;
    }
    const menuId = selectedMenuInstance.id;
    const ownerId = "admin@example.com"; // Mocked, replace with actual from AuthContext if available

    setIsProcessing(true);
    setProcessingError(null);
    setExtractedItems([]);
    let allExtracted: ExtractedMenuItem[] = [];
    let filesProcessedSuccessfully = 0;
    const totalFiles = queuedItems.length;

    for (let i = 0; i < totalFiles; i++) {
      const item = queuedItems[i];
      const currentFileProgress = (i / totalFiles) * 100;
      
      try {
        // Stage 1: Get presigned URL
        setProgressMessage(`Preparing ${item.file.name} (1/3)...`);
        setCurrentProgress(currentFileProgress + (1 / 3 / totalFiles) * 100 * 0.9); // Small increment for this step

        const base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(item.file);
        });

        const presignedUrlResult = await getPresignedUploadUrl(
          { ownerId, menuId, mediaType: item.file.type, payload: base64Image }, 
          jwtToken
        );

        if (!presignedUrlResult.success || !presignedUrlResult.mediaURL) {
          throw new Error(presignedUrlResult.message || `Failed to get upload URL for ${item.file.name}`);
        }
        const s3UploadUrl = presignedUrlResult.mediaURL;
        
        // The finalMediaUrl from presignedUrlResult is currently the same as s3UploadUrl (the presigned PUT URL).
        // For the AI to GET the image, we attempt to use the base URL (without query params).
        // This assumes the S3 objects are publicly readable after upload.
        const finalMediaUrlForAI = (presignedUrlResult.finalMediaUrl || s3UploadUrl).split('?')[0];


        // Stage 2: Upload to S3
        setProgressMessage(`Uploading ${item.file.name} (2/3)...`);
        setCurrentProgress(currentFileProgress + (2 / 3 / totalFiles) * 100 * 0.9);

        const s3Response = await fetch(s3UploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': item.file.type }, 
          body: item.file,
        });

        if (!s3Response.ok) {
          throw new Error(`S3 upload failed for ${item.file.name}: ${s3Response.status} ${s3Response.statusText}`);
        }

        // Stage 3: Extract menu items using AI
        setProgressMessage(`Extracting from ${item.file.name} (3/3)...`);
        setCurrentProgress(currentFileProgress + (3 / 3 / totalFiles) * 100 * 0.9);


        const extractionInput: ExtractMenuItemsInput = { menuImageUrl: finalMediaUrlForAI };
        const extractionResult: ExtractMenuItemsOutput = await extractMenuItems(extractionInput);

        if (extractionResult.menuItems && extractionResult.menuItems.length > 0) {
          allExtracted = [...allExtracted, ...extractionResult.menuItems];
        }
        filesProcessedSuccessfully++;

      } catch (err: any) {
        console.error(`Error processing ${item.file.name}:`, err);
        setProcessingError((prevError) => 
          (prevError ? prevError + "\n" : "") + `Failed to process ${item.file.name}: ${err.message}`
        );
        toast({
          title: `Error with ${item.file.name}`,
          description: err.message,
          variant: "destructive",
        });
      }
    }
    setCurrentProgress(100);
    setProgressMessage(filesProcessedSuccessfully > 0 ? "Processing complete!" : "Processing finished with errors.");
    setExtractedItems(allExtracted);
    setIsProcessing(false);

    if (filesProcessedSuccessfully === totalFiles && totalFiles > 0) {
      toast({
        title: "Menu Items Extracted!",
        description: `${allExtracted.length} items found from ${totalFiles} image(s). Review and save.`,
        variant: "default",
        className: "bg-green-500 text-white"
      });
    } else if (allExtracted.length > 0) {
       toast({
        title: "Partial Success",
        description: `${allExtracted.length} items extracted. Some images failed. Check error messages.`,
        variant: "default" 
      });
    } else if (totalFiles > 0) {
      const noItemsMsg = "No menu items could be extracted from the processed image(s). Try clearer images or check formats.";
      if (!processingError) setProcessingError(noItemsMsg); // Set general error if no specific file errors
      toast({
        title: "Extraction Complete - No Items Found",
        description: noItemsMsg,
        variant: "destructive",
      });
    }
    // setQueuedItems([]); // Optionally clear queue after processing
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <UploadCloud className="mr-3 h-7 w-7 text-primary" />
          Upload or Capture Your Menu
        </CardTitle>
        <CardDescription>
          Add up to 5 menu images (JPG, PNG, WEBP). Our AI will extract items after upload.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="menu-image-upload" className="text-base">Add Menu Images</Label>
            <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
              <Input
                id="menu-image-upload"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                onChange={handleFileChange}
                className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                disabled={isProcessing || isCameraActive || queuedItems.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCameraActive(prev => !prev)}
                disabled={isProcessing || queuedItems.length >= 5}
                className="w-full sm:w-auto"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isCameraActive ? "Close Camera" : "Open Camera"}
              </Button>
            </div>
             {queuedItems.length >= 5 && <p className="text-xs text-muted-foreground mt-1">Maximum 5 images in queue.</p>}
          </div>

          {isCameraActive && (
            <div className="space-y-4 p-4 border rounded-md bg-secondary/30">
              <h3 className="text-lg font-medium">Camera Capture</h3>
              {hasCameraPermission === false && (
                <Alert variant="destructive">
                  <AlertTitleUI>Camera Access Denied</AlertTitleUI>
                  <AlertDescriptionUI>
                    Please enable camera permissions in your browser settings. You may need to refresh the page.
                  </AlertDescriptionUI>
                </Alert>
              )}
              {hasCameraPermission === true && (
                <>
                  <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  </div>
                  <Button type="button" onClick={handleCapturePhoto} className="w-full sm:w-auto" disabled={!videoRef.current?.srcObject || queuedItems.length >= 5}>
                    Capture Photo
                  </Button>
                </>
              )}
              {hasCameraPermission === null && <p className="text-muted-foreground">Requesting camera permission...</p>}
            </div>
          )}

          {queuedItems.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Queued Images ({queuedItems.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-2 border rounded-md bg-secondary/10">
                {queuedItems.map((item) => (
                  <div key={item.id} className="relative group aspect-square border rounded-md overflow-hidden">
                    <Image src={item.previewUrl} alt={item.file.name} layout="fill" objectFit="cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveQueuedItem(item.id)}
                        className="h-8 w-8"
                        aria-label="Remove image"
                        disabled={isProcessing}
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                      {item.file.name} ({item.source})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={currentProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{progressMessage || "Processing..."}</p>
            </div>
          )}

          {processingError && !isProcessing && ( // Show general errors only when not processing
            <div className="p-3 rounded-md bg-destructive/10 text-destructive flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 shrink-0" />
              <p className="text-sm whitespace-pre-line">{processingError}</p>
            </div>
          )}

        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button type="submit" disabled={isProcessing || queuedItems.length === 0} className="w-full sm:w-auto">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Upload & Extract from {queuedItems.length} Image(s)
              </>
            )}
          </Button>
        </CardFooter>
      </form>

      {extractedItems.length > 0 && !isProcessing && (
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
            Extracted Items ({extractedItems.length})
          </h3>
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 rounded-md border p-4 bg-secondary/30">
            {extractedItems.map((item, index) => (
              <Card key={`${item.name}-${index}-${Math.random()}`} className="bg-background shadow-sm">
                <CardContent className="p-3">
                  <p className="font-semibold text-base text-primary">{item.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  <p className="text-sm font-medium text-foreground mt-1">{item.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button className="mt-4 w-full sm:w-auto" onClick={() => toast({title: "Save Mocked", description:"This would save the menu to backend."})}>
            Review and Save Menu
          </Button>
        </div>
      )}
    </Card>
  );
}
