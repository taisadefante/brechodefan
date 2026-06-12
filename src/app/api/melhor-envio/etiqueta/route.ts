import { NextRequest, NextResponse } from "next/server";

type MelhorEnvioItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  weight?: number;
};

type MelhorEnvioCustomer = {
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  cpf?: string;
  cnpj?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
};

type MelhorEnvioShippingOption = {
  id: string;
  name?: string;
  company?: string;
  price?: number;
  deliveryTime?: number | string | null;
};

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function getBaseUrl() {
  return process.env.MELHOR_ENVIO_ENV === "sandbox"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

function getPackage(items: MelhorEnvioItem[]) {
  const quantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0,
  );

  if (quantity <= 1) return { width: 10, height: 4, length: 15 };
  if (quantity <= 3) return { width: 20, height: 8, length: 25 };
  if (quantity <= 6) return { width: 25, height: 12, length: 35 };

  return { width: 30, height: 18, length: 40 };
}

function getWeight(items: MelhorEnvioItem[]) {
  const total = items.reduce(
    (sum, item) =>
      sum + Number(item.weight || 0.15) * Number(item.quantity || 1),
    0,
  );

  return Math.max(total, 0.15);
}

function getInsuranceValue(items: MelhorEnvioItem[]) {
  const total = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0,
  );

  return Math.max(total, 1);
}

