/**
 * PIIResultGrid — Responsive CSS Grid of PIIResultCard components.
 *
 * 2-column on desktop, 1-column on mobile with staggered fade-in.
 */

import { PIIType, type PIIResult } from "@/types";
import PIIResultCard from "./PIIResultCard";

interface PIIResultGridProps {
  piiResults: PIIResult[];
  onToggleMask?: (type: PIIType, revealed: boolean) => void;
}

export default function PIIResultGrid({
  piiResults,
  onToggleMask,
}: PIIResultGridProps) {
  if (piiResults.length === 0) {
    return (
      <div className="glass-card p-8 text-center animate-stagger-in">
        <p className="text-slate-400 text-sm">No PII detected in this document.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-stagger-in">
      {piiResults.map((result, index) => (
        <PIIResultCard
          key={result.type}
          result={result}
          index={index}
          onToggleMask={onToggleMask}
        />
      ))}
    </div>
  );
}
