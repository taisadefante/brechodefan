export type ProductStatus =
  | "disponivel"
  | "reservado"
  | "vendido"
  | "arquivado";

export type SaleStatus =
  | "aguardando_pagamento"
  | "pago"
  | "separando"
  | "pronto_envio"
  | "pronto_retirada"
  | "enviado"
  | "entregue"
  | "cancelamento_solicitado"
  | "devolucao_aprovada"
  | "aguardando_retorno"
  | "produto_recebido"
  | "cancelado";

export type DeliveryType = "retirada" | "combinar_whatsapp" | "envio";

export type ShippingProfile = "leve" | "medio" | "kit";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice?: number;
  category: string;
  type?: string;
  subtype?: string;
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
  | "tipos"
  | "subtipos"
  | "tamanhos"
  | "idades"
  | "cores"
  | "sexos"
  | "condicoes"
  | "marcas";

export type OptionDoc = {
  id: string;
  name: string;
  parentCategory?: string;
  parentType?: string;
};

export type CustomerData = {
  name: string;
  email: string;
  phone: string;
  document?: string;
  cpf?: string;
  cnpj?: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

export type CustomerAddress = {
  id: string;
  userId: string;
  name: string;
  recipientName: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  isDefault?: boolean;
  createdAt?: number;
  updatedAt?: number;
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
  shippingAddress?: CustomerAddress | null;
  items: CartItem[];

  subtotal: number;
  deliveryType: DeliveryType;
  shippingOption?: ShippingOption | null;
  deliveryPrice: number;
  total: number;

  productsRevenue?: number;
  productsCost?: number;
  shippingRevenue?: number;
  shippingCostPaidByStore?: number;
  shippingCost?: number;
  grossProfit?: number;
  netProfit?: number;

  status: SaleStatus;
  trackingCode?: string;

  cancelRequested?: boolean;
  cancelReason?: string;
  cancelRequestedAt?: number;
  cancelApproved?: boolean;
  cancelApprovedAt?: number;
  canceledAt?: number;

  melhorEnvioOrderId?: string;
  melhorEnvioPrintUrl?: string;
  melhorEnvioTrackingCode?: string;
  melhorEnvioStatus?: string;

  reverseRequested?: boolean;
  reverseReason?: string;
  reverseRequestedAt?: number;
  reverseApprovedAt?: number;
  reverseOrderId?: string;
  reversePrintUrl?: string;
  reverseTrackingCode?: string;
  reverseStatus?: string;
  reverseInstructions?: string;
  returnReceivedAt?: number;

  inventoryProcessed?: boolean;
  inventoryRestored?: boolean;

  createdAt: number;
  updatedAt: number;
  paymentUrl?: string;
  mercadoPagoPreferenceId?: string;
  paymentGeneratedAt?: number;
};
