
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPresignedUploadUrl, startBackendWorkflow, pollWorkflowStatus } from "@/app/(dashboard)/dashboard/menu-management/actions";
import { UploadCloud, FileText, Loader2, CheckCircle, AlertTriangle, Camera, XCircle, Clock } from "lucide-react";
import type { ExtractedMenuItem, DigitalMenuState } from "@/lib/types";
import Image from "next/image";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";

interface QueuedItem {
  id: string;
  file: File;
  previewUrl: string;
  source: 'upload' | 'capture';
  base64?: string; // To store base64 for presigned URL request
  s3UploadUrl?: string; // To store the S3 presigned PUT URL
  uploadSuccess?: boolean;
}

const MAX_CONCURRENT_UPLOADS = 3;
const POLLING_INTERVAL_MS = 10000; // 10 seconds
const POLLING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function MenuUploadForm() {
  const [queuedItems, setQueuedItems] = useState<QueuedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedMenuItem[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const { toast } = useToast();
  const { jwtToken, selectedMenuInstance, refreshMenuInstances } = useAuth();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);


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
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
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
      setQueuedItems(prev => [...prev, ...newQueuedItems].slice(0, 5));
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

  const cleanupPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    pollingIntervalRef.current = null;
    pollingTimeoutRef.current = null;
  };

  const doPollWorkflowStatus = async (ownerId: string, menuId: string) => {
    setProgressMessage("Checking workflow status...");
    const pollResult = await pollWorkflowStatus(ownerId, menuId, jwtToken);

    if (!pollResult.success) {
      setProcessingError(pollResult.message || "Failed to get workflow status.");
      toast({ title: "Polling Error", description: pollResult.message, variant: "destructive" });
      cleanupPolling();
      setIsProcessing(false); // Consider full stop
      return;
    }

    const state = pollResult.state || "Unknown";
    setProgressMessage(`Workflow state: ${state}`);

    switch (state) {
      case "New":
      case "WaitingForInitialContext":
        setCurrentProgress(60);
        setProgressMessage("Workflow started, waiting for context...");
        break;
      case "Preparing":
        setCurrentProgress(70);
        setProgressMessage("Backend preparing menu data...");
        break;
      case "Generating":
        setCurrentProgress(85);
        setProgressMessage("AI extracting items from images...");
        break;
      case "Done":
        setCurrentProgress(100);
        setProgressMessage("Extraction complete!");
        setExtractedItems(pollResult.menuItems || []);
        toast({
          title: "Menu Processed Successfully!",
          description: `${pollResult.menuItems?.length || 0} items found.`,
          variant: "default", className: "bg-green-500 text-white"
        });
        cleanupPolling();
        setIsProcessing(false);
        refreshMenuInstances(); // Refresh menu instances in AuthContext
        break;
      case "Failed":
        setProcessingError("Backend workflow failed to process the menu.");
        toast({ title: "Workflow Failed", description: "The backend failed to process your menu.", variant: "destructive" });
        cleanupPolling();
        setIsProcessing(false);
        setCurrentProgress(0); // Or some error indication on progress
        break;
      default:
        // Keep polling for other states or unknown states
        setProgressMessage(`Monitoring workflow (State: ${state})...`);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (queuedItems.length === 0) {
      toast({ title: "No images selected", description: "Please upload or capture at least one menu image.", variant: "destructive" });
      return;
    }
    if (!selectedMenuInstance) {
      toast({ title: "No Menu Selected", description: "Please select a menu from the dropdown.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setExtractedItems([]);
    setCurrentProgress(0);
    setProgressMessage("Starting process...");

    const ownerId = "admin@example.com"; // Mocked
    const menuId = selectedMenuInstance.id;
    const itemsToProcess: QueuedItem[] = [];

    // Phase 1: Get Base64 and Presigned URLs
    setProgressMessage("Preparing image uploads (1/4)...");
    for (let i = 0; i < queuedItems.length; i++) {
      const item = queuedItems[i];
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });
        item.base64 = base64;

        const presignedResult = await getPresignedUploadUrl(
          { ownerId, menuId, mediaType: item.file.type, payload: base64 },
          jwtToken
        );
        if (!presignedResult.success || !presignedResult.mediaURL) {
          throw new Error(presignedResult.message || `Failed to get upload URL for ${item.file.name}`);
        }
        item.s3UploadUrl = presignedResult.mediaURL;
        itemsToProcess.push(item);
        setCurrentProgress(10 + (i / queuedItems.length) * 10); // 10-20% progress
      } catch (err: any) {
        setProcessingError(`Error preparing ${item.file.name}: ${err.message}`);
        toast({ title: `Preparation Error`, description: err.message, variant: "destructive" });
        setIsProcessing(false);
        return;
      }
    }
    
    // Phase 2 & 3: Start Backend Workflow & Upload to S3 (Concurrently)
    setProgressMessage("Starting backend workflow & S3 uploads (2/4 & 3/4)...");
    setCurrentProgress(20);

    let workflowStartedSuccessfully = false;
    try {
      const workflowStartResult = await startBackendWorkflow(ownerId, menuId, jwtToken);
      if (!workflowStartResult.success) {
        throw new Error(workflowStartResult.message || "Failed to start backend workflow.");
      }
      workflowStartedSuccessfully = true;
      setProgressMessage("Backend workflow initiated. Uploading images...");
      setCurrentProgress(25); // Workflow started, now focus on uploads
    } catch (err: any) {
      setProcessingError(`Error starting backend workflow: ${err.message}`);
      toast({ title: "Workflow Start Error", description: err.message, variant: "destructive" });
      // Decide if to continue S3 uploads or stop. For now, let's stop.
      setIsProcessing(false);
      return;
    }

    // S3 Uploads
    const uploadPromises: Promise<void>[] = [];
    let uploadsCompleted = 0;
    const s3UploadTasks = itemsToProcess.map(item => async () => {
      if (!item.s3UploadUrl) return; // Should not happen
      try {
        const s3Response = await fetch(item.s3UploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': item.file.type },
          body: item.file,
        });
        if (!s3Response.ok) {
          throw new Error(`S3 upload failed for ${item.file.name}: ${s3Response.status} ${s3Response.statusText}`);
        }
        item.uploadSuccess = true;
      } catch (uploadErr: any) {
        item.uploadSuccess = false;
        // Accumulate errors for S3 uploads instead of stopping immediately
        setProcessingError(prev => (prev ? prev + "\n" : "") + uploadErr.message);
        toast({ title: `S3 Upload Error`, description: uploadErr.message, variant: "destructive" });
      } finally {
        uploadsCompleted++;
        setCurrentProgress(25 + (uploadsCompleted / itemsToProcess.length) * 25); // 25-50% progress
      }
    });

    // Concurrency for S3 uploads
    const concurrencyLimit = MAX_CONCURRENT_UPLOADS;
    const activeUploads: Promise<void>[] = [];
    for (const task of s3UploadTasks) {
        if (activeUploads.length >= concurrencyLimit) {
            await Promise.race(activeUploads);
        }
        const promise = task().finally(() => {
            activeUploads.splice(activeUploads.indexOf(promise), 1);
        });
        activeUploads.push(promise);
    }
    await Promise.all(activeUploads);

    const successfulUploads = itemsToProcess.filter(item => item.uploadSuccess).length;
    if (successfulUploads === 0 && itemsToProcess.length > 0) {
      setProcessingError(prev => (prev ? prev + "\n" : "") + "All S3 uploads failed. Cannot proceed with workflow.");
      toast({ title: "Upload Failure", description: "All image uploads to S3 failed.", variant: "destructive" });
      setIsProcessing(false);
      return;
    }
    if (successfulUploads < itemsToProcess.length) {
       toast({ title: "Partial Upload Success", description: `${successfulUploads} of ${itemsToProcess.length} images uploaded. Proceeding with workflow.`, variant: "default" });
    }

    setProgressMessage("Image uploads complete. Monitoring backend workflow (4/4)...");
    setCurrentProgress(50);

    // Phase 4: Poll for Workflow Status
    if (workflowStartedSuccessfully && successfulUploads > 0) {
      cleanupPolling(); // Clear any previous timers

      // Initial poll
      await doPollWorkflowStatus(ownerId, menuId);
      
      // Setup interval if not Done/Failed already
      const currentState = await pollWorkflowStatus(ownerId,menuId, jwtToken); // get current state one more time
      if (currentState.success && currentState.state && !['Done', 'Failed'].includes(currentState.state)) {
        pollingIntervalRef.current = setInterval(() => doPollWorkflowStatus(ownerId, menuId), POLLING_INTERVAL_MS);
        pollingTimeoutRef.current = setTimeout(() => {
          cleanupPolling();
          setProcessingError("Workflow polling timed out. Please check status later.");
          toast({ title: "Polling Timeout", description: "Workflow took too long to respond.", variant: "destructive" });
          setIsProcessing(false);
        }, POLLING_TIMEOUT_MS);
      } else if (!currentState.success || currentState.state === 'Failed') {
        setIsProcessing(false); // Already handled by doPollWorkflowStatus
      } else if (currentState.state === 'Done') {
         setIsProcessing(false); // Already handled
      }
    } else {
      // If workflow didn't start or no uploads, don't poll
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <UploadCloud className="mr-3 h-7 w-7 text-primary" />
          Upload or Capture Your Menu
        </CardTitle>
        <CardDescription>
          Add up to 5 menu images (JPG, PNG, WEBP). Backend AI will process items after upload.
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
              <p className="text-sm text-muted-foreground text-center flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                {progressMessage || "Processing..."}
              </p>
            </div>
          )}

          {processingError && !isProcessing && ( 
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
                Upload & Process {queuedItems.length} Image(s)
              </>
            )}
          </Button>
        </CardFooter>
      </form>

      {extractedItems.length > 0 && !isProcessing && (
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
            Extracted Items ({extractedItems.length}) from Backend
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
          <Button className="mt-4 w-full sm:w-auto" onClick={() => toast({title: "Save Mocked", description:"This would typically save/confirm the menu processed by backend."})}>
            Confirm Menu
          </Button>
        </div>
      )}
       {isProcessing && progressMessage.startsWith("Workflow state: Done") && extractedItems.length === 0 && (
         <div className="p-6 border-t text-center text-muted-foreground">
            <Clock className="mx-auto h-8 w-8 mb-2" />
            <p>Workflow completed, but no items were extracted or returned by the backend.</p>
         </div>
       )}
    </Card>
  );
}