async function readJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return { raw: rawText };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action === "generate" ? "generate" : "simulate";

    const token = process.env.MELHOR_ENVIO_TOKEN;

    const fromPostalCode = onlyNumbers(
      process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || "21710320",
    );

    const fromName = process.env.MELHOR_ENVIO_FROM_NAME || "Defan Brechó";
    const fromPhone = onlyNumbers(
      process.env.MELHOR_ENVIO_FROM_PHONE || "21988359825",
    );
    const fromEmail =
      process.env.MELHOR_ENVIO_FROM_EMAIL || "taisadefante@hotmail.com";

    const fromDocument = onlyNumbers(
      process.env.MELHOR_ENVIO_FROM_DOCUMENT || "",
    );

    const fromAddress = process.env.MELHOR_ENVIO_FROM_ADDRESS || "";
    const fromNumber = process.env.MELHOR_ENVIO_FROM_NUMBER || "";
    const fromDistrict = process.env.MELHOR_ENVIO_FROM_DISTRICT || "";
    const fromCity = process.env.MELHOR_ENVIO_FROM_CITY || "Rio de Janeiro";
    const fromState = process.env.MELHOR_ENVIO_FROM_STATE || "RJ";

    if (!token) {
      return NextResponse.json(
        { error: "MELHOR_ENVIO_TOKEN não configurado." },
        { status: 500 },
      );
    }

    if (!fromDocument) {
      return NextResponse.json(
        {
          error:
            "MELHOR_ENVIO_FROM_DOCUMENT não configurado. Informe CPF ou CNPJ do remetente somente com números.",
        },
        { status: 500 },
      );
    }

    const items = Array.isArray(body.items)
      ? (body.items as MelhorEnvioItem[])
      : [];

    const customer = body.customer as MelhorEnvioCustomer;
    const shippingOption = body.shippingOption as MelhorEnvioShippingOption;

    const toDocument = onlyNumbers(
      customer?.document || customer?.cpf || customer?.cnpj || "",
    );

    if (!items.length) {
      return NextResponse.json(
        { error: "Venda sem produtos." },
        { status: 400 },
      );
    }

    if (!shippingOption?.id) {
      return NextResponse.json(
        { error: "Venda sem frete escolhido salvo." },
        { status: 400 },
      );
    }

    if (!toDocument) {
      return NextResponse.json(
        {
          error:
            "CPF ou CNPJ do destinatário não informado. Cadastre o documento do cliente antes de simular ou gerar etiqueta.",
        },
        { status: 400 },
      );
    }

    if (toDocument.length !== 11 && toDocument.length !== 14) {
      return NextResponse.json(
        {
          error: "CPF ou CNPJ do destinatário inválido.",
        },
        { status: 400 },
      );
    }

    const toPostalCode = onlyNumbers(customer?.cep || "");

    if (toPostalCode.length !== 8) {
      return NextResponse.json(
        { error: "CEP do cliente inválido ou não informado." },
        { status: 400 },
      );
    }

    if (!customer?.name || !customer?.address || !customer?.number) {
      return NextResponse.json(
        {
          error:
            "Dados do cliente incompletos. Informe nome, endereço e número antes de gerar etiqueta.",
        },
        { status: 400 },
      );
    }

    if (!customer?.district || !customer?.city || !customer?.state) {
      return NextResponse.json(
        {
          error:
            "Dados do cliente incompletos. Informe bairro, cidade e estado.",
        },
        { status: 400 },
      );
    }

    if (!fromAddress || !fromNumber || !fromDistrict) {
      return NextResponse.json(
        {
          error:
            "Dados de remetente incompletos. Configure endereço, número e bairro do remetente.",
        },
        { status: 500 },
      );
    }

    const baseUrl = getBaseUrl();
    const packageSize = getPackage(items);
    const weight = getWeight(items);
    const insuranceValue = getInsuranceValue(items);

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Defan Brecho (taisadefante@hotmail.com)",
    };

    const cartPayload = {
      service: Number(shippingOption.id),
      agency: null,
      from: {
        name: fromName,
        phone: fromPhone,
        email: fromEmail,
        document: fromDocument.length === 11 ? fromDocument : "",
        company_document: fromDocument.length === 14 ? fromDocument : "",
        state_register: "",
        address: fromAddress,
        complement: "",
        number: fromNumber,
        district: fromDistrict,
        city: fromCity,
        country_id: "BR",
        postal_code: fromPostalCode,
        note: "",
        state_abbr: fromState,
      },
      to: {
        name: customer.name,
        phone: onlyNumbers(customer.phone || fromPhone),
        email: customer.email || fromEmail,
        document: toDocument.length === 11 ? toDocument : "",
        company_document: toDocument.length === 14 ? toDocument : "",
        state_register: "",
        address: customer.address,
        complement: customer.complement || "",
        number: customer.number,
        district: customer.district,
        city: customer.city,
        country_id: "BR",
        postal_code: toPostalCode,
        note: "",
        state_abbr: customer.state,
      },
      products: items.map((item) => ({
        name: item.name,
        quantity: Number(item.quantity || 1),
        unitary_value: Number(item.price || 0),
      })),
      volumes: [
        {
          height: packageSize.height,
          width: packageSize.width,
          length: packageSize.length,
          weight: Number(weight.toFixed(3)),
        },
      ],
      options: {
        insurance_value: insuranceValue,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        invoice: {
          key: "",
        },
        platform: "Defan Brechó",
        tags: [
          {
            tag: String(body.saleId || "defan-brecho"),
            url: "",
          },
        ],
      },
    };

    const cartResponse = await fetch(`${baseUrl}/api/v2/me/cart`, {
      method: "POST",
      headers,
      body: JSON.stringify(cartPayload),
    });

    const cartData = await readJsonResponse(cartResponse);

    if (!cartResponse.ok) {
      return NextResponse.json(
        {
          error: "Erro ao adicionar etiqueta no carrinho do Melhor Envio.",
          details: cartData,
          sentPayload: cartPayload,
        },
        { status: cartResponse.status },
      );
    }

    const orderId = cartData?.id || cartData?.order?.id;

    if (!orderId) {
      return NextResponse.json(
        {
          error: "Melhor Envio não retornou ID do pedido da etiqueta.",
          details: cartData,
        },
        { status: 500 },
      );
    }

    if (action === "simulate") {
      return NextResponse.json({
        success: true,
        simulation: true,
        message:
          "Simulação concluída. A etiqueta foi adicionada ao carrinho, mas NÃO foi comprada.",
        orderId,
        cart: cartData,
      });
    }

    const checkoutResponse = await fetch(
      `${baseUrl}/api/v2/me/shipment/checkout`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          orders: [orderId],
        }),
      },
    );

    const checkoutData = await readJsonResponse(checkoutResponse);

    if (!checkoutResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Etiqueta criada no carrinho, mas não foi possível comprar a etiqueta. Verifique saldo/permissões no Melhor Envio.",
          orderId,
          details: checkoutData,
        },
        { status: checkoutResponse.status },
      );
    }

    const generateResponse = await fetch(
      `${baseUrl}/api/v2/me/shipment/generate`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          orders: [orderId],
        }),
      },
    );

    const generateData = await readJsonResponse(generateResponse);

    if (!generateResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Etiqueta comprada, mas ainda não foi possível gerar. Tente imprimir novamente em alguns segundos.",
          orderId,
          details: generateData,
        },
        { status: generateResponse.status },
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));

    const printResponse = await fetch(`${baseUrl}/api/v2/me/shipment/print`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: "private",
        orders: [orderId],
      }),
    });

    const printData = await readJsonResponse(printResponse);

    if (!printResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Etiqueta gerada, mas não foi possível obter o link de impressão agora.",
          orderId,
          details: printData,
        },
        { status: printResponse.status },
      );
    }

    const printUrl =
      printData?.url ||
      printData?.link ||
      printData?.data?.url ||
      printData?.data?.link ||
      "";

    return NextResponse.json({
      success: true,
      simulation: false,
      orderId,
      printUrl,
      cart: cartData,
      checkout: checkoutData,
      generate: generateData,
      print: printData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro interno ao gerar etiqueta.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}