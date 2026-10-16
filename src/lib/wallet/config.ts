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
