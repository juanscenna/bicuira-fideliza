-- Logos dos estabelecimentos: leitura pública (aparecem na página, no cartão e no Wallet).
-- O envio é feito só pelo servidor (/admin), com a chave secreta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
