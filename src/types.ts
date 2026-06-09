export type ProductStatus =
  | "disponivel"
  | "reservado"
  | "vendido"
  | "arquivado";

export type SaleStatus =
  | "aguardando_pagamento"
  | "pago"
  | "separando"
  | "pronto_retirada"
  | "enviado"
  | "entregue"
  | "cancelamento_solicitado"
  | "cancelado";

export type DeliveryType = "retirada" | "combinar_whatsapp" | "envio";

export type ShippingProfile = "leve" | "medio" | "kit";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  size: string;
  age: string;
  color: string;
  gender: string;
  brand?: string;
  condition: string;
  measurements?: string;
  stock: number;
  shippingProfile?: ShippingProfile | "";
  weight: number;
  height: number;
  width: number;
  length: number;
  images: string[];
  status: ProductStatus;
  reservedUntil?: number | null;
  createdAt?: number;
  updatedAt?: number;
  soldAt?: number | null;
};

export type OptionType =
  | "categorias"
  | "tamanhos"
  | "idades"
  | "cores"
  | "sexos"
  | "condicoes"
  | "marcas";

export type CustomerData = {
  name: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export type CartItem = Product & {
  quantity?: number;
  addedAt: number;
};

export type ShippingOption = {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryTime: number | string | null;
  currency?: string;
};

export type Sale = {
  id: string;
  userId: string;
  customer: CustomerData;
  items: CartItem[];
  subtotal: number;
  deliveryType: DeliveryType;
  shippingOption?: ShippingOption | null;
  deliveryPrice: number;
  total: number;
  status: SaleStatus;
  trackingCode?: string;
  cancelRequested?: boolean;
  cancelReason?: string;
  createdAt: number;
  updatedAt: number;
  paymentUrl?: string;
  mercadoPagoPreferenceId?: string;
};
