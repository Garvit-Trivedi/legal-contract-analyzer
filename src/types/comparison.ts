export type ChangeSignificance = "high" | "medium" | "low";
export type ChangeType = "added" | "removed" | "modified";

export interface ComparisonEvidence {
  documentId: string;
  chunkIds: string[];
  quote?: string;
}

export interface ComparisonChange {
  topic: string;
  changeType: ChangeType;
  significance?: ChangeSignificance;
  explanation: string;
  documentA?: ComparisonEvidence;
  documentB?: ComparisonEvidence;
}

export interface ComparisonResult {
  summary: string;
  changes: ComparisonChange[];
}

export interface ComparisonRequest {
  documentAId: string;
  documentBId: string;
}
