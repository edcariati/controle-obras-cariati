-- 0013 — Liberações: novos papéis (compras, engenharia), matriz editável pelo administrador e aprovações por papel.
-- * perfis e convites aceitam os papéis 'compras' e 'engenharia';
-- * a coleção "liberacoes" (doc "matriz") guarda a matriz mostrada na tela; todos leem, só o dono grava;
-- * "aprovacoes_papel" diz quem pode aprovar medição, assinar aditivo e negar chamado (antes fixo no código);
-- * definir_liberacoes(papel, grupos, aprovações) é o único jeito de mudar permissoes/aprovacoes_papel, e só o dono chama;
-- * cliente passa a ler (só leitura) as áreas que a obra libera em dados->'clienteVe' (cronograma, etapas, diário, solicitações).

-- 1) novos papéis
alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check check (papel in ('dono','gestor','financeiro','compras','engenharia','campo','cliente','leitura'));
alter table public.convites drop constraint if exists convites_papel_check;
alter table public.convites add constraint convites_papel_check check (papel in ('dono','gestor','financeiro','compras','engenharia','campo','cliente','leitura'));

create or replace function public.definir_acesso(uid uuid, p_nome text, p_papel text, p_ativo boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.exige_dono();
  if p_papel not in ('dono','gestor','financeiro','compras','engenharia','campo','cliente','leitura') then raise exception 'Papel inválido'; end if;
  if not exists (select 1 from auth.users where id = uid) then raise exception 'Usuário não encontrado'; end if;
  if (p_papel <> 'dono' or not p_ativo) and public.donos_ativos_exceto(uid) = 0
     and exists (select 1 from public.perfis where user_id = uid and papel = 'dono' and ativo) then
    raise exception 'Deve existir ao menos um dono ativo';
  end if;
  insert into public.perfis (user_id, nome, papel, ativo, email)
    select uid, coalesce(nullif(trim(p_nome), ''), split_part(u.email, '@', 1)), p_papel, p_ativo, u.email from auth.users u where u.id = uid
  on conflict (user_id) do update set nome = excluded.nome, papel = excluded.papel, ativo = excluded.ativo, email = excluded.email;
end $$;

create or replace function public.convidar_usuario(p_email text, p_nome text, p_papel text, p_obras text[])
returns text language plpgsql security definer set search_path = public, auth as $$
declare em text := lower(trim(p_email)); uid uuid;
begin
  perform public.exige_dono();
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if p_papel not in ('dono','gestor','financeiro','compras','engenharia','campo','cliente','leitura') then raise exception 'Papel inválido'; end if;
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

-- 2) matriz: coleção "liberacoes" (todos leem, só o dono grava)
insert into public.colecoes(nome, grupo, tem_obra) values ('liberacoes','liberacoes',false) on conflict (nome) do nothing;
do $$
begin
  perform public.criar_tabela_colecao('liberacoes');
  execute 'drop trigger if exists trg_registro on public."liberacoes"';
  execute 'create trigger trg_registro before insert or update on public."liberacoes" for each row execute function public.trg_registro()';
end $$;
insert into public.permissoes(papel, grupo, nivel) values
 ('dono','liberacoes','E'),('gestor','liberacoes','L'),('financeiro','liberacoes','L'),('compras','liberacoes','L'),('engenharia','liberacoes','L'),('campo','liberacoes','L'),('leitura','liberacoes','L')
on conflict do nothing;

-- 3) permissões iniciais dos novos papéis (o administrador ajusta depois pela tela de Liberações)
insert into public.permissoes(papel, grupo, nivel) values
 ('compras','obras','L'),('compras','campo','L'),('compras','cadastros','E'),('compras','suprimentos','E'),('compras','estoque','E'),('compras','contratos','L'),('compras','financeiro','L'),
 ('engenharia','obras','E'),('engenharia','campo','E'),('engenharia','cadastros','L'),('engenharia','suprimentos','L'),('engenharia','estoque','L'),('engenharia','contratos','E'),('engenharia','orcamento','L'),('engenharia','medicao','E'),('engenharia','avaliacao','E'),('engenharia','relatorio','L'),
 ('engenharia','garantia','E'),('engenharia','chamados','E'),('engenharia','posobra','E'),('engenharia','satisfacao','L')
