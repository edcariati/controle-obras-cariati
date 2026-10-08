/* ================= SETOR DE COMPRAS (todas as obras) E COMPRAS NO DRE =================
   · página "Compras" no menu: situação de todas as compras, etapa do fluxo, atrasos e histórico recente;
   · quadro "Compras e entregas" no DRE da obra, com a etapa do fluxo, quem pagou e as entregas ligadas às etapas da obra. */
function cmpClienteDe(o){ return o.cliente||''; }
function cmpPagQuem(o){ return pagQuemObra(o); }
function cmpFiltros(){ return Object.assign({obra:'', etapa:'', sit:'abertas'}, ui.cmpF||{}); }
function cmpTodas(){
  var f=cmpFiltros(), out=[];
  L('compras').forEach(function(c){
    var o=G('obras',c.obraId); if(!o||o.situacao==='cancelada') return;
    var e=compraEtapaFluxo(o,c), encerrada=!e;
    if(f.obra&&c.obraId!==f.obra) return;
    if(f.etapa&&String(e)!==f.etapa) return;
    var atras=pedidoAtrasado(c)||compraAtrasadaPedido(c)||cfPagCobrar(c)||cfDivAberta(c);
    if(f.sit==='abertas'&&encerrada) return; if(f.sit==='atencao'&&!(atras&&!encerrada)) return; if(f.sit==='encerradas'&&!encerrada) return;
    out.push({c:c,o:o,e:e,atras:atras});
  });
  return out.sort(function(a,b){ return (b.atras?1:0)-(a.atras?1:0) || (limiteCompra(a.c)||'9')<(limiteCompra(b.c)||'9')?-1:1; });
}
function cmpHistorico(n){
  var ev=[];
  L('compras').forEach(function(c){ var o=G('obras',c.obraId); if(!o) return; (c.hist||[]).forEach(function(h){ ev.push({d:h.data||'', o:o, c:c, h:h}); }); });
  return ev.sort(function(a,b){ return a.d<b.d?1:-1; }).slice(0,n||25);
}
function vCompras(){
  if(ehCliente()) return notFound();
  var ve=gVe(), f=cmpFiltros(), obras=L('obras').filter(function(o){ return o.situacao!=='cancelada'; }).sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); });
  var todasAbertas=[]; L('compras').forEach(function(c){ var o=G('obras',c.obraId); if(o&&o.situacao!=='cancelada'&&compraEtapaFluxo(o,c)) todasAbertas.push({c:c,o:o}); });
  var n=function(fn){ return todasAbertas.filter(fn).length; }, hj=hoje(), sem=addDays(hj,7);
  var kp=function(t,v,s,k){ return '<div class="kpi'+(k?' '+k:'')+'"><div class="kpi-r">'+t+'</div><div class="kpi-v"><span class="num">'+v+'</span></div><div class="kpi-s">'+s+'</div></div>'; };
  var nAtr=n(function(x){ return pedidoAtrasado(x.c)||compraAtrasadaPedido(x.c); }), nCob=n(function(x){ return cfPagCobrar(x.c); }), nDiv=n(function(x){ return cfDivAberta(x.c); }), nSem=n(function(x){ return x.c.status==='pedido'&&x.c.pedido&&x.c.pedido.entregaPrevista>=hj&&x.c.pedido.entregaPrevista<=sem; });
  var nAg=n(function(x){ return x.c.status==='pedido'&&x.c.pagto&&x.c.pagto.solicitadoEm&&!x.c.pagto.confirmadoEm; });
  var kpis='<div class="kpis">'+kp('Compras em andamento',todasAbertas.length,'nas obras ativas','')+kp('Atrasadas',nAtr,nAtr?'pedir ou entrega fora do prazo':'em dia',nAtr?'crit':'ok')+kp('Aguardando pagamento do cliente',nAg,nCob?plural(nCob,'para cobrar agora','para cobrar agora'):'dentro do prazo',nCob?'crit':(nAg?'warn':'ok'))+kp('Divergências abertas',nDiv,nDiv?'avisar e acompanhar':'nenhuma',nDiv?'warn':'ok')+kp('Entregas em 7 dias',nSem,'pedidos com entrega prevista','')+'</div>';
  var lista=cmpTodas();
  var selObra='<select data-chg="cmp-f" data-k="obra" aria-label="Obra"><option value="">Todas as obras</option>'+obras.map(function(o){ return '<option value="'+o.id+'"'+(f.obra===o.id?' selected':'')+'>'+esc(o.nome)+'</option>'; }).join('')+'</select>';
  var selEt='<select data-chg="cmp-f" data-k="etapa" aria-label="Etapa do fluxo"><option value="">Todas as etapas</option>'+FLX_COMPRAS.map(function(s){ return '<option value="'+s.n+'"'+(f.etapa===String(s.n)?' selected':'')+'>'+pad2(s.n)+' · '+esc(s.nome)+'</option>'; }).join('')+'</select>';
  var sit=[['abertas','Em andamento'],['atencao','Pedem atenção'],['encerradas','Encerradas'],['todas','Todas']].map(function(x){ return '<button type="button" class="btn sm'+(f.sit===x[0]?' primary':'')+'" data-act="cmp-sit" data-s="'+x[0]+'" aria-pressed="'+(f.sit===x[0])+'">'+x[1]+'</button>'; }).join('');
  var tbl=lista.length?'<div class="card tbl-scroll"><table class="tbl"><thead><tr><th>Item</th><th>Obra · cliente</th><th>Fluxo</th><th>Situação</th><th>Fornecedor</th><th>Entrega</th>'+(ve?'<th>Valor</th>':'')+'<th></th></tr></thead><tbody>'+lista.map(function(x){
      var c=x.c, o=x.o, rot=rotuloAvancar(o,c), forn=c.pedido?fornNome(c.pedido.fornecedorId):'', val=valorCompra(c);
      return '<tr'+(x.atras?' style="background:var(--crit-soft)"':'')+'><td><button type="button" class="linkbtn" data-act="compra-abrir" data-id="'+c.id+'"><strong>'+esc(c.item)+'</strong></button><div class="tiny muted">'+esc(String(c.qtd).replace('.',','))+' '+esc(c.un||'')+(c.codigo?' · '+esc(c.codigo):'')+'</div></td>'
        +'<td><a href="#/obra/'+o.id+'/compras">'+esc(o.nome)+'</a><div class="tiny muted">'+esc(cmpClienteDe(o))+' · '+esc(PAG_QUEM[cmpPagQuem(o)])+'</div></td>'
        +'<td>'+(x.e?'<span class="chip steel" title="'+esc(FLX_COMPRAS[x.e-1].nome)+'">'+pad2(x.e)+'/11</span> <span class="small">'+esc(FLX_COMPRAS[x.e-1].nome)+'</span>':'<span class="chip ok">Encerrada</span>')+'</td>'
        +'<td><span class="chip">'+esc(COMPRA_ST[c.status]||c.status)+'</span>'+(cfPagCobrar(c)?' <span class="chip crit">Cobrar cliente</span>':'')+(cfDivAberta(c)?' <span class="chip crit">Divergência</span>':'')+(cfAtrasoSemAviso(c)?' <span class="chip crit">Avisar fornecedor</span>':'')+(pedidoAtrasado(c)&&c.avisoAtraso?' <span class="chip warn">Atrasada, avisado</span>':'')+'</td>'
        +'<td>'+(esc(forn)||'<span class="muted">—</span>')+'</td><td class="small">'+(c.pedido&&c.pedido.entregaPrevista?fmt(c.pedido.entregaPrevista):'—')+'</td>'+(ve?'<td class="num">'+(val!=null?brl(val):'—')+'</td>':'')
        +'<td style="white-space:nowrap">'+(Store.writable?cfAcaoEtapa(x.e,c,rot):'')+'</td></tr>'; }).join('')+'</tbody></table></div>'
    :'<div class="card empty"><h3>Nenhuma compra neste filtro</h3><p>Mude o filtro ou registre as necessidades dentro de cada obra.</p></div>';
  var hist=cmpHistorico(20), histHtml='<section class="card sec"><div class="card-h"><div><h2>Histórico recente</h2><p class="muted small">Últimos movimentos das compras, de todas as obras.</p></div></div>'+(hist.length?'<ul class="alerts">'+hist.map(function(x){ return '<li><span class="dot"></span><div class="grow"><strong>'+esc(x.c.item)+'</strong> <span class="muted">· '+esc(x.o.nome)+'</span><div class="small muted">'+fmt((x.d||'').slice(0,10))+': '+esc(COMPRA_ST[x.h.de]||'—')+' → <strong>'+esc(COMPRA_ST[x.h.para]||x.h.para)+'</strong>'+(x.h.nota?' · '+esc(x.h.nota):'')+(x.h.por?' · '+esc(Names.get(x.h.por)):'')+'</div></div><button type="button" class="linkbtn small" data-act="compra-abrir" data-id="'+x.c.id+'">Abrir</button></li>'; }).join('')+'</ul>':'<div class="pad muted">Ainda não há movimentos.</div>')+'</section>';
  return '<div class="wrap">'+crumbs([['Compras']])+'<div class="sec-h"><div><h1>Compras</h1><p class="muted" style="margin-top:4px">O setor de compras em um lugar só: tudo que está em andamento nas obras, em qual das 11 etapas do fluxo cada compra está e o que pede atenção.</p></div><a class="btn" href="#/fluxo">Ver o fluxo de compras</a></div>'
    +kpis+'<div class="row" style="gap:8px;flex-wrap:wrap;margin:14px 0">'+selObra+selEt+'<span class="row" style="gap:6px;flex-wrap:wrap">'+sit+'</span></div>'+tbl+histHtml+'</div>';
}
COBX.vCompras=vCompras; COBX.cmpDreHtml=cmpDreHtml; COBX.pagQuemObra=pagQuemObra; COBX.cmpTodas=cmpTodas; COBX.cmpHistorico=cmpHistorico;
Object.assign(AG,{ 'cmp-sit':function(d){ ui.cmpF=Object.assign(cmpFiltros(),{sit:d.s}); render(); } });
document.addEventListener('change',function(e){ var el=e.target.closest&&e.target.closest('[data-chg="cmp-f"]'); if(!el) return; var f=cmpFiltros(); f[el.dataset.k]=el.value; ui.cmpF=f; render(); });

