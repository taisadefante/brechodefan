import { NextRequest, NextResponse } from "next/server";

function baseUrl() {
  return process.env.MELHOR_ENVIO_ENV === "sandbox"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    const token = process.env.MELHOR_ENVIO_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: "Token do Melhor Envio não configurado." },
        { status: 500 },
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: "ID da etiqueta não informado." },
        { status: 400 },
      );
    }

    const checkoutResponse = await fetch(
      `${baseUrl()}/api/v2/me/shipment/checkout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Defan Brecho (taisadefante@hotmail.com)",
        },
        body: JSON.stringify({
          orders: [orderId],
        }),
      },
    );

    const checkoutData = await checkoutResponse.json();

    if (!checkoutResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Erro ao comprar a etiqueta. Verifique saldo e permissões no Melhor Envio.",
          details: checkoutData,
        },
        { status: checkoutResponse.status },
      );
    }

    const generateResponse = await fetch(
      `${baseUrl()}/api/v2/me/shipment/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Defan Brecho (taisadefante@hotmail.com)",
        },
        body: JSON.stringify({
          orders: [orderId],
        }),
      },
    );

    const generateData = await generateResponse.json();

    if (!generateResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao gerar impressão da etiqueta.", details: generateData },
        { status: generateResponse.status },
      );
    }

    const printResponse = await fetch(`${baseUrl()}/api/v2/me/shipment/print`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Defan Brecho (taisadefante@hotmail.com)",
      },
      body: JSON.stringify({
        mode: "private",
        orders: [orderId],
      }),
    });

    const printData = await printResponse.json();

    if (!printResponse.ok) {
      return NextResponse.json(
        { error: "Erro ao imprimir etiqueta.", details: printData },
        { status: printResponse.status },
      );
    }

    const printUrl =
      printData.url ||
      printData.link ||
      printData.data?.url ||
      printData.data?.link ||
      "";

    return NextResponse.json({
      success: true,
      printUrl,
      checkout: checkoutData,
      generate: generateData,
      print: printData,
    });
  } catch (error) {
    console.error("Erro imprimir etiqueta:", error);

    return NextResponse.json(
      { error: "Erro interno ao imprimir etiqueta." },
      { status: 500 },
    );
  }
}