on conflict do nothing;

-- 4) aprovações por papel (padrão = regras que já existiam)
create table if not exists public.aprovacoes_papel (
  papel text not null,
  acao text not null,
  primary key (papel, acao)
);
alter table public.aprovacoes_papel enable row level security;
drop policy if exists aprovacoes_sel on public.aprovacoes_papel;
create policy aprovacoes_sel on public.aprovacoes_papel for select using (auth.uid() is not null);
revoke all on public.aprovacoes_papel from public, anon, authenticated;
grant select on public.aprovacoes_papel to authenticated;
insert into public.aprovacoes_papel(papel, acao) values
 ('dono','med_aprovar'),('financeiro','med_aprovar'),
 ('dono','adt_assinar'),('gestor','adt_assinar'),('financeiro','adt_assinar'),
 ('dono','chamado_negar'),('gestor','chamado_negar'),('engenharia','chamado_negar')
on conflict do nothing;

create or replace function public.pode_aprovar(p_acao text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.papel_atual() = 'dono' or exists (select 1 from public.aprovacoes_papel a where a.papel = public.papel_atual() and a.acao = p_acao)
$$;
revoke all on function public.pode_aprovar(text) from public, anon;
grant execute on function public.pode_aprovar(text) to authenticated;

create or replace function public.trg_regras() returns trigger
language plpgsql security definer set search_path = public as $$
declare papel text := public.papel_atual(); ant jsonb := coalesce(old.dados,'{}'::jsonb); nov jsonb := new.dados;
begin
  if tg_op <> 'UPDATE' then
    if tg_table_name = 'medicoes' and nov->>'status' = 'aprovada' then raise exception 'Medição não pode ser criada já aprovada'; end if;
    if tg_table_name = 'aditivos' and nov->>'status' = 'assinado' then raise exception 'Aditivo não pode ser criado já assinado'; end if;
    return new;
  end if;

  if tg_table_name = 'relatorios' and ant->>'status' = 'emitido' then
    if nov->>'status' is distinct from 'emitido' or nov->'snapshot' is distinct from ant->'snapshot'
       or nov->>'mes' is distinct from ant->>'mes' or nov->>'emitidoEm' is distinct from ant->>'emitidoEm' then
      raise exception 'Relatório emitido é congelado: para corrigir, crie uma retificação';
    end if;
  end if;

  if tg_table_name = 'orcamentos' and nov is distinct from ant then
    raise exception 'Versão de orçamento é imutável: crie uma nova versão';
  end if;
  if tg_table_name = 'orcItens' and old.id not like 'ref\_%' and nov is distinct from ant then
    raise exception 'Itens de uma versão de orçamento são imutáveis';
  end if;

  if tg_table_name = 'contasPagar' and ant->>'status' = 'paga' and nov->>'status' is distinct from 'paga' and papel <> 'dono' then
    raise exception 'Conta paga só volta pelo dono';
  end if;

  if tg_table_name = 'medicoes' then
    if nov->>'status' = 'aprovada' and ant->>'status' is distinct from 'aprovada' and not public.pode_aprovar('med_aprovar') then
      raise exception 'Seu papel não pode aprovar medição';
    end if;
    if ant->>'status' = 'aprovada' and nov->>'status' is distinct from 'aprovada' and papel <> 'dono' then
      raise exception 'Medição aprovada só volta pelo dono';
    end if;
    if ant->>'status' = 'aprovada' and nov->'itens' is distinct from ant->'itens' then
      raise exception 'Medição aprovada não pode ter os itens alterados';
    end if;
  end if;

  if tg_table_name = 'aditivos' then
    if nov->>'status' = 'assinado' and ant->>'status' is distinct from 'assinado' and not public.pode_aprovar('adt_assinar') then
      raise exception 'Sem permissão para assinar aditivo';
    end if;
    if ant->>'status' = 'assinado' and (nov->'valor' is distinct from ant->'valor' or nov->'assinatura' is distinct from ant->'assinatura' or nov->>'status' is distinct from 'assinado') then
      raise exception 'Aditivo assinado é imutável';
    end if;
  end if;

  if tg_table_name = 'obras' and (nov->>'situacao' is distinct from ant->>'situacao') and papel <> 'dono' then
    raise exception 'Só o dono encerra ou reabre uma obra';
  end if;
  return new;
end $$;

create or replace function public.trg_chamado() returns trigger
language plpgsql security definer set search_path = public as $$
declare papel text := public.papel_atual(); ant jsonb := coalesce(old.dados,'{}'::jsonb); nov jsonb := new.dados;
begin
  if (nov->>'status' = 'negado' or nov->>'parecer' = 'nao_coberto') and coalesce(btrim(nov->>'justificativa'),'') = '' then
    raise exception 'Negar ou marcar como não coberto exige a justificativa';
  end if;
  if tg_op = 'UPDATE' and nov->>'status' = 'negado' and ant->>'status' is distinct from 'negado' and not public.pode_aprovar('chamado_negar') then
    raise exception 'Seu papel não pode negar um chamado';
  end if;
  if tg_op = 'UPDATE' and nov->'aceiteCliente' is distinct from ant->'aceiteCliente' and papel is distinct from 'cliente' and coalesce(current_setting('app.aceite', true),'') <> 'on' then
    raise exception 'O aceite é do cliente';
  end if;
  return new;
end $$;

-- 5) o dono muda as liberações de um papel: níveis por grupo (L, E ou N = sem acesso) e aprovações
create or replace function public.definir_liberacoes(p_papel text, p_grupos jsonb, p_aprova text[])
returns void language plpgsql security definer set search_path = public as $$
declare g text; n text;
begin
  perform public.exige_dono();
  if p_papel not in ('gestor','financeiro','compras','engenharia','campo','leitura') then raise exception 'Papel não editável: %', p_papel; end if;
  for g, n in select key, value from jsonb_each_text(coalesce(p_grupos, '{}'::jsonb)) loop
    if n not in ('L','E','N') then raise exception 'Nível inválido: %', n; end if;
    if g = 'liberacoes' or g = 'config' and n = 'E' then continue; end if;
    if n = 'N' then delete from public.permissoes where papel = p_papel and grupo = g;
    else insert into public.permissoes(papel, grupo, nivel) values (p_papel, g, n) on conflict (papel, grupo) do update set nivel = excluded.nivel; end if;
  end loop;
  delete from public.aprovacoes_papel where papel = p_papel;
  insert into public.aprovacoes_papel(papel, acao)
    select p_papel, a from unnest(coalesce(p_aprova, '{}')) a
     where a in ('med_aprovar','adt_assinar','chamado_negar','compra_pagar','med_pagar','ped_aprovar','ped_pagar','sol_decidir','etapa_liberar','rel_emitir')
  on conflict do nothing;
