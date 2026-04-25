/* ─────────────────────────────────────────────────────
   PII Detection Types for the Vault Sanitizer
   ───────────────────────────────────────────────────── */

export enum PIIType {
  AADHAAR = "AADHAAR",
  PAN = "PAN",
  PHONE = "PHONE",
  EMAIL = "EMAIL",
  NAME = "NAME",
  ADDRESS = "ADDRESS",
  DOB = "DOB",
}

export interface PIIPosition {
  page: number;
  bbox: number[];
}

export interface PIIResult {
  type: PIIType;
  label: string;
  value: string;
  maskedValue: string;
  count: number;
  positions: PIIPosition[];
}

export type RiskLevel = "low" | "medium" | "high";

export interface AnalysisResult {
  fileName: string;
  piiResults: PIIResult[];
  sanitizedImageUrl: string;
  originalImageUrl: string;
  totalPIICount: number;
  riskLevel: RiskLevel;
}
