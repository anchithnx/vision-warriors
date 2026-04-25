/**
 * PIIResultCard — Individual frosted-glass card for a single PII detection type.
 *
 * Shows icon, type label, count badge, masked/revealed value, and a toggle switch.
 * Uses the existing Radix Switch component styled with teal accent.
 */

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { PIIType, type PIIResult } from "@/types";
import {
  CreditCard,
  Phone,
  Mail,
  User,
  MapPin,
  Calendar,
  Shield,
  Fingerprint,
} from "lucide-react";

interface PIIResultCardProps {
  result: PIIResult;
  index: number;
  onToggleMask?: (type: PIIType, revealed: boolean) => void;
}

/** Map each PII type to an icon component */
const iconMap: Record<PIIType, React.ElementType> = {
  [PIIType.AADHAAR]: Fingerprint,
  [PIIType.PAN]: CreditCard,
  [PIIType.PHONE]: Phone,
  [PIIType.EMAIL]: Mail,
  [PIIType.NAME]: User,
  [PIIType.ADDRESS]: MapPin,
  [PIIType.DOB]: Calendar,
};

/** Fallback icon for unknown types */
const DefaultIcon = Shield;

export default function PIIResultCard({
  result,
  index,
  onToggleMask,
}: PIIResultCardProps) {
  const [revealed, setRevealed] = useState(false);
  const Icon = iconMap[result.type] || DefaultIcon;

  const handleToggle = (checked: boolean) => {
    setRevealed(checked);
    onToggleMask?.(result.type, checked);
  };

  return (
    <div
      className="glass-card-hover p-5 animate-card-entrance"
      style={{ animationDelay: `${index * 80}ms` }}
      id={`pii-card-${result.type.toLowerCase()}`}
    >
      {/* Card Header: Icon + Label + Count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.07]">
            <Icon className="w-[18px] h-[18px] text-slate-300" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100 leading-tight">
              {result.label}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {result.type}
            </p>
          </div>
        </div>

        {/* Count badge — teal accent when > 0 */}
        <div
          className={`
            min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center text-xs font-bold
            ${
              result.count > 0
                ? "bg-[#0F766E]/20 text-[#5EEAD4] border border-[#0F766E]/30"
                : "bg-white/[0.06] text-slate-400 border border-white/10"
            }
          `}
        >
          {result.count}
        </div>
      </div>

      {/* Value display */}
      <div className="mb-4 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2.5">
        <p
          className={`text-sm font-mono break-all transition-all duration-300 ${
            revealed ? "text-slate-200" : "text-slate-400"
          }`}
        >
          {revealed ? result.value : result.maskedValue}
        </p>
      </div>

      {/* Toggle: Mask ↔ Reveal */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {revealed ? "Revealed" : "Masked"}
        </span>
        <Switch
          checked={revealed}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-[#0F766E]"
          aria-label={`Toggle mask for ${result.label}`}
        />
      </div>
    </div>
  );
}
