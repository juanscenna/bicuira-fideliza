-- Versão 3 do texto de consentimento: uma caixa só no cadastro ("Aceito os termos do cartão fidelidade de …").
-- Promoções saem do cadastro: o cliente liga no cartão ("Quer receber novidades?"), separado do aceite (LGPD art. 8º, § 4º).
-- Rodar DEPOIS de publicar o código que conhece a versão 3 (src/lib/dominio/consentimento.ts).
alter table public.estabelecimentos alter column versao_politica set default 3;
update public.estabelecimentos set versao_politica = 3 where versao_politica < 3;