end $$;
revoke all on function public.definir_liberacoes(text, jsonb, text[]) from public, anon;
grant execute on function public.definir_liberacoes(text, jsonb, text[]) to authenticated;

-- 6) cliente lê, só para visualizar, as áreas que a obra libera (obras.dados->'clienteVe')
create or replace function public.cliente_libera(p_obra text, p_area text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.papel_atual() = 'cliente' and public.na_obra(p_obra) and exists (
    select 1 from public.obras o where o.id = p_obra and o.excluido_em is null and o.dados->'clienteVe' ? p_area)
$$;
revoke all on function public.cliente_libera(text, text) from public, anon;
grant execute on function public.cliente_libera(text, text) to authenticated;
do $$
declare m text[][] := array[['atividades','cronograma'],['etapas','etapas'],['diarios','diario'],['solicitacoes','solicitacoes'],['atividades','painel'],['etapas','painel']]; i int;
begin
  for i in 1 .. array_length(m, 1) loop
    execute format('drop policy if exists %I on public.%I', m[i][1] || '_cliente_' || m[i][2], m[i][1]);
    execute format('create policy %I on public.%I for select using (excluido_em is null and public.cliente_libera(obra_id, %L))', m[i][1] || '_cliente_' || m[i][2], m[i][1], m[i][2]);
    execute format('grant select on public.%I to authenticated', m[i][1]);
  end loop;
end $$;
