
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPresignedUploadUrl, startBackendWorkflow, pollWorkflowStatus as pollWorkflowStatusAction } from "@/app/(dashboard)/dashboard/menu-management/actions";
import { UploadCloud, FileText, Loader2, CheckCircle, AlertTriangle, Camera, XCircle, Clock, Image as ImageIcon, PlayCircle } from "lucide-react";
import type { ExtractedMenuItem } from "@/lib/types";
import Image from "next/image";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface QueuedItem {
  id: string;
  file: File;
  previewUrl: string;
  source: 'upload' | 'capture';
  // base64?: string; // No longer needed for presigned URL request
  s3UploadUrl?: string;
  finalMediaUrl?: string;
  uploadSuccess?: boolean;
}

const MAX_CONCURRENT_UPLOADS = 3;
const POLLING_INTERVAL_MS = 10000;
const POLLING_TIMEOUT_MS = 5 * 60 * 1000;

const ADMIN_USER_RAW_IDS = ["admin@example.com", "valerm09@gmail.com"];

export function MenuUploadForm() {
  const [queuedItems, setQueuedItems] = useState<QueuedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedMenuItem[]>([]);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [workflowOutcome, setWorkflowOutcome] = useState<'success' | 'failure' | null>(null);
  const [processedImageUrls, setProcessedImageUrls] = useState<string[]>([]);

  const { toast } = useToast();
  const { jwtToken, selectedMenuInstance, refreshMenuInstances, rawOwnerId, ownerId } = useAuth();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isDeveloperUser = rawOwnerId ? ADMIN_USER_RAW_IDS.includes(rawOwnerId) : false;

  useEffect(() => {
    if (selectedMenuInstance && selectedMenuInstance.s3ContextImageUrls && selectedMenuInstance.s3ContextImageUrls.length > 0 && !isProcessing && workflowOutcome === null) {
      setProcessedImageUrls(selectedMenuInstance.s3ContextImageUrls);
    } else if (!selectedMenuInstance?.s3ContextImageUrls && !isProcessing && workflowOutcome === null) {
      setProcessedImageUrls([]);
    }
  }, [selectedMenuInstance, isProcessing, workflowOutcome]);


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
      setWorkflowOutcome(null);
      setProcessedImageUrls([]);
      setCurrentProgress(0);
      setProgressMessage("");
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
              setWorkflowOutcome(null);
              setProcessedImageUrls([]);
              setCurrentProgress(0);
              setProgressMessage("");
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

  const cleanupPolling = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    pollingIntervalRef.current = null;
    pollingTimeoutRef.current = null;
  },[]);

  const doPollWorkflowStatus = useCallback(async (ownerIdForPoll: string, menuId: string): Promise<boolean> => {
    const pollResult = await pollWorkflowStatusAction(ownerIdForPoll, menuId, jwtToken);

    if (!pollResult.success) {
      setProcessingError(pollResult.message || "Failed to get workflow status.");
      toast({ title: "Polling Error", description: pollResult.message, variant: "destructive" });
      cleanupPolling();
      setIsProcessing(false);
      setWorkflowOutcome('failure');
      setCurrentProgress(100); 
      return false;
    }

    const backendState = pollResult.state || "Unknown";

    switch (backendState) {
      case "New":
      case "WaitingForInitialContext":
        setCurrentProgress(60);
        setProgressMessage("Workflow state: Waiting for context...");
        return true;
      case "Preparing":
        setCurrentProgress(70);
        setProgressMessage("Workflow state: Preparing data...");
        return true;
      case "Generating":
        setCurrentProgress(85);
        setProgressMessage("Workflow state: AI processing images...");
        return true;
      case "Done":
        setCurrentProgress(100);
        setExtractedItems(pollResult.menuItems || []);
        setProcessedImageUrls(pollResult.s3ContextImageUrls || []);
        if(!isProcessing) { 
          toast({
            title: "Menu Processed Successfully!",
            description: `${pollResult.menuItems?.length || 0} items found.`,
            variant: "default", className: "bg-green-500 text-white"
          });
        }
        cleanupPolling();
        setIsProcessing(false);
        setWorkflowOutcome('success');
        refreshMenuInstances();
        return false;
      case "Failed":
        setCurrentProgress(100);
        setProcessingError(pollResult.message || "Backend workflow failed to process the menu.");
        if(!isProcessing) { 
          toast({ title: "Workflow Failed", description: pollResult.message || "The backend failed to process your menu.", variant: "destructive" });
        }
        cleanupPolling();
        setIsProcessing(false);
        setWorkflowOutcome('failure');
        return false;
      default:
        setProgressMessage(`Workflow state: ${backendState}. Monitoring...`);
        return true;
    }
  }, [jwtToken, toast, cleanupPolling, refreshMenuInstances, isProcessing]);


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
    setWorkflowOutcome(null);
    setProcessedImageUrls([]);
    setCurrentProgress(0);
    setProgressMessage("Starting process...");

    const ownerIdToUse = ownerId;
    const menuId = selectedMenuInstance.id;
    const itemsToProcess: QueuedItem[] = [];

    setProgressMessage("Requesting upload URLs (1/4)...");
    for (let i = 0; i < queuedItems.length; i++) {
      const item = queuedItems[i];
      try {
        // Removed base64 conversion here
        const presignedResult = await getPresignedUploadUrl(
          { ownerId: ownerIdToUse, menuId, mediaType: item.file.type }, // No payload sent
          jwtToken
        );
        if (!presignedResult.success || !presignedResult.mediaURL) {
          throw new Error(presignedResult.message || `Failed to get upload URL for ${item.file.name}`);
        }
        item.s3UploadUrl = presignedResult.mediaURL;
        item.finalMediaUrl = presignedResult.finalMediaUrl;
        itemsToProcess.push(item);
        setCurrentProgress(Math.round(10 + ( (i + 1) / queuedItems.length) * 10));
      } catch (err: any) {
        setProcessingError(`Error preparing ${item.file.name}: ${err.message}`);
        toast({ title: `Preparation Error`, description: err.message, variant: "destructive" });
        setIsProcessing(false);
        setWorkflowOutcome('failure');
        setCurrentProgress(100);
        return;
      }
    }

    setProgressMessage("Starting backend workflow & S3 uploads (2/4 & 3/4)...");
    setCurrentProgress(20);

    let workflowStartedSuccessfully = false;
    try {
      const workflowStartResult = await startBackendWorkflow(ownerIdToUse, menuId, jwtToken);
      if (!workflowStartResult.success) {
        throw new Error(workflowStartResult.message || "Failed to start backend workflow.");
      }
      workflowStartedSuccessfully = true;
      setProgressMessage("Backend workflow initiated. Uploading images...");
      setCurrentProgress(25);
    } catch (err: any) {
      setProcessingError(`Error starting backend workflow: ${err.message}`);
      toast({ title: "Workflow Start Error", description: err.message, variant: "destructive" });
      setIsProcessing(false);
      setWorkflowOutcome('failure');
      setCurrentProgress(100);
      return;
    }

    let uploadsCompletedCount = 0;
    const s3UploadPromises = itemsToProcess.map(item => async () => {
      if (!item.s3UploadUrl) return;
      try {
        const s3Response = await fetch(item.s3UploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': item.file.type },
          body: item.file, // Actual file object is uploaded
        });
        if (!s3Response.ok) {
          throw new Error(`S3 upload failed for ${item.file.name}: ${s3Response.status} ${s3Response.statusText}`);
        }
        item.uploadSuccess = true;
      } catch (uploadErr: any) {
        item.uploadSuccess = false;
        console.error(`S3 Upload Error for ${item.file.name}: ${uploadErr.message}`);
      } finally {
        uploadsCompletedCount++;
        setCurrentProgress(Math.round(25 + (uploadsCompletedCount / itemsToProcess.length) * 25));
      }
    });

    const activeUploads: Promise<void>[] = [];
    for (const task of s3UploadPromises) {
      const promise = task().finally(() => {
        activeUploads.splice(activeUploads.indexOf(promise), 1);
      });
      activeUploads.push(promise);
      if (activeUploads.length >= MAX_CONCURRENT_UPLOADS) {
        await Promise.race(activeUploads);
      }
    }
    await Promise.all(activeUploads);

    const successfulUploadsCount = itemsToProcess.filter(item => item.uploadSuccess).length;
    if (successfulUploadsCount === 0 && itemsToProcess.length > 0) {
      setProcessingError("All S3 uploads failed. Cannot proceed with workflow.");
      toast({ title: "Upload Failure", description: "All image uploads to S3 failed.", variant: "destructive" });
      setIsProcessing(false);
      setWorkflowOutcome('failure');
      setCurrentProgress(100);
      return;
    }
    if (successfulUploadsCount < itemsToProcess.length) {
       toast({ title: "Partial Upload Success", description: `${successfulUploadsCount} of ${itemsToProcess.length} images uploaded. Proceeding with workflow.`, variant: "default" });
    }

    setProgressMessage("Image uploads complete. Monitoring backend workflow (4/4)...");
    setCurrentProgress(50);

    if (workflowStartedSuccessfully && successfulUploadsCount > 0) {
      cleanupPolling();

      let shouldContinuePolling = await doPollWorkflowStatus(ownerIdToUse, menuId);

      if (shouldContinuePolling) {
        pollingIntervalRef.current = setInterval(async () => {
          const continuePollingAfterInterval = await doPollWorkflowStatus(ownerIdToUse, menuId);
          if (!continuePollingAfterInterval) {
            cleanupPolling();
          }
        }, POLLING_INTERVAL_MS);

        pollingTimeoutRef.current = setTimeout(() => {
          if (pollingIntervalRef.current) {
             cleanupPolling();
             if (workflowOutcome !== 'success' && workflowOutcome !== 'failure') {
                setProcessingError("Workflow polling timed out. Please check status later or refresh.");
                toast({ title: "Polling Timeout", description: "Workflow took too long to respond.", variant: "destructive" });
                setIsProcessing(false); 
                setWorkflowOutcome('failure'); 
                setCurrentProgress(100); 
             }
          }
        }, POLLING_TIMEOUT_MS);
      }
    } else {
      setIsProcessing(false);
      if (!processingError) setProcessingError("Could not start workflow or no images uploaded.");
      setWorkflowOutcome('failure');
      setCurrentProgress(100);
    }
  };

  const handleManualWorkflowStart = async () => {
    if (!selectedMenuInstance) {
      toast({ title: "No Menu Selected", description: "Please select a menu from the dropdown.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    setProcessingError(null);
    setExtractedItems([]);
    setWorkflowOutcome(null);
    setProcessedImageUrls([]);
    setCurrentProgress(0);
    setProgressMessage("Manually starting workflow...");

    const ownerIdToUse = ownerId; 
    const menuId = selectedMenuInstance.id;

    try {
      const workflowStartResult = await startBackendWorkflow(ownerIdToUse, menuId, jwtToken);
      if (!workflowStartResult.success) {
        throw new Error(workflowStartResult.message || "Failed to start backend workflow manually.");
      }
      
      setProgressMessage("Manual workflow initiated. Monitoring backend (2/2)...");
      setCurrentProgress(50);
      
      cleanupPolling();
      let shouldContinuePolling = await doPollWorkflowStatus(ownerIdToUse, menuId);

      if (shouldContinuePolling) {
        pollingIntervalRef.current = setInterval(async () => {
          const continuePollingAfterInterval = await doPollWorkflowStatus(ownerIdToUse, menuId);
          if (!continuePollingAfterInterval) {
            cleanupPolling();
          }
        }, POLLING_INTERVAL_MS);

        pollingTimeoutRef.current = setTimeout(() => {
          if (pollingIntervalRef.current) {
             cleanupPolling();
             if (workflowOutcome !== 'success' && workflowOutcome !== 'failure') {
                setProcessingError("Workflow polling timed out. Please check status later or refresh.");
                toast({ title: "Polling Timeout", description: "Workflow took too long to respond.", variant: "destructive" });
                setIsProcessing(false);
                setWorkflowOutcome('failure');
                setCurrentProgress(100);
             }
          }
        }, POLLING_TIMEOUT_MS);
      }
    } catch (err: any) {
      setProcessingError(`Error starting manual workflow: ${err.message}`);
      toast({ title: "Manual Workflow Start Error", description: err.message, variant: "destructive" });
      setIsProcessing(false);
      setWorkflowOutcome('failure');
      setCurrentProgress(100);
    }
  };

  const progressIndicatorClass = cn(
    "h-full w-full flex-1 transition-all",
    {
      "bg-primary": workflowOutcome === null && isProcessing,
      "bg-green-500": workflowOutcome === 'success' && !isProcessing,
      "bg-destructive": workflowOutcome === 'failure' && !isProcessing,
    }
  );

  const displayedProgressMessage = () => {
    if (workflowOutcome === 'success' && !isProcessing) return "Extraction complete!";
    if (workflowOutcome === 'failure' && !isProcessing) return processingError || "Workflow failed.";
    return progressMessage || (isProcessing ? "Processing..." : "Awaiting action.");
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

          {(isProcessing || workflowOutcome) && (
            <div className="space-y-2">
               <Progress value={currentProgress} className="w-full" indicatorClassName={progressIndicatorClass} />
              <p className="text-sm text-muted-foreground text-center flex items-center justify-center">
                {(isProcessing && workflowOutcome === null) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(workflowOutcome === 'success' && !isProcessing) && <CheckCircle className="mr-2 h-4 w-4 text-green-500" />}
                {(workflowOutcome === 'failure' && !isProcessing) && <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />}
                {displayedProgressMessage()}
              </p>
            </div>
          )}

        </CardContent>
        <CardFooter className="border-t pt-6 flex flex-col sm:flex-row gap-2 justify-start items-center">
          <Button type="submit" disabled={isProcessing || queuedItems.length === 0 || !selectedMenuInstance} className="w-full sm:w-auto">
            {isProcessing && !progressMessage.toLowerCase().includes("manual") ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                 Upload & Process {queuedItems.length > 0 ? `${queuedItems.length} Image(s)`: ''}
              </>
            )}
          </Button>
          {isDeveloperUser && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleManualWorkflowStart} 
              disabled={isProcessing || !selectedMenuInstance}
              className="w-full sm:w-auto"
            >
              {isProcessing && progressMessage.toLowerCase().includes("manual") ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Manually...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Dev: Start Workflow (Manual)
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </form>

      {workflowOutcome === 'success' && !isProcessing && processedImageUrls.length > 0 && (
        <div className="p-6 border-t">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <ImageIcon className="h-6 w-6 mr-2 text-primary" />
            Processed Menu Images
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-2 border rounded-md bg-secondary/10">
            {processedImageUrls.map((url, index) => (
              <div key={`${url}-${index}`} className="relative aspect-square border rounded-md overflow-hidden">
                <Image
                  src={url}
                  alt={`Processed image ${index + 1}`}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint="menu page"
                />
              </div>
            ))}
          </div>
        </div>
      )}


      {extractedItems.length > 0 && !isProcessing && workflowOutcome === 'success' && (
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
                  <p className="text-sm font-medium text-foreground mt-1">{String(item.price)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button className="mt-4 w-full sm:w-auto" onClick={() => toast({title: "Save Mocked", description:"This would typically save/confirm the menu processed by backend."})}>
            Confirm Menu
          </Button>
        </div>
      )}
       {workflowOutcome === 'success' && !isProcessing && extractedItems.length === 0 && processedImageUrls.length === 0 && (
          <div className="p-6 border-t text-center text-muted-foreground">
            <CheckCircle className="mx-auto h-8 w-8 mb-2 text-green-500" />
            <p>Workflow completed successfully, but no menu items were extracted and no processed images were returned by the backend.</p>
          </div>
       )}
       {isProcessing && progressMessage.includes("Done") && extractedItems.length === 0 && workflowOutcome !== 'failure' && (
         <div className="p-6 border-t text-center text-muted-foreground">
            <Clock className="mx-auto h-8 w-8 mb-2" />
            <p>Workflow completed, finalizing results...</p>
         </div>
       )}
        {!isProcessing && workflowOutcome === null && processedImageUrls.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <ImageIcon className="h-6 w-6 mr-2 text-primary" />
              Previously Processed Menu Images
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-96 overflow-y-auto p-2 border rounded-md bg-secondary/10">
              {processedImageUrls.map((url, index) => (
                <div key={`${url}-${index}-context`} className="relative aspect-square border rounded-md overflow-hidden">
                  <Image
                    src={url}
                    alt={`Previously processed image ${index + 1}`}
                    layout="fill"
                    objectFit="cover"
                    data-ai-hint="menu page"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
    </Card>
  );
}
