-- 0010 — Cadastros: clientes, parceiros, cadastro da obra, arquivos recebidos, e gestão de usuários (entrada e saída).
-- Dados pessoais e de contrato ficam no grupo "relacionamento": dono, gestor e financeiro escrevem; leitura só lê;
-- campo e cliente não têm acesso a nenhuma linha.

insert into public.colecoes(nome, grupo, tem_obra) values
 ('clientes','relacionamento',false),('parceiros','relacionamento',false),
 ('cadastros','relacionamento',true),('arquivosObra','relacionamento',true)
on conflict (nome) do nothing;

insert into public.permissoes(papel, grupo, nivel) values
 ('dono','relacionamento','E'),('gestor','relacionamento','E'),('financeiro','relacionamento','E'),('leitura','relacionamento','L')
on conflict do nothing;

do $$
declare c text;
begin
  foreach c in array array['clientes','parceiros','cadastros','arquivosObra'] loop
    perform public.criar_tabela_colecao(c);
    execute format('drop trigger if exists trg_registro on public.%I', c);
    execute format('create trigger trg_registro before insert or update on public.%I for each row execute function public.trg_registro()', c);
  end loop;
end $$;

-- ===== Usuários: quem entra, com que papel, em quais obras. Só o dono mexe. =====
alter table public.perfis add column if not exists email text;

create table if not exists public.convites (
  email text primary key,
  nome text not null default '',
  papel text not null check (papel in ('dono','gestor','financeiro','campo','cliente','leitura')),
  obras text[] not null default '{}',
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid()
);
alter table public.convites enable row level security;
alter table public.convites force row level security;
create policy convites_dono on public.convites for select using (public.papel_atual() = 'dono');
-- só leitura direta (o dono); criar, trocar e cancelar convites passa pelas funções abaixo (nenhum DELETE para o papel authenticated)
grant select on public.convites to authenticated;

create or replace function public.exige_dono() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if public.papel_atual() is distinct from 'dono' then raise exception 'Somente a diretoria gerencia usuários'; end if;
end $$;

