import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const AREAS_PROTEGIDAS = ["/painel", "/admin"];

// Roda antes de cada página: renova a sessão do login e protege os painéis.
// (Futuro: resolver o estabelecimento pelo domínio próprio do cliente aqui.)
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const caminho = request.nextUrl.pathname;

  if (!logado && AREAS_PROTEGIDAS.some((a) => caminho === a || caminho.startsWith(`${a}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?volta=${encodeURIComponent(caminho)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/painel/:path*", "/admin/:path*", "/entrar"],
};