/* ---------- quadro no DRE da obra ---------- */
function cmpDreHtml(o,per){
  if(!modAdm(o)) return '';
  var cs=byObra('compras',o.id), cont={}, val={}, tot=0, pagas={cliente:0,cariati:0}, naoPagas=0;
  cs.forEach(function(c){ var e=compraEtapaFluxo(o,c)||12, v=c.pedido?Number(c.pedido.total)||0:0; cont[e]=(cont[e]||0)+1; val[e]=(val[e]||0)+v; tot+=v;
    if(c.status==='pago'){ var q=(c.pagto&&c.pagto.quem)||cmpPagQuem(o); pagas[q]=(pagas[q]||0)+v; } else if(c.pedido) naoPagas+=v; });
  var lib=ETAPAS.filter(function(e){ return etapaDoc(o.id,e.n).status==='liberada'; }).length, serv=cadServicos(o), nServ=serv.length;
  var linhas=FLX_COMPRAS.map(function(s){ return cont[s.n]?'<tr><td>'+pad2(s.n)+' · '+esc(s.nome)+'</td><td class="num">'+cont[s.n]+'</td><td class="num">'+brl(r2(val[s.n]||0))+'</td></tr>':''; }).join('')+(cont[12]?'<tr><td>Encerradas (conferidas)</td><td class="num">'+cont[12]+'</td><td class="num">'+brl(r2(val[12]||0))+'</td></tr>':'');
  var entr=cs.filter(function(c){ return c.status==='conferido'||c.status==='pago'; }).length, pend=cs.filter(function(c){ return ['necessidade','cotacao','aprovacao','pedido','entregue'].indexOf(c.status)>=0; }).length;
  return '<section class="card sec"><div class="card-h"><div><h2>Compras e entregas</h2><p class="muted small">Situação das compras na etapa do fluxo e quem pagou. Quem paga é definido na obra ('+esc(PAG_QUEM[cmpPagQuem(o)])+'). O valor pago pelo cliente entra no repasse acima; o pago pela Cariati não é repasse e fica a reembolsar.</p></div><a class="btn sm" href="#/obra/'+o.id+'/compras">Abrir compras</a></div><div class="pad">'
    +(cs.length?'<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Etapa do fluxo de compras</th><th>Compras</th><th>Valor dos pedidos</th></tr></thead><tbody>'+linhas+'<tr style="font-weight:600"><td>Total</td><td class="num">'+cs.length+'</td><td class="num">'+brl(r2(tot))+'</td></tr></tbody></table></div>':'<p class="muted">Nenhuma compra registrada nesta obra.</p>')
    +'<div class="grid cols2" style="margin-top:12px"><div><h4 class="small muted">Quem pagou</h4><ul class="lst"><li>Pagas pelo cliente: '+brl(r2(pagas.cliente||0))+'</li><li>Pagas pela Cariati (a reembolsar): '+brl(r2(pagas.cariati||0))+'</li><li>Pedidos ainda sem pagamento: '+brl(r2(naoPagas))+'</li></ul></div>'
    +'<div><h4 class="small muted">Entregas e entregáveis</h4><ul class="lst"><li>Compras entregues e conferidas: '+entr+' de '+cs.length+' ('+pend+' pendentes)</li><li>Etapas da obra liberadas: '+lib+' de 22</li><li>Serviços contratados marcados: '+nServ+' de '+gestTodos().length+'</li></ul></div></div></div></section>';
}
