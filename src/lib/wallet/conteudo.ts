// Textos do cartão, iguais no Apple Wallet, no Google Wallet e no cartão web.
import { formatarReais } from "@/lib/dominio/dinheiro";
import type { DadosPass } from "./dados";

export function progresso(d: Pick<DadosPass, "carimbos" | "meta">) {
  return `${d.carimbos}/${d.meta}`;
}

export function statusRecompensa(d: Pick<DadosPass, "carimbos" | "meta" | "recompensa">) {
  return d.carimbos >= d.meta ? `Disponível: ${d.recompensa}` : `Faltam ${d.meta - d.carimbos} para ${d.recompensa}`;
}

export function regras(d: Pick<DadosPass, "meta" | "recompensa" | "gastoMinimoCentavos"> & { porEstadia?: boolean }) {
  // pousada: 1 selo por estadia, entregue na recepção
  if (d.porEstadia)
    return [
      "Ganhe 1 selo a cada hospedagem.",
      `Com ${d.meta} selos você ganha: ${d.recompensa}.`,
      "Mostre o QR Code ou o código na recepção. A recompensa é entregue na recepção e o cartão recomeça.",
    ].join(" ");
  return [
    d.gastoMinimoCentavos > 0 ? `Ganhe 1 selo a cada visita a partir de ${formatarReais(d.gastoMinimoCentavos)}.` : "Ganhe 1 selo a cada visita.",
    `Com ${d.meta} selos você ganha: ${d.recompensa}.`,
    "Mostre o QR Code ou o código no caixa. A recompensa é entregue no balcão e o cartão recomeça.",
  ].join(" ");
}

/** "#25433D" → "rgb(37, 67, 61)" (formato do pass.json da Apple) */
export function rgb(hex: string) {
  const h = hex.replace("#", "");
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
}

/** Limite de caracteres das mensagens personalizadas, seguro para Apple e Google. */
export const LIMITE_MENSAGEM = 150;
