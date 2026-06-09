import { NextRequest, NextResponse } from "next/server";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  weight?: number;
};

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function getPackageByQuantity(totalQuantity: number) {
  if (totalQuantity <= 1) {
    return {
      height: 4,
      width: 10,
      length: 15,
    };
  }

  if (totalQuantity <= 3) {
    return {
      height: 8,
      width: 20,
      length: 25,
    };
  }

  if (totalQuantity <= 6) {
    return {
      height: 12,
      width: 25,
      length: 35,
    };
  }

  return {
    height: 18,
    width: 30,
    length: 40,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { cepDestino, items } = await request.json();

    const token = process.env.MELHOR_ENVIO_TOKEN;
    const env = process.env.MELHOR_ENVIO_ENV || "sandbox";
    const fromPostalCode =
      process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || "21710320";

    if (!token) {
      return NextResponse.json(
        { error: "Token do Melhor Envio não configurado." },
        { status: 500 },
      );
    }

    const cleanCepDestino = onlyNumbers(String(cepDestino || ""));
    const cleanCepOrigem = onlyNumbers(fromPostalCode);

    if (cleanCepDestino.length !== 8) {
      return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
    }

    if (cleanCepOrigem.length !== 8) {
      return NextResponse.json(
        { error: "CEP de origem inválido." },
        { status: 400 },
      );
    }

    const cartItems = Array.isArray(items) ? (items as CartItem[]) : [];

    if (!cartItems.length) {
      return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
    }

    const totalQuantity = cartItems.reduce(
      (sum, item) => sum + Number(item.quantity || 1),
      0,
    );

    const totalWeight = Math.max(
      cartItems.reduce(
        (sum, item) =>
          sum + Number(item.weight || 0.15) * Number(item.quantity || 1),
        0,
      ),
      0.15,
    );

    const totalValue = cartItems.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0,
    );

    const packageSize = getPackageByQuantity(totalQuantity);

    const baseUrl =
      env === "sandbox"
        ? "https://sandbox.melhorenvio.com.br"
        : "https://melhorenvio.com.br";

    const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Defan Brecho (taisadefante@hotmail.com)",
      },
      body: JSON.stringify({
        from: {
          postal_code: cleanCepOrigem,
        },
        to: {
          postal_code: cleanCepDestino,
        },
        products: [
          {
            id: "carrinho",
            width: packageSize.width,
            height: packageSize.height,
            length: packageSize.length,
            weight: Number(totalWeight.toFixed(3)),
            insurance_value: Math.max(totalValue, 1),
            quantity: 1,
          },
        ],
        options: {
          receipt: false,
          own_hand: false,
          collect: false,
          insurance_value: Math.max(totalValue, 1),
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro Melhor Envio:", data);

      return NextResponse.json(
        {
          error: "Erro ao calcular frete.",
          details: data,
        },
        { status: response.status },
      );
    }

    const options = Array.isArray(data)
      ? data
          .filter((item) => !item.error && (item.price || item.custom_price))
          .map((item) => ({
            id: String(item.id),
            name: item.name || "Entrega",
            company: item.company?.name || "Transportadora",
            price: Number(item.price || item.custom_price || 0),
            deliveryTime:
              item.delivery_time || item.custom_delivery_time || null,
            currency: item.currency || "R$",
          }))
      : [];

    return NextResponse.json({
      options,
      package: {
        totalQuantity,
        totalWeight: Number(totalWeight.toFixed(3)),
        ...packageSize,
      },
    });
  } catch (error) {
    console.error("Erro API frete:", error);

    return NextResponse.json(
      { error: "Erro interno ao calcular frete." },
      { status: 500 },
    );
  }
}
