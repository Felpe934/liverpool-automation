export interface UIProduct {
  name: string;
  price: string;
}

export interface ApiProduct {
  id: string;
  title: string;
  price: string; // normalizado, ej: "$13999.00"
}

export interface ValidationResult {
  matched: number;
  total: number;
  discrepancies: string[];
}