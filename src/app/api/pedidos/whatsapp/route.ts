import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type DeliveryOption =
  | "retirada_realengo"
  | "retirada_centro"
  | "retirada_estacao"
  | "envio_uber"
  | "envio_correio"
  | "envio_mercado_livre"
  | "envio_combinar";

type AddressPayload = {
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
};

type CartRequestItem = {
  id?: string;
  quantity?: number;
};

type RequestPayload = {
  customerName?: string;
  deliveryOption?: DeliveryOption;
  observation?: string;
  address?: AddressPayload | null;
  items?: CartRequestItem[];
};

type ProductDocument = Record<string, unknown>;

type SaleItem = ProductDocument & {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  stock: number;
  status: string;
  quantity: number;
  addedAt: number;
};

const DELIVERY_LABELS: Record<DeliveryOption, string> = {
  retirada_realengo: "Retirada em Realengo",
  retirada_centro: "Retirada no Centro",
  retirada_estacao: "Retirada na Estação",
  envio_uber: "Envio por Uber",
  envio_correio: "Envio pelos Correios",
  envio_mercado_livre: "Envio pelo Mercado Livre",
  envio_combinar: "Envio a combinar com a loja",
};

const ALLOWED_DELIVERY_OPTIONS = new Set<DeliveryOption>(
  Object.keys(DELIVERY_LABELS) as DeliveryOption[],
);

