
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getReceiptPresignedUploadUrl, reconcileReceiptWithBackend } from "@/app/(dashboard)/dashboard/analytics/actions";
import { UploadCloud, Loader2, CheckCircle, AlertTriangle, Camera, XCircle, FileScan } from "lucide-react";
import Image from "next/image";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert"; // Renamed to avoid conflict

export function ReceiptUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { toast } = useToast();
  const { jwtToken, selectedMenuInstance, selectedMenuOwnerId } = useAuth();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsUploading(false);
    setIsReconciling(false);
    setUploadProgress(0);
    setError(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const requestCameraPermission = useCallback(async () => {
    if (isCameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
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
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Please select an image smaller than 5MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setSuccessMessage(null);
    }
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
            const fileName = `receipt-capture-${Date.now()}.png`;
            const capturedFile = new File([blob], fileName, { type: 'image/png' });
            setSelectedFile(capturedFile);
            setPreviewUrl(URL.createObjectURL(capturedFile));
            setError(null);
            setSuccessMessage(null);
            setIsCameraActive(false); // Close camera after capture
          }
        }, 'image/png');
      }
    }
  };
  
  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    setSuccessMessage(null);
     if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({ title: "No image selected", description: "Please select or capture a receipt image.", variant: "destructive" });
      return;
    }
    if (!selectedMenuInstance) {
      toast({ title: "No Menu Selected", description: "Please select a menu instance.", variant: "destructive" });
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(10);

      // 1. Get presigned S3 URL from our backend (without sending file payload)
      const presignedUrlResult = await getReceiptPresignedUploadUrl(
        {
          ownerId: selectedMenuOwnerId,
          menuId: selectedMenuInstance.id,
          mediaType: selectedFile.type,
        },
        jwtToken
      );

      if (!presignedUrlResult.success || !presignedUrlResult.presignedUrl || !presignedUrlResult.finalMediaUrl) {
        throw new Error(presignedUrlResult.message || "Failed to get receipt upload URL.");
      }
      setUploadProgress(30);

      // 2. Upload the image to S3 using the presigned URL
      const s3Response = await fetch(presignedUrlResult.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': selectedFile.type },
        body: selectedFile, // The actual file object is sent here
      });

      if (!s3Response.ok) {
        const s3ErrorText = await s3Response.text();
        throw new Error(`S3 upload failed: ${s3Response.status} ${s3Response.statusText}. Details: ${s3ErrorText.substring(0,100)}`);
      }
      setUploadProgress(70);
      setIsUploading(false);
      setIsReconciling(true);

      // 3. Call reconcile endpoint
      const reconcileResult = await reconcileReceiptWithBackend(
        {
          ownerId: selectedMenuOwnerId,
          menuId: selectedMenuInstance.id,
          imageUrl: presignedUrlResult.finalMediaUrl,
        },
        jwtToken
      );

      if (!reconcileResult.success) {
        throw new Error(reconcileResult.message || "Failed to submit receipt for reconciliation.");
      }

      setSuccessMessage(reconcileResult.message || "Receipt uploaded and submitted for processing!");
      toast({
        title: "Receipt Submitted",
        description: reconcileResult.message || "Your receipt is being processed.",
        variant: "default",
        className: "bg-green-500 text-white"
      });
      // Optionally reset form after a delay or keep it to show success
      // resetState(); // Call this if you want to clear form on success

    } catch (err: any) {
      console.error("Receipt processing error:", err);
      setError(err.message || "An unknown error occurred.");
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setIsReconciling(false);
      setUploadProgress(100); // Mark as complete whether success or fail for progress bar
    }
  };

  const isProcessing = isUploading || isReconciling;

  return (
    <Card className="w-full shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <FileScan className="mr-3 h-7 w-7 text-primary" />
          Upload Receipt for Analysis
        </CardTitle>
        <CardDescription>
          Capture or upload an image of a customer's receipt to analyze spending patterns and item popularity.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {!previewUrl && !isCameraActive && (
            <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
              <Label htmlFor="receipt-image-upload" className="sr-only">Upload Receipt Image</Label>
              <Input
                id="receipt-image-upload"
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className="flex-grow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                disabled={isProcessing}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCameraActive(true)}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                <Camera className="mr-2 h-4 w-4" />
                Open Camera
              </Button>
            </div>
          )}

          {isCameraActive && (
            <div className="space-y-4 p-4 border rounded-md bg-secondary/30">
              <h3 className="text-lg font-medium">Camera Capture</h3>
              {hasCameraPermission === false && (
                <Alert variant="destructive">
                  <AlertTitleUI>Camera Access Denied</AlertTitleUI>
                  <AlertDescriptionUI>
                    Enable camera permissions in browser settings and refresh.
                  </AlertDescriptionUI>
                </Alert>
              )}
              {hasCameraPermission === true && (
                <>
                  <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={handleCapturePhoto} className="flex-1" disabled={!videoRef.current?.srcObject}>
                      Capture
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsCameraActive(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </>
              )}
              {hasCameraPermission === null && <p className="text-muted-foreground">Requesting camera...</p>}
            </div>
          )}

          {previewUrl && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Image Preview</h3>
              <div className="relative group w-full max-w-md mx-auto aspect-auto border rounded-md overflow-hidden">
                <Image src={previewUrl} alt="Receipt preview" width={400} height={600} objectFit="contain" className="mx-auto" />
                {!isProcessing && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 h-8 w-8 z-10"
                    aria-label="Remove image"
                  >
                    <XCircle className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {(isUploading || isReconciling || error || successMessage) && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full h-2" />
              <p className="text-sm text-muted-foreground text-center flex items-center justify-center">
                {isUploading && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading to secure storage...</>}
                {isReconciling && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting for reconciliation...</>}
                {error && !isProcessing && <><AlertTriangle className="mr-2 h-4 w-4 text-destructive" /> {error}</>}
                {successMessage && !isProcessing && !error && <><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> {successMessage}</>}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-6">
          <Button type="submit" disabled={isProcessing || !selectedFile || !selectedMenuInstance} className="w-full sm:w-auto">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload and Process Receipt
              </>
            )}
          </Button>
           { (previewUrl || error || successMessage) && !isProcessing && (
            <Button type="button" variant="outline" onClick={resetState} className="ml-auto">
              Clear / New Receipt
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