-- último dono ativo nunca pode ficar sem acesso
create or replace function public.donos_ativos_exceto(uid uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.perfis where papel = 'dono' and ativo and user_id <> uid
$$;

create or replace function public.listar_usuarios()
returns table(user_id uuid, email text, nome text, papel text, ativo boolean, situacao text, ultimo_acesso timestamptz, criado_em timestamptz, obras text[])
language plpgsql stable security definer set search_path = public, auth as $$
begin
  perform public.exige_dono();
  return query
    select u.id, u.email::text, coalesce(p.nome, ''), p.papel, coalesce(p.ativo, false),
           case when p.user_id is null then 'sem_acesso' when p.ativo then 'ativo' else 'suspenso' end,
           u.last_sign_in_at, u.created_at,
           coalesce((select array_agg(m.obra_id order by m.obra_id) from public.obra_membros m where m.user_id = u.id), '{}')
      from auth.users u left join public.perfis p on p.user_id = u.id
    union all
    select null::uuid, c.email, c.nome, c.papel, false, 'convidado', null::timestamptz, c.criado_em, c.obras
      from public.convites c where not exists (select 1 from auth.users u where lower(u.email) = c.email)
    order by 2;
end $$;

create or replace function public.definir_acesso(uid uuid, p_nome text, p_papel text, p_ativo boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.exige_dono();
  if p_papel not in ('dono','gestor','financeiro','campo','cliente','leitura') then raise exception 'Papel inválido'; end if;
  if not exists (select 1 from auth.users where id = uid) then raise exception 'Usuário não encontrado'; end if;
  if (p_papel <> 'dono' or not p_ativo) and public.donos_ativos_exceto(uid) = 0
     and exists (select 1 from public.perfis where user_id = uid and papel = 'dono' and ativo) then
    raise exception 'Deve existir ao menos um dono ativo';
  end if;
  insert into public.perfis (user_id, nome, papel, ativo, email)
    select uid, coalesce(nullif(trim(p_nome), ''), split_part(u.email, '@', 1)), p_papel, p_ativo, u.email from auth.users u where u.id = uid
  on conflict (user_id) do update set nome = excluded.nome, papel = excluded.papel, ativo = excluded.ativo, email = excluded.email;
end $$;

create or replace function public.definir_obras_usuario(uid uuid, p_obras text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.exige_dono();
  delete from public.obra_membros where user_id = uid;
  insert into public.obra_membros (obra_id, user_id) select distinct o, uid from unnest(coalesce(p_obras, '{}')) o where o is not null and o <> '';
end $$;

create or replace function public.convidar_usuario(p_email text, p_nome text, p_papel text, p_obras text[])
returns text language plpgsql security definer set search_path = public, auth as $$
declare em text := lower(trim(p_email)); uid uuid;
begin
  perform public.exige_dono();
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if p_papel not in ('dono','gestor','financeiro','campo','cliente','leitura') then raise exception 'Papel inválido'; end if;
  select id into uid from auth.users where lower(email) = em;
  if uid is not null then
    perform public.definir_acesso(uid, p_nome, p_papel, true);
    perform public.definir_obras_usuario(uid, p_obras);
    return 'existente';
  end if;
  insert into public.convites (email, nome, papel, obras) values (em, coalesce(p_nome, ''), p_papel, coalesce(p_obras, '{}'))
  on conflict (email) do update set nome = excluded.nome, papel = excluded.papel, obras = excluded.obras;
  return 'convidado';
end $$;

create or replace function public.cancelar_convite(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.exige_dono(); delete from public.convites where email = lower(trim(p_email)); end $$;

-- remove o acesso ao app (a conta de login continua no Supabase, mas sem perfil não entra em nada)
create or replace function public.remover_acesso(uid uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.exige_dono();
  if uid = auth.uid() then raise exception 'Você não pode remover o seu próprio acesso'; end if;
  if exists (select 1 from public.perfis where user_id = uid and papel = 'dono' and ativo) and public.donos_ativos_exceto(uid) = 0 then
    raise exception 'Deve existir ao menos um dono ativo';
  end if;
  delete from public.obra_membros where user_id = uid;
  delete from public.perfis where user_id = uid;
end $$;

-- quando a pessoa convidada cria a conta (ou é convidada pelo painel do Supabase), o acesso já nasce pronto
create or replace function public.aplicar_convite() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.convites%rowtype;
begin
  select * into c from public.convites where email = lower(new.email);
  if found then
    insert into public.perfis (user_id, nome, papel, ativo, email)
      values (new.id, coalesce(nullif(c.nome, ''), split_part(new.email, '@', 1)), c.papel, true, lower(new.email))
      on conflict (user_id) do nothing;
    insert into public.obra_membros (obra_id, user_id) select distinct o, new.id from unnest(c.obras) o where o is not null and o <> '' on conflict do nothing;
    delete from public.convites where email = c.email;
  end if;
  return new;
end $$;
drop trigger if exists trg_aplicar_convite on auth.users;
create trigger trg_aplicar_convite after insert on auth.users for each row execute function public.aplicar_convite();

revoke all on function public.exige_dono(), public.donos_ativos_exceto(uuid), public.aplicar_convite() from public, anon, authenticated;
revoke all on function public.listar_usuarios(), public.definir_acesso(uuid, text, text, boolean), public.definir_obras_usuario(uuid, text[]),
  public.convidar_usuario(text, text, text, text[]), public.cancelar_convite(text), public.remover_acesso(uuid) from public, anon;
grant execute on function public.listar_usuarios(), public.definir_acesso(uuid, text, text, boolean), public.definir_obras_usuario(uuid, text[]),
  public.convidar_usuario(text, text, text, text[]), public.cancelar_convite(text), public.remover_acesso(uuid) to authenticated;
