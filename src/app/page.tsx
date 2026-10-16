import Link from "next/link";
import { classesBotao } from "@/components/ui/Botao";

export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <p className="font-semibold text-restinga">Bicuíra Digital</p>
      <h1 className="font-display text-5xl leading-tight text-restinga">Bicuíra Fideliza</h1>
      <p className="text-lg">
        Cartão fidelidade digital para restaurantes e bares. Clientes recebem o cartão pelo QR Code do
        estabelecimento.
      </p>
      <Link href="/entrar" className={`${classesBotao("principal", true)} self-start`}>
        Entrar no painel
      </Link>
    </main>
  );
}
