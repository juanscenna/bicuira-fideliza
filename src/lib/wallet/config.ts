import "server-only";

/** Apple Wallet pronto quando todas as credenciais estão nas variáveis de ambiente (etapa 6). */
export function appleConfigurado() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_PASS_CERT_BASE64 &&
      process.env.APPLE_PASS_KEY_BASE64 &&
      process.env.APPLE_WWDR_CERT_BASE64,
  );
}

/** Google Wallet pronto quando há emissor e conta de serviço (etapa 6). */
export function googleConfigurado() {
  return Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64);
}

/**
 * Liga os botões "Adicionar ao Apple/Google Wallet" no cartão do cliente.
 * Desligado (padrão): o cartão é só a página web. Para ligar, coloque WALLET_ATIVO=true
 * nas variáveis de ambiente da Vercel e faça um novo deploy. Nada mais muda no código.
 */
export function walletVisivel() {
  return process.env.WALLET_ATIVO === "true";
}
