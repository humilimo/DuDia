export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock: number;
  photo?: string;
  costPrice?: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
}

export type PaymentMethod = "pix" | "credito" | "debito" | "dinheiro";

export interface Sale {
  id: string;
  timestamp: number;
  value: number;
  productId?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  items?: SaleItem[];
  paymentMethod?: PaymentMethod;
  label: string;
}
