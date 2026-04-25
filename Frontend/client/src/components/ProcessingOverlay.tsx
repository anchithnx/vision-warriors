/**
 * ProcessingOverlay — Full-screen glass overlay during document analysis.
 *
 * Features:
 * - Laser line sweep over a document wireframe
 * - Cycling step indicator text with fade transitions
 * - SVG progress ring with animated stroke-dashoffset
 */

import { useEffect, useState } from "react";

interface ProcessingStep {
  text: string;
}

const steps: ProcessingStep[] = [
  { text: "Scanning with OCR…" },
  { text: "Detecting PII…" },
  { text: "Redacting sensitive data…" },
];

interface ProcessingOverlayProps {
  fileName: string;
}

export default function ProcessingOverlay({ fileName }: ProcessingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" id="processing-overlay">
      {/* Glass backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        {/* Document wireframe with laser sweep */}
        <div className="relative w-36 h-48 mb-2">
          {/* Document outline */}
          <div className="absolute inset-0 rounded-xl border border-white/[0.12] bg-white/[0.04] flex flex-col p-4 gap-2.5">
            {/* Simulated text lines */}
            <div className="h-2.5 bg-white/[0.08] rounded-full w-3/4" />
            <div className="h-2.5 bg-white/[0.08] rounded-full w-full" />
            <div className="h-2.5 bg-white/[0.08] rounded-full w-5/6" />
            <div className="h-2.5 bg-white/[0.08] rounded-full w-4/5" />
            <div className="h-2.5 bg-white/[0.08] rounded-full w-2/3" />
            <div className="h-2.5 bg-white/[0.08] rounded-full w-full" />
          </div>

          {/* Laser sweep line */}
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <div
              className="absolute left-0 right-0 h-[2px] animate-laser-sweep"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, #0F766E 30%, #5EEAD4 50%, #0F766E 70%, transparent 100%)",
                boxShadow:
                  "0 0 12px rgba(15, 118, 110, 0.6), 0 0 24px rgba(15, 118, 110, 0.3)",
              }}
            />
          </div>
        </div>

        {/* Progress ring */}
        <div className="relative w-16 h-16">
          <svg
            className="w-16 h-16 -rotate-90"
            viewBox="0 0 100 100"
          >
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="4"
            />
            {/* Animated progress ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#0F766E"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="283"
              className="animate-progress-ring"
              style={{ filter: "drop-shadow(0 0 4px rgba(15, 118, 110, 0.5))" }}
            />
          </svg>
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E] animate-pulse" />
          </div>
        </div>

        {/* Step indicator text */}
        <div className="h-8 flex items-center justify-center">
          <p
            key={currentStep}
            className="text-lg text-slate-200 font-medium animate-text-fade"
          >
            {steps[currentStep].text}
          </p>
        </div>

        {/* File name */}
        <p className="text-xs text-slate-500 font-mono text-center break-all max-w-xs">
          {fileName}
        </p>
      </div>
    </div>
  );
}
