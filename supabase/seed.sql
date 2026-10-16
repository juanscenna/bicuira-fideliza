-- Dados de teste para desenvolvimento LOCAL (npx supabase db reset).
-- Nunca rode em produção: os logins abaixo têm senhas conhecidas (listadas no README).

-- Logins de teste ------------------------------------------------------------
create or replace function pg_temp.criar_login(p_id uuid, p_email text, p_senha text) returns void
language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
end $$;

select pg_temp.criar_login('a0000000-0000-4000-8000-000000000001', 'admin@bicuira.test', 'bicuira-admin-local');
select pg_temp.criar_login('a0000000-0000-4000-8000-000000000002', 'dono@restaurante-teste.test', 'restaurante-teste-local');

-- Restaurante Teste ------------------------------------------------------------
-- (os planos padrão e as automações são criados pelo gatilho)
insert into public.estabelecimentos (id, slug, nome, contato_privacidade)
values ('e0000000-0000-4000-8000-000000000001', 'restaurante-teste', 'Restaurante Teste',
        'privacidade@restaurante-teste.test');

insert into public.perfis (user_id, papel, estabelecimento_id) values
  ('a0000000-0000-4000-8000-000000000001', 'super_admin', null),
  ('a0000000-0000-4000-8000-000000000002', 'dono', 'e0000000-0000-4000-8000-000000000001');