function onlyNumbers(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function text(value: unknown) {
  return String(value || "").trim();
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanObject(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (item === undefined) return;
      result[key] = cleanObject(item);
    });

    return result as T;
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const adminDb = getAdminDb();

    const body = (await request.json()) as RequestPayload;

    const customerName = text(body.customerName);
    const deliveryOption = body.deliveryOption;
    const observation = text(body.observation);

    if (!customerName) {
      return NextResponse.json(
        { error: "Informe o nome do cliente." },
        { status: 400 },
      );
    }

    if (
      !deliveryOption ||
      !ALLOWED_DELIVERY_OPTIONS.has(deliveryOption)
    ) {
      return NextResponse.json(
        { error: "Forma de entrega inválida." },
        { status: 400 },
      );
    }

    const requestedItems = Array.isArray(body.items) ? body.items : [];

    if (!requestedItems.length) {
      return NextResponse.json(
        { error: "O carrinho está vazio." },
        { status: 400 },
      );
    }

    const normalizedRequestedItems = requestedItems
      .map((item) => ({
        id: text(item.id),
        quantity: Math.max(Math.trunc(number(item.quantity) || 1), 1),
      }))
      .filter((item) => Boolean(item.id));

    if (!normalizedRequestedItems.length) {
      return NextResponse.json(
        { error: "Nenhum produto válido foi informado." },
        { status: 400 },
      );
    }

    const isShipping = deliveryOption.startsWith("envio_");
    const deliveryLabel = DELIVERY_LABELS[deliveryOption];
    const address = body.address || null;

    if (isShipping) {
      const cep = onlyNumbers(address?.cep);

      if (cep.length !== 8) {
        return NextResponse.json(
          { error: "Informe um CEP válido para o envio." },
          { status: 400 },
        );
      }

      if (
        !text(address?.address) ||
        !text(address?.number) ||
        !text(address?.district) ||
        !text(address?.city) ||
        !text(address?.state)
      ) {
        return NextResponse.json(
          { error: "Preencha o endereço completo para o envio." },
          { status: 400 },
        );
      }
    }

    /*
     * Busca os produtos no Firestore para usar sempre os dados reais
     * cadastrados no sistema, principalmente preço, custo e estoque.
     *
     * IMPORTANTE:
     * esta rota APENAS consulta o estoque.
     * Ela NÃO diminui, NÃO reserva e NÃO altera o produto.
     */
    const productSnapshots = await Promise.all(
      normalizedRequestedItems.map((item) =>
        adminDb.collection("products").doc(item.id).get(),
      ),
    );

    const saleItems: SaleItem[] = normalizedRequestedItems.map(
      (requestedItem, index) => {
        const snapshot = productSnapshots[index];

        if (!snapshot || !snapshot.exists) {
          throw new Error(
            `O produto ${requestedItem.id} não foi encontrado.`,
          );
        }

        const product = (snapshot.data() || {}) as ProductDocument;

        const productName = text(product.name) || requestedItem.id;
        const productPrice = number(product.price);
        const productCostPrice = number(product.costPrice);
        const productStock = Math.max(number(product.stock), 0);
        const productStatus = text(product.status);

        if (requestedItem.quantity > productStock) {
          throw new Error(
            `O produto "${productName}" possui somente ${productStock} unidade(s) disponível(is).`,
          );
        }

        if (productStatus === "vendido" || productStock <= 0) {
          throw new Error(
            `O produto "${productName}" não está mais disponível.`,
          );
        }

        /*
         * price e costPrice são declarados explicitamente.
         * Isso corrige o erro do build:
         * "Property 'price' does not exist..."
         */
        const saleItem: SaleItem = {
          ...product,
          id: snapshot.id,
          name: productName,
          price: productPrice,
          costPrice: productCostPrice,
          stock: productStock,
          status: productStatus,
          quantity: requestedItem.quantity,
          addedAt: Date.now(),
        };

        return cleanObject(saleItem);
      },
    );

    const subtotal = saleItems.reduce((sum, item) => {
      const quantity = Math.max(number(item.quantity), 1);
      return sum + item.price * quantity;
    }, 0);

    const productsCost = saleItems.reduce((sum, item) => {
      const quantity = Math.max(number(item.quantity), 1);
      return sum + item.costPrice * quantity;
    }, 0);

    const customer = {
      name: customerName,
      email: "",
      phone: "",
      document: "",
      cep: isShipping ? onlyNumbers(address?.cep) : "",
      address: isShipping ? text(address?.address) : "",
      number: isShipping ? text(address?.number) : "",
      complement: isShipping ? text(address?.complement) : "",
      district: isShipping ? text(address?.district) : "",
      city: isShipping ? text(address?.city) : "",
      state: isShipping ? text(address?.state).toUpperCase() : "",
    };

    const shippingAddress = isShipping
      ? {
          id: "checkout-whatsapp",
          userId: "whatsapp_guest",
          name: "Endereço informado no carrinho",
          recipientName: customerName,
          phone: "",
          cep: onlyNumbers(address?.cep),
          address: text(address?.address),
          number: text(address?.number),
          complement: text(address?.complement),
          district: text(address?.district),
          city: text(address?.city),
          state: text(address?.state).toUpperCase(),
          isDefault: false,
        }
      : null;

    const shippingOption = {
      id: deliveryOption,
      name: deliveryLabel,
      company: isShipping ? "Entrega a combinar" : "Retirada",
      price: 0,
      deliveryTime: null,
      currency: "BRL",
    };

    const now = Date.now();

    const saleData = cleanObject({
      userId: "whatsapp_guest",

      customer,
      shippingAddress,
      items: saleItems,

      subtotal,
      deliveryType: isShipping ? "envio" : "retirada",
      deliveryPrice: 0,
      shippingOption,
      total: subtotal,

      productsRevenue: subtotal,
      productsCost,
      shippingRevenue: 0,
      shippingCostPaidByStore: 0,
      shippingCost: 0,
      grossProfit: subtotal - productsCost,
      netProfit: subtotal - productsCost,

      status: "aguardando_pagamento",

      createdAt: now,
      updatedAt: now,

      paymentUrl: "",
      mercadoPagoPreferenceId: "",
      paymentGeneratedAt: 0,

      melhorEnvioOrderId: "",
      melhorEnvioPrintUrl: "",
      trackingCode: "",

      /*
       * Venda originada pelo carrinho/WhatsApp.
       * Ela aparece normalmente em Vendas,
       * mas NÃO altera estoque.
       */
      inventoryProcessed: false,
      inventoryRestored: false,
      manageStock: false,

      saleSource: "whatsapp_cart",
      deliveryMethodLabel: deliveryLabel,

      observation,
      internalNotes: "",
      completedAt: null,
    });

    const saleRef = await adminDb.collection("sales").add(saleData);

    return NextResponse.json({
      ok: true,
      saleId: saleRef.id,
    });
  } catch (error) {
    console.error("Erro ao criar pedido do WhatsApp:", error);

    return NextResponse.json(
      {
        error: "Não foi possível registrar o pedido.",
        details:
          error instanceof Error
            ? error.message
            : "Erro interno desconhecido.",
      },
      { status: 500 },
    );
  }
}
