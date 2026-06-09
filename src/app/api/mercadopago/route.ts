import { NextResponse } from "next/server";
import { CartItem, CustomerData } from "@/types";

export async function POST(req: Request) {
  try {
    const { items, deliveryPrice, customer } = await req.json() as {
      items: CartItem[];
      deliveryPrice: number;
      customer: CustomerData;
    };

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    if (!accessToken) {
      return NextResponse.json({
        id: "",
        init_point: "",
        message: "MERCADO_PAGO_ACCESS_TOKEN não configurado."
      });
    }

    const mpItems = items.map((item) => ({
      title: item.name,
      quantity: 1,
      currency_id: "BRL",
      unit_price: Number(item.price || 0)
    }));

    if (deliveryPrice > 0) {
      mpItems.push({
        title: "Entrega",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(deliveryPrice)
      });
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        items: mpItems,
        payer: {
          name: customer?.name || "",
          email: customer?.email || ""
        },
        back_urls: {
          success: `${siteUrl}/minha-conta?pagamento=sucesso`,
          failure: `${siteUrl}/carrinho?pagamento=falha`,
          pending: `${siteUrl}/minha-conta?pagamento=pendente`
        },
        auto_return: "approved"
      })
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar preferência Mercado Pago." }, { status: 500 });
  }
}
