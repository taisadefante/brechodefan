export function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

export function whatsappLink(message: string) {
  return `https://wa.me/5521988359825?text=${encodeURIComponent(message)}`;
}

export function normalizeText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    disponivel: "Disponível",
    reservado: "Reservado",
    vendido: "Vendido",
    arquivado: "Arquivado",
    aguardando_pagamento: "Aguardando pagamento",
    pago: "Pago",
    separando: "Separando pedido",
    pronto_retirada: "Pronto para retirada",
    enviado: "Enviado",
    entregue: "Entregue",
    cancelamento_solicitado: "Cancelamento solicitado",
    cancelado: "Cancelado"
  };
  return map[status] || status;
}
