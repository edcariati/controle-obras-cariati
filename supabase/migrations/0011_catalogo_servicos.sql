-- 0011 — Lista de serviços (catálogo editável): o que a Cariati entrega em cada tipo de contrato.
-- Mesmo grupo dos cadastros ("relacionamento"): dono, gestor e financeiro escrevem; leitura só lê; campo e cliente não acessam.
insert into public.colecoes(nome, grupo, tem_obra) values ('catalogoServicos','relacionamento',false) on conflict (nome) do nothing;
do $$
begin
  perform public.criar_tabela_colecao('catalogoServicos');
  execute 'drop trigger if exists trg_registro on public."catalogoServicos"';
  execute 'create trigger trg_registro before insert or update on public."catalogoServicos" for each row execute function public.trg_registro()';
end $$;
