export enum ProcessingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface DarfLineItem {
  code: string;
  description?: string;
  principal: number;
  multa: number;
  juros: number;
  total: number;
}

export interface DarfResult {
  headerTotal: number; // The total stated in the document header
  items: DarfLineItem[]; // Extracted line items
}

export interface DarfDocument {
  id: string;
  file: File;
  fileName: string;
  uploadTimestamp: number;
  status: ProcessingStatus;
  result?: DarfResult;
  calculatedTotal?: number; // Sum of items.total
  errorMessage?: string;
}

export interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}