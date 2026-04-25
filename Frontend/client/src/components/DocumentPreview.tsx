/**
 * DocumentPreview — Large frosted-glass panel displaying the original/sanitized document.
 *
 * Features:
 * - Header bar with filename and download button (teal accent)
 * - Smooth crossfade for image transitions
 * - Responsive sizing
 */

import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
  imageUrl: string | null;
  fileName: string;
  onDownload?: () => void;
}

export default function DocumentPreview({
  imageUrl,
  fileName,
  onDownload,
}: DocumentPreviewProps) {
  return (
    <div className="glass-panel flex flex-col h-full animate-stagger-in overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-slate-200 truncate" title={fileName}>
            {fileName}
          </p>
        </div>

        {onDownload && (
          <Button
            onClick={onDownload}
            size="sm"
            className="bg-[#0F766E] hover:bg-[#0F766E]/80 text-white text-xs gap-1.5 rounded-lg shadow-[0_2px_8px_rgba(15,118,110,0.25)] hover:shadow-[0_4px_12px_rgba(15,118,110,0.35)] transition-all duration-200 flex-shrink-0"
            id="download-safe-file-btn"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
        )}
      </div>

      {/* Document Image */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto glass-scrollbar">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Sanitized document preview"
            className="max-w-full max-h-full object-contain rounded-lg transition-opacity duration-500"
            style={{ opacity: 1 }}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <FileText className="w-16 h-16 opacity-30" strokeWidth={1} />
            <p className="text-sm">No preview available</p>
          </div>
        )}
      </div>
    </div>
  );
}
