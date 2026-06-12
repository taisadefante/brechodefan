import { NextResponse } from "next/server";
import { CartItem, CustomerData } from "@/types";

type MercadoPagoRequest = {
  items: CartItem[];
  deliveryPrice: number;
  customer: CustomerData & {
    document?: string;
  };
  saleId?: string;
};

export async function POST(req: Request) {
  try {
    const { items, deliveryPrice, customer, saleId } =
      (await req.json()) as MercadoPagoRequest;

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!accessToken) {
      return NextResponse.json(
        { error: "MERCADOPAGO_ACCESS_TOKEN não configurado." },
        { status: 500 },
      );
    }

    if (!items?.length) {
      return NextResponse.json(
        { error: "Carrinho vazio." },
        { status: 400 },
      );
    }

    const mpItems = items.map((item) => ({
      id: item.id,
      title: item.name,
      quantity: Number(item.quantity || 1),
      currency_id: "BRL",
      unit_price: Number(item.price || 0),
    }));

    if (Number(deliveryPrice || 0) > 0) {
      mpItems.push({
        id: "frete",
        title: "Frete",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(deliveryPrice || 0),
      });
    }

    const isLocalhost =
      siteUrl.includes("localhost") || siteUrl.includes("127.0.0.1");

    const preferenceBody: Record<string, unknown> = {
      items: mpItems,
      payer: {
        name: customer?.name || "",
        email: customer?.email || "",
        identification: customer?.document
          ? {
              type: "CPF",
              number: customer.document,
            }
          : undefined,
      },
      external_reference: saleId || "",
      back_urls: {
        success: `${siteUrl}/minha-conta?pagamento=sucesso`,
        failure: `${siteUrl}/carrinho?pagamento=falha`,
        pending: `${siteUrl}/minha-conta?pagamento=pendente`,
      },
      statement_descriptor: "DEFAN BRECHO",
    };

    if (!isLocalhost) {
      preferenceBody.auto_return = "approved";
    }

    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preferenceBody),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Mercado Pago:", data);

      return NextResponse.json(
        {
          error: "Erro ao criar preferência Mercado Pago.",
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      id: data.id || "",
      init_point: data.init_point || "",
      sandbox_init_point: data.sandbox_init_point || "",
    });
  } catch (error) {
    console.error("Erro ao criar preferência Mercado Pago:", error);

    return NextResponse.json(
      { error: "Erro ao criar preferência Mercado Pago." },
      { status: 500 },
    );
  }
}