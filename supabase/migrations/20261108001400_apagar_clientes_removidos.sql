-- Cliente apagado sai DE VEZ do banco (cadastro, cartão, visitas, carimbos, resgates, consentimentos,
-- envios e notificações apagam em cascata). Antes, a exclusão só anonimizava ("Cliente removido") e as
-- visitas ficavam. Esta migration apaga os que ficaram assim; os novos já são apagados pelo sistema.
delete from public.clientes where anonimizado_em is not null;
