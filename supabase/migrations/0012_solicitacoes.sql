-- 0012 — Solicitações e mudanças (protocolo): registro de pedidos de mudança de projeto, obra, aditivo, material e escopo.
-- "solicitacoes" fica no grupo "campo" (o campo registra, sem valores em R$).
-- "solicitacoesImpacto" guarda a variação de custo em R$ (mesmo id da solicitação) no grupo "orcamento": campo e cliente nunca leem.
insert into public.colecoes(nome, grupo, tem_obra) values ('solicitacoes','campo',true),('solicitacoesImpacto','orcamento',true) on conflict (nome) do nothing;
do $$
declare t text;
begin
  foreach t in array array['solicitacoes','solicitacoesImpacto'] loop
    perform public.criar_tabela_colecao(t);
    execute format('drop trigger if exists trg_registro on public.%I', t);
    execute format('create trigger trg_registro before insert or update on public.%I for each row execute function public.trg_registro()', t);
  end loop;
end $$;
