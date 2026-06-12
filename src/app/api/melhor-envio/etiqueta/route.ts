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
  id: string | number;
  name?: string;
  company?: string;
  price?: number;
  deliveryTime?: number | string | null;
};

type MelhorEnvioRequestBody = {
  action?: "simulate" | "generate";
  saleId?: string;
  customer?: MelhorEnvioCustomer;
  items?: MelhorEnvioItem[];
  shippingOption?: MelhorEnvioShippingOption;
};

function onlyNumbers(value?: string | number | null) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeState(value?: string) {
  return String(value || "").trim().toUpperCase();
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
  const total = items.reduce((sum, item) => {
    const weight = Number(item.weight || 0.15);
    const quantity = Number(item.quantity || 1);

    return sum + weight * quantity;
  }, 0);

  return Math.max(total, 0.15);
}

function getInsuranceValue(items: MelhorEnvioItem[]) {
  const total = items.reduce((sum, item) => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 1);

    return sum + price * quantity;
  }, 0);

  return Math.max(total, 1);
}

async function readJsonResponse(response: Response) {
  const rawText = await response.text();

  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return {
      raw: rawText || "Resposta vazia ou inválida.",
    };
  }
}

function errorResponse(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      details: details || null,
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MelhorEnvioRequestBody;

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

    const fromDocument = onlyNumbers(process.env.MELHOR_ENVIO_FROM_DOCUMENT);

    const fromAddress = process.env.MELHOR_ENVIO_FROM_ADDRESS || "";
    const fromNumber = process.env.MELHOR_ENVIO_FROM_NUMBER || "";
    const fromComplement = process.env.MELHOR_ENVIO_FROM_COMPLEMENT || "";
    const fromDistrict = process.env.MELHOR_ENVIO_FROM_DISTRICT || "";
    const fromCity = process.env.MELHOR_ENVIO_FROM_CITY || "Rio de Janeiro";
    const fromState = normalizeState(
      process.env.MELHOR_ENVIO_FROM_STATE || "RJ",
    );

    if (!token) {
      return errorResponse("MELHOR_ENVIO_TOKEN não configurado.", 500);
    }

    if (!fromDocument) {
      return errorResponse(
        "MELHOR_ENVIO_FROM_DOCUMENT não configurado. Informe CPF ou CNPJ do remetente somente com números.",
        500,
      );
    }

    if (fromDocument.length !== 11 && fromDocument.length !== 14) {
      return errorResponse(
        "MELHOR_ENVIO_FROM_DOCUMENT inválido. Use CPF com 11 números ou CNPJ com 14 números.",
        500,
      );
    }

    if (!fromAddress || !fromNumber || !fromDistrict || !fromCity || !fromState) {
      return errorResponse(
        "Dados de remetente incompletos. Configure endereço, número, bairro, cidade e estado do remetente.",
        500,
      );
    }

    if (fromPostalCode.length !== 8) {
      return errorResponse(
        "MELHOR_ENVIO_FROM_POSTAL_CODE inválido. Informe um CEP com 8 números.",
        500,
      );
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const customer = body.customer;
    const shippingOption = body.shippingOption;

    if (!items.length) {
      return errorResponse("Venda sem produtos.", 400);
    }

    if (!shippingOption?.id) {
      return errorResponse("Venda sem frete escolhido salvo.", 400);
    }

    if (!customer) {
      return errorResponse("Dados do cliente não enviados.", 400);
    }

    const toDocument = onlyNumbers(
      customer.document || customer.cpf || customer.cnpj,
    );

    if (!toDocument) {
      return errorResponse(
        "CPF ou CNPJ do destinatário não informado. Cadastre o documento do cliente antes de simular ou gerar etiqueta.",
        400,
      );
    }

    if (toDocument.length !== 11 && toDocument.length !== 14) {
      return errorResponse("CPF ou CNPJ do destinatário inválido.", 400);
    }

    const toPostalCode = onlyNumbers(customer.cep);
    const toState = normalizeState(customer.state);

    if (toPostalCode.length !== 8) {
      return errorResponse("CEP do cliente inválido ou não informado.", 400);
    }

    if (!customer.name || !customer.address || !customer.number) {
      return errorResponse(
        "Dados do cliente incompletos. Informe nome, endereço e número antes de gerar etiqueta.",
        400,
      );
    }

    if (!customer.district || !customer.city || !toState) {
      return errorResponse(
        "Dados do cliente incompletos. Informe bairro, cidade e estado.",
        400,
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
        complement: fromComplement,
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
        state_abbr: toState,
      },
      products: items.map((item) => ({
        name: item.name || "Produto",
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
        insurance_value: Number(insuranceValue.toFixed(2)),
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
      return errorResponse(
        "Erro ao adicionar etiqueta no carrinho do Melhor Envio.",
        cartResponse.status,
        cartData,
      );
    }

    const orderId = cartData?.id || cartData?.order?.id;

    if (!orderId) {
      return errorResponse(
        "Melhor Envio não retornou ID do pedido da etiqueta.",
        500,
        cartData,
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
      return errorResponse(
        "Etiqueta criada no carrinho, mas não foi possível comprar a etiqueta. Verifique saldo/permissões no Melhor Envio.",
        checkoutResponse.status,
        {
          orderId,
          checkoutData,
        },
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
      return errorResponse(
        "Etiqueta comprada, mas ainda não foi possível gerar. Tente imprimir novamente em alguns segundos.",
        generateResponse.status,
        {
          orderId,
          generateData,
        },
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
      return errorResponse(
        "Etiqueta gerada, mas não foi possível obter o link de impressão agora.",
        printResponse.status,
        {
          orderId,
          printData,
        },
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
    console.error("Erro interno Melhor Envio:", error);

    return errorResponse(
      "Erro interno ao gerar etiqueta.",
      500,
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack:
              process.env.NODE_ENV === "development" ? error.stack : undefined,
          }
        : String(error),
    );
  }
}