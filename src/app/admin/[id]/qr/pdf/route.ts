import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { estabelecimentoParaQr } from "../dados";
import { qrPng } from "@/lib/qr";
import { SITE_URL } from "@/lib/env";

const MM = 72 / 25.4;

/** Folha A5 pronta para imprimir: chamada, QR grande e endereço escrito. */
export async function GET(_req: Request, { params }: RouteContext<"/admin/[id]/qr/pdf">) {
  const { id } = await params;
  const estab = await estabelecimentoParaQr(id);
  if (!estab) return new Response("Não encontrado", { status: 404 });

  const url = `${SITE_URL}/${estab.slug}`;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`QR Code — ${estab.nome}`);
  const pagina = pdf.addPage([148 * MM, 210 * MM]);
  const { width, height } = pagina.getSize();
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const cor = rgb(0.11, 0.11, 0.11);

  const centro = (texto: string, y: number, tamanho: number, fonte = normal) => {
    const largura = fonte.widthOfTextAtSize(texto, tamanho);
    pagina.drawText(texto, { x: (width - largura) / 2, y, size: tamanho, font: fonte, color: cor });
  };
  // nomes longos: reduz a fonte até caber
  let tamanhoNome = 26;
  while (negrito.widthOfTextAtSize(estab.nome, tamanhoNome) > width - 20 * MM && tamanhoNome > 12) tamanhoNome -= 1;

  centro(estab.nome, height - 28 * MM, tamanhoNome, negrito);
  centro("Ganhe seu cartão fidelidade", height - 42 * MM, 18, negrito);
  centro("Aponte a câmera do celular para o código", height - 50 * MM, 12);

  const lado = 100 * MM;
  const imagem = await pdf.embedPng(await qrPng(url, 1200));
  pagina.drawImage(imagem, { x: (width - lado) / 2, y: height - 56 * MM - lado, width: lado, height: lado });

  centro(url.replace(/^https?:\/\//, ""), 30 * MM, 12, negrito);
  centro("Sem aplicativo: o cartão fica no Apple Wallet, Google Wallet ou no navegador.", 22 * MM, 9);
  centro("por Bicuíra Digital", 10 * MM, 8);

  const bytes = await pdf.save();
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qrcode-${estab.slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
