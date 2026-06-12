import { MercadoPagoConfig } from "mercadopago";

export async function GET() {
  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });

    return Response.json({
      success: true,
      message: "Mercado Pago conectado",
    });
  } catch (error) {
    return Response.json({
      success: false,
      error,
    });
  }
}