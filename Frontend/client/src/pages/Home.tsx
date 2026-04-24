import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Download, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * Design Philosophy: Minimalist Security - Premium Edition
 * Three distinct UI states with high-end animations:
 * 1. Ingestion: Hero section with staggered entrance and enhanced upload
 * 2. Processing: Document scanner visualization with laser animation
 * 3. Result: Spring pop reveal with ripple effect and satisfying interactions
 */

type AppState = "ingestion" | "processing" | "result" | "error";

interface ProcessingStep {
  text: string;
  delay: number;
}

const processingSteps: ProcessingStep[] = [
  { text: "Scanning with OCR...", delay: 0 },
  { text: "Detecting PII...", delay: 1500 },
  { text: "Redacting sensitive data...", delay: 3000 },
];

export default function Home() {
  const [state, setState] = useState<AppState>("ingestion");
  const [currentStep, setCurrentStep] = useState(0);
  const [sanitizedImage, setSanitizedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragOverRef = useRef(false);
  const [showRipple, setShowRipple] = useState(false);

  // Cycle through processing steps
  useEffect(() => {
    if (state !== "processing") return;

    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % processingSteps.length);
    }, 1500);

    return () => clearInterval(timer);
  }, [state]);

  // Trigger ripple effect on result state
  useEffect(() => {
    if (state === "result") {
      setShowRipple(true);
      const timer = setTimeout(() => setShowRipple(false), 800);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PDF, PNG, or JPG.");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setFileName(file.name);
    setState("processing");
    setCurrentStep(0);

    // Prepare FormData
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Make POST request to backend
      const response = await fetch("http://localhost:8000/sanitize-document/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Handle response - expect image blob or base64
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.image) {
          // If backend returns base64 or URL
          setSanitizedImage(data.image);
        }
      } else if (contentType?.includes("image")) {
        // If backend returns image blob directly
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setSanitizedImage(url);
      }

      setState("result");
      toast.success("Document sanitized successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      setState("error");
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to sanitize document. Please check if the backend is running."
      );
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragOverRef.current = true;
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragOverRef.current = false;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragOverRef.current = false;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Reset to ingestion state
  const handleReset = () => {
    setState("ingestion");
    setSanitizedImage(null);
    setFileName("");
    setCurrentStep(0);
    setShowRipple(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download sanitized file
  const handleDownload = () => {
    if (!sanitizedImage) return;

    // Create download link
    const link = document.createElement("a");
    link.href = sanitizedImage;
    link.download = `sanitized-${fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("File downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.03)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative flex flex-col items-center justify-center px-4 py-12 min-h-screen">
        {/* State 1: Ingestion - Hero Section */}
        {state === "ingestion" && (
          <>
            {/* Header with staggered entrance */}
            <div className="mb-16 text-center max-w-2xl">
              <div className="flex items-center justify-center mb-6 animate-fade-in-up-1">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
                  <Lock className="w-10 h-10 text-primary relative" strokeWidth={1.5} />
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4 animate-fade-in-up-2 tracking-tight">
                Vault
              </h1>
              <h2 className="text-xl md:text-2xl font-normal text-muted-foreground mb-6 animate-fade-in-up-3">
                Personal Data Sanitizer
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed animate-fade-in-up-3">
                Upload your documents. We find and redact sensitive data (Aadhaar, PAN, Phone Numbers) locally before you share them.
              </p>
            </div>

            {/* Upload Zone with premium styling */}
            <div className="w-full max-w-2xl animate-fade-in-up-3">
              <div
                className="border-2 border-dashed border-muted rounded-sm p-12 md:p-16 text-center cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(15,118,110,0.3)] hover:border-primary group"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="Upload document"
                />
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/5 rounded-full blur-lg group-hover:bg-primary/10 transition-all duration-300" />
                    <Lock className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors duration-300 relative" strokeWidth={1} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground mb-2">
                      Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (PDF, PNG, JPG • Max 10MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 text-center text-sm text-muted-foreground max-w-2xl animate-fade-in-up-3">
              <p>
                Your documents are processed locally and securely. No data is stored on our servers.
              </p>
            </div>
          </>
        )}

        {/* State 2: Processing - Document Scanner */}
        {state === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-8 max-w-2xl w-full">
            {/* Document Scanner Visualization */}
            <div className="relative w-32 h-40 mb-4">
              {/* Document wireframe */}
              <div className="absolute inset-0 border-2 border-muted rounded-sm flex flex-col p-3 gap-2">
                {/* Document lines */}
                <div className="h-2 bg-muted rounded-full w-3/4" />
                <div className="h-2 bg-muted rounded-full w-full" />
                <div className="h-2 bg-muted rounded-full w-5/6" />
                <div className="h-2 bg-muted rounded-full w-4/5" />
              </div>

              {/* Laser scan line */}
              <div className="absolute inset-0 overflow-hidden rounded-sm">
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-b from-primary via-primary to-transparent animate-laser-scan"
                  style={{
                    boxShadow: "0 0 8px rgba(15, 118, 110, 0.6)",
                  }}
                />
              </div>
            </div>

            {/* Cycling text with smooth fade */}
            <div className="h-8 flex items-center justify-center">
              <p className="text-lg text-foreground font-medium animate-text-fade">
                {processingSteps[currentStep].text}
              </p>
            </div>

            {/* File name */}
            <p className="text-sm text-muted-foreground font-mono text-center break-all max-w-xs">
              {fileName}
            </p>

            {/* Processing indicator */}
            <div className="flex items-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">Processing...</span>
            </div>
          </div>
        )}

        {/* State 3: Result - Premium Reveal */}
        {state === "result" && (
          <div className="flex flex-col items-center gap-8 animate-spring-pop max-w-2xl w-full">
            {/* Success message */}
            <div className="text-center">
              <div className="flex justify-center mb-4 relative">
                {/* Ripple effect */}
                {showRipple && (
                  <div
                    className="absolute animate-ripple-expand rounded-full border border-primary"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                )}

                {/* Success checkmark */}
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative z-10">
                  <svg
                    className="w-8 h-8 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Document Sanitized Successfully
              </h3>
              <p className="text-muted-foreground">
                {fileName}
              </p>
            </div>

            {/* Preview or document icon */}
            {sanitizedImage ? (
              <div className="w-full border border-border rounded-sm p-4 bg-secondary/30 overflow-hidden">
                <img
                  src={sanitizedImage}
                  alt="Sanitized document preview"
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
            ) : (
              <div className="w-full border border-border rounded-sm p-8 bg-secondary/30 flex items-center justify-center">
                <FileText className="w-16 h-16 text-muted-foreground opacity-50" strokeWidth={1} />
              </div>
            )}

            {/* Download button with premium styling */}
            <Button
              onClick={handleDownload}
              className="w-full bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground font-semibold py-3 rounded-sm text-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(15,118,110,0.2)] hover:shadow-[0_6px_16px_rgba(15,118,110,0.3)]"
            >
              <Download className="w-5 h-5" />
              Download Safe File
            </Button>

            {/* Reset link */}
            <button
              onClick={handleReset}
              className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 flex items-center gap-2 mt-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sanitize Another Document
            </button>
          </div>
        )}

        {/* State 4: Error */}
        {state === "error" && (
          <div className="flex flex-col items-center gap-6 py-12 max-w-2xl w-full">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Error Processing Document
              </h3>
              <p className="text-muted-foreground mb-6">
                Please make sure the backend server is running at http://localhost:8000
              </p>
            </div>
            <Button
              onClick={handleReset}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2 px-6 rounded-sm transition-colors duration-200"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
