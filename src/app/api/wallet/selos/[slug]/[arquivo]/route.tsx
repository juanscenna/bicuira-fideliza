import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/env";
import { TEMAS, temaDo } from "@/temas/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

const LARGURA = 1032; // tamanho recomendado pelo Google para a imagem de destaque
const ALTURA = 336;
const BARRA = 10;

/**
 * Faixa de selos do cartão no Google Wallet: "/api/wallet/selos/<slug>/<feitos>-<meta>-<plano>.png".
 * Mostra os selos, o contador, quanto falta e a recompensa por extenso (na frente do cartão o Google corta textos longos).
 * O visual vem de `faixa` no tema (src/temas/config.ts), copiado do cartão web: o cliente vê o mesmo cartão nos dois lugares.
 */
export async function GET(_req: Request, { params }: RouteContext<"/api/wallet/selos/[slug]/[arquivo]">) {
  const { slug, arquivo } = await params;
  const m = /^(\d{1,2})-(\d{1,2})(?:-(morador|turista))?\.png$/.exec(arquivo);
  if (!m) return new Response("Não encontrado", { status: 404 });
  const meta = Math.min(Math.max(Number(m[2]), 1), 20);
  const feitos = Math.min(Number(m[1]), meta);

  const tema = TEMAS[temaDo(slug)];
  const f = tema.faixa;
  const recompensa = m[3] ? await recompensaDo(slug, m[3]) : null;
  // as imagens vão embutidas (data URI): o gerador não busca endereços do próprio servidor
  const [imgFeito, imgVazio] = tema.selos ? await Promise.all([embutir(tema.selos.feito), embutir(tema.selos.vazio)]) : [null, null];
  // fonte pesada (Montserrat 900, licença OFL), a mesma família dos cartões web
  const fonte = await fetch(`${SITE_URL}/temas/rosa-norte/montserrat-900.woff`).then((r) => r.arrayBuffer());
  const porLinha = meta <= 5 ? meta : Math.ceil(meta / 2);
  const linhas = Math.ceil(meta / porLinha);
  // no celular a faixa aparece a ~1/3 do tamanho: textos com 30 px ou mais aqui para continuarem legíveis
  const AREA = 520; // selos à esquerda, contador e recompensa à direita (como no cartão web)
  const lado = Math.min(Math.floor((AREA - 40) / porLinha) - 14, Math.floor((ALTURA - BARRA - 60) / linhas) - 14);
  const completo = feitos >= meta;
  const faltam = meta - feitos;
  const linhaRecompensa = recompensa ? (completo ? recompensa : `para ${recompensa}`) : null;
  // até 2 linhas: texto longo fica menor (o texto completo está nos detalhes do cartão, "Sua recompensa")
  const longa = Boolean(linhaRecompensa && linhaRecompensa.length > 22);
  const fonteRecompensa = longa ? 29 : 33;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", fontFamily: "Montserrat", background: f.fundo }}>
        <div style={{ display: "flex", height: BARRA, width: "100%", background: f.barra }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 40px" }}>
          <div style={{ width: AREA, display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: linhas }, (_, l) => (
              <div key={l} style={{ display: "flex", gap: 14 }}>
                {Array.from({ length: Math.min(porLinha, meta - l * porLinha) }, (_, c) => {
                  const i = l * porLinha + c;
                  const feito = i < feitos;
                  const presente = !feito && i === meta - 1 && f.presenteNoUltimo;
                  return (
                    <div
                      key={c}
                      style={{
                        width: lado,
                        height: lado,
                        borderRadius: lado,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: feito ? `5px solid ${f.aro}` : presente ? presente.borda : f.vazio.borda,
                        background: feito ? (tema.selos ? "transparent" : f.aro) : f.vazio.fundo,
                      }}
                    >
                      {presente ? (
                        <Presente cor={presente.cor} lado={Math.round(lado * 0.5)} />
                      ) : tema.selos ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(feito ? imgFeito : imgVazio)!} alt="" width={lado} height={lado} style={{ opacity: feito ? 1 : f.vazio.opacidadeSelo }} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-end", color: f.numero, fontSize: longa ? 80 : recompensa ? 100 : 120, fontWeight: 900, lineHeight: 1 }}>
              {feitos}
              <span style={{ fontSize: longa ? 36 : 48, color: f.numeroMeta, marginBottom: longa ? 8 : 12 }}>/{meta}</span>
            </div>
            <div
              style={{
                display: "flex",
                padding: "12px 22px",
                borderRadius: 999,
                background: f.pilula,
                color: f.textoPilula,
                fontSize: 34,
                fontWeight: 900,
                textTransform: f.maiusculas ? "uppercase" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {completo ? "Ganhou!" : faltam === 1 ? "Falta 1 selo" : `Faltam ${faltam} selos`}
            </div>
            {recompensa ? (
              // recompensa por extenso, até 2 linhas, alinhada à direita
              <div style={{ display: "flex", maxWidth: 430, justifyContent: "flex-end", textAlign: "right", color: f.numeroMeta, fontSize: fonteRecompensa, fontWeight: 900, lineHeight: 1.2 }}>
                {linhaRecompensa}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { width: LARGURA, height: ALTURA, fonts: [{ name: "Montserrat", data: fonte, weight: 900, style: "normal" }], headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
  );
}

/** Ícone de presente (desenho do lucide "gift", em SVG puro para o gerador de imagem). */
function Presente({ cor, lado }: { cor: string; lado: number }) {
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

/** Texto da recompensa do plano (o mesmo do cartão web). Curto o bastante para 2 linhas. */
async function recompensaDo(slug: string, plano: string) {
  const { data } = await supabaseAdmin()
    .from("planos")
    .select("recompensa_texto, estabelecimentos!inner(slug)")
    .eq("estabelecimentos.slug", slug)
    .eq("tipo", plano)
    .maybeSingle();
  const texto = (data?.recompensa_texto as string | undefined)?.trim();
  if (!texto) return null;
  if (texto.length <= 45) return texto;
  // corta numa palavra inteira (nunca "pess…")
  const corte = texto.slice(0, 44);
  return `${corte.slice(0, corte.lastIndexOf(" ") > 20 ? corte.lastIndexOf(" ") : 44).trimEnd()}…`;
}

async function embutir(caminho: string) {
  const r = await fetch(`${SITE_URL}${caminho}`);
  return `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
}
