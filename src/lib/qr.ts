import "server-only";
import QRCode from "qrcode";

/** QR Code em SVG (para mostrar na tela). */
export function qrSvg(conteudo: string) {
  return QRCode.toString(conteudo, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}

/** QR Code em PNG de alta resolução (para impressão). */
export function qrPng(conteudo: string, largura = 1200) {
  return QRCode.toBuffer(conteudo, { type: "png", width: largura, margin: 2, errorCorrectionLevel: "M" });
}
