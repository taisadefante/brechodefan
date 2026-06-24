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

type MelhorEnvioReverseRequestBody = {
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

function getReverseCode(data: any) {
  return (
    data?.reverse_code ||
    data?.code ||
    data?.authorization_code ||
    data?.tracking ||
    data?.tracking_code ||
    data?.order?.reverse_code ||
    data?.order?.code ||
    data?.data?.reverse_code ||
    data?.data?.code ||
    ""
  );
}

function getPrintUrl(data: any) {
  return (
    data?.url ||
    data?.link ||
    data?.print_url ||
    data?.data?.url ||
    data?.data?.link ||
    data?.data?.print_url ||
    ""
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MelhorEnvioReverseRequestBody;

    const action = body.action === "generate" ? "generate" : "simulate";

    const token = process.env.MELHOR_ENVIO_TOKEN;

    const storePostalCode = onlyNumbers(
      process.env.MELHOR_ENVIO_FROM_POSTAL_CODE || "21710320",
    );

    const storeName = process.env.MELHOR_ENVIO_FROM_NAME || "Defan Brechó";
    const storePhone = onlyNumbers(
      process.env.MELHOR_ENVIO_FROM_PHONE || "21988359825",
    );
    const storeEmail =
      process.env.MELHOR_ENVIO_FROM_EMAIL || "taisadefante@hotmail.com";

    const storeDocument = onlyNumbers(process.env.MELHOR_ENVIO_FROM_DOCUMENT);

    const storeAddress = process.env.MELHOR_ENVIO_FROM_ADDRESS || "";
    const storeNumber = process.env.MELHOR_ENVIO_FROM_NUMBER || "";
    const storeComplement = process.env.MELHOR_ENVIO_FROM_COMPLEMENT || "";
    const storeDistrict = process.env.MELHOR_ENVIO_FROM_DISTRICT || "";
    const storeCity = process.env.MELHOR_ENVIO_FROM_CITY || "Rio de Janeiro";
    const storeState = normalizeState(
      process.env.MELHOR_ENVIO_FROM_STATE || "RJ",
    );

    if (!token) {
      return errorResponse("MELHOR_ENVIO_TOKEN não configurado.", 500);
    }

    if (!storeDocument) {
      return errorResponse(
        "MELHOR_ENVIO_FROM_DOCUMENT não configurado. Informe CPF ou CNPJ da loja somente com números.",
        500,
      );
    }

    if (storeDocument.length !== 11 && storeDocument.length !== 14) {
      return errorResponse(
        "MELHOR_ENVIO_FROM_DOCUMENT inválido. Use CPF com 11 números ou CNPJ com 14 números.",
        500,
      );
    }

    if (
      !storeAddress ||
      !storeNumber ||
      !storeDistrict ||
      !storeCity ||
      !storeState
    ) {
      return errorResponse(
        "Dados da loja incompletos. Configure endereço, número, bairro, cidade e estado da loja.",
        500,
      );
    }

    if (storePostalCode.length !== 8) {
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

    const customerDocument = onlyNumbers(
      customer.document || customer.cpf || customer.cnpj,
    );

    if (!customerDocument) {
      return errorResponse(
        "CPF ou CNPJ do cliente não informado. Cadastre o documento do cliente antes de gerar a reversa.",
        400,
      );
    }

    if (customerDocument.length !== 11 && customerDocument.length !== 14) {
      return errorResponse("CPF ou CNPJ do cliente inválido.", 400);
    }

    const customerPostalCode = onlyNumbers(customer.cep);
    const customerState = normalizeState(customer.state);

    if (customerPostalCode.length !== 8) {
      return errorResponse("CEP do cliente inválido ou não informado.", 400);
    }

    if (!customer.name || !customer.address || !customer.number) {
      return errorResponse(
        "Dados do cliente incompletos. Informe nome, endereço e número antes de gerar a reversa.",
        400,
      );
    }

    if (!customer.district || !customer.city || !customerState) {
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

    const customerPerson = {
      name: customer.name,
      phone: onlyNumbers(customer.phone || storePhone),
      email: customer.email || storeEmail,
      document: customerDocument.length === 11 ? customerDocument : "",
      company_document: customerDocument.length === 14 ? customerDocument : "",
      state_register: "",
      address: customer.address,
      complement: customer.complement || "",
      number: customer.number,
      district: customer.district,
      city: customer.city,
      country_id: "BR",
      postal_code: customerPostalCode,
      note: "",
      state_abbr: customerState,
    };

    const storePerson = {
      name: storeName,
      phone: storePhone,
      email: storeEmail,
      document: storeDocument.length === 11 ? storeDocument : "",
      company_document: storeDocument.length === 14 ? storeDocument : "",
      state_register: "",
      address: storeAddress,
      complement: storeComplement,
      number: storeNumber,
      district: storeDistrict,
      city: storeCity,
      country_id: "BR",
      postal_code: storePostalCode,
      note: "",
      state_abbr: storeState,
    };

    const reversePayload = {
      service: Number(shippingOption.id),
      new_sender_mail: customer.email || storeEmail,
      new_sender_phone: onlyNumbers(customer.phone || storePhone),
      insurance_value: Number(insuranceValue.toFixed(2)),
      agency: null,
      from: customerPerson,
      to: storePerson,
      products: items.map((item) => ({
        name: item.name || "Produto",
        quantity: Number(item.quantity || 1),
        unitary_value: Number(item.price || 0),
      })),
      package: {
        height: packageSize.height,
        width: packageSize.width,
        length: packageSize.length,
        weight: Number(weight.toFixed(3)),
      },
      options: [
        {
          insurance_value: Number(insuranceValue.toFixed(2)),
          receipt: false,
          own_hand: false,
          non_commercial: true,
          invoice: {
            key: "",
          },
          platform: "Defan Brechó",
          tags: [
            {
              tag: String(body.saleId || "defan-brecho-reversa"),
              url: "",
            },
          ],
        },
      ],
    };

    const cartResponse = await fetch(`${baseUrl}/api/v2/me/cart/reverse`, {
      method: "POST",
      headers,
      body: JSON.stringify(reversePayload),
    });

    const cartData = await readJsonResponse(cartResponse);

    if (!cartResponse.ok) {
      return errorResponse(
        "Erro ao adicionar logística reversa no carrinho do Melhor Envio.",
        cartResponse.status,
        cartData,
      );
    }

    const orderId = cartData?.id || cartData?.order?.id || cartData?.data?.id;

    if (!orderId) {
      return errorResponse(
        "Melhor Envio não retornou ID da logística reversa.",
        500,
        cartData,
      );
    }

    if (action === "simulate") {
      return NextResponse.json({
        success: true,
        simulation: true,
        message:
          "Simulação concluída. A logística reversa foi adicionada ao carrinho, mas NÃO foi comprada.",
        orderId,
        reverseCode: getReverseCode(cartData),
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
        "Reversa criada no carrinho, mas não foi possível comprar. Verifique saldo/permissões no Melhor Envio.",
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
        "Reversa comprada, mas ainda não foi possível gerar. Tente consultar novamente em alguns segundos.",
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

    const reverseCode =
      getReverseCode(generateData) ||
      getReverseCode(printData) ||
      getReverseCode(cartData);

    const printUrl = getPrintUrl(printData);

    return NextResponse.json({
      success: true,
      simulation: false,
      message:
        "Logística reversa gerada. Envie o código/link ao cliente com as instruções de postagem.",
      orderId,
      reverseCode,
      reversePrintUrl: printUrl,
      printUrl,
      cart: cartData,
      checkout: checkoutData,
      generate: generateData,
      print: printData,
    });
  } catch (error) {
    console.error("Erro interno Melhor Envio reversa:", error);

    return errorResponse(
      "Erro interno ao gerar logística reversa.",
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
