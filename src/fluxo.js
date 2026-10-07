/* ================= FLUXO GERAL DA OBRA =================
   Mostra as 6 fases e as 22 etapas do protocolo, ligadas por setas, com a porta de liberação de cada etapa.
   Rotas: #/fluxo · #/fluxo/<obra> · #/fluxo/<obra>/<etapa>   (use "-" no lugar da obra para ver só o protocolo).
   Tudo vem do protocolo que o app já usa; com uma obra escolhida, cada etapa mostra a situação dela. */
function fluxoRota(){ var p=(location.hash||'').replace(/^#\/?/,'').split('/'); return {oid:p[1]&&p[1]!=='-'?p[1]:'', n:Number(p[2])||0, sem:p[1]==='-'}; }
function fluxoLink(oid,n){ return '#/fluxo/'+(oid||'-')+(n?'/'+n:''); }
/* ritos de gestão: o que acontece o tempo todo, ao lado das 22 etapas */
function fluxoRitos(o){
  var oid=o?o.id:'', b=o?'#/obra/'+oid+'/':'', ve=gVe(), st={};
  if(o){
    var qp=qzPendentes(o), me=ve?metaEvo(oid):null, pf=pendenciasFim(oid), pd=pedDaObra(oid);
    var feN=byObra('compras',oid).concat(pd).filter(function(x){ return x.foraEscopo&&!foraEscopoOk(x,true)&&x.status!=='recusado'&&x.status!=='cancelado'&&x.status!=='pago'; }).length;
    var venc=ve?pagamentosObra(oid).filter(function(p){ return !p.pago&&p.venc&&p.venc<hoje(); }).length:0;
    st.quinzenal=qp.length?{k:'warn',t:plural(qp.length,'quinzena sem relatório','quinzenas sem relatório')}:{k:'ok',t:'em dia'};
    st.metaevo=me?(me.kpi.nCrit?{k:'crit',t:plural(me.kpi.nCrit,'etapa desalinhada','etapas desalinhadas')}:{k:'ok',t:me.kpi.alinh==null?'sem etapa em andamento':'alinhado'}):null;
    st.pedidos=ve?(pd.filter(function(p){ return pedStatus(p)==='aprovacao'; }).length?{k:'warn',t:plural(pd.filter(function(p){ return pedStatus(p)==='aprovacao'; }).length,'aguardando aprovação','aguardando aprovação')}:{k:'ok',t:'nada pendente'}):null;
    st.fora=feN?{k:'warn',t:plural(feN,'sem aditivo assinado','sem aditivo assinado')}:{k:'ok',t:'nenhum pendente'};
    st.pagprazos=ve?(venc?{k:'crit',t:plural(venc,'pagamento vencido','pagamentos vencidos')}:{k:'ok',t:'sem vencidos'}):null;
    var nf=pf.abertas.length+pf.semConferir.length+pf.locacoes.length+pf.pedidos.length;
    st.fim=fimDeObra(o)?(nf?{k:'warn',t:plural(nf,'pendência','pendências')}:{k:'ok',t:'sem pendências'}):{k:'',t:'ainda não é fim de obra'};
  }
  var R=[['Apontamentos e conclusão por etapa','Em cada etapa: o que ficou pendente, riscos, decisões e a conclusão registrada na liberação.',o?b+'etapas':'','apont'],
    ['Relatório quinzenal ao cliente','A cada 15 dias, a engenharia emite: texto, posicionamento, fotos e avanço.',o?b+'quinzenal':'','quinzenal'],
    ['Meta × evolução × pagamentos','Toda semana na reunião de compras e medição: o pago acompanha o executado?',o&&ve?b+'metaevo':'','metaevo'],
    ['Pedidos de pagamento e orçamentos','Todo pagamento fora de compra e medição: vários orçamentos, escolha justificada, alçada.',o&&ve?b+'pedidos':'','pedidos'],
    ['Fora do escopo','Aditivo assinado antes de comprar, contratar ou pagar. Emergência: autorização escrita e aditivo em 5 dias.',o?b+'pedidos':'','fora'],
    ['Pagamentos e prazos do mês','Todo mês: o fluxo de pagamento acompanha o que as etapas programaram?',o&&ve?b+'pagprazos':'','pagprazos'],
    ['Final de obra × compras','Na janela de fim de obra: fechar pedidos, entregas, locações e estoque antes de encerrar.',o?b+'encerramento':'','fim']];
  return '<section class="card sec flx-ritos"><div class="card-h"><div><h2>Ritos de gestão</h2><p class="muted small">Acontecem ao longo de todas as etapas e alimentam as portas de liberação.</p></div></div><ul class="alerts">'
    +R.map(function(r){ var s=st[r[3]]; return '<li><span class="dot '+(s?s.k:'')+'"></span><div class="grow"><strong>'+esc(r[0])+'</strong><div class="muted small">'+esc(r[1])+'</div></div>'+(s?'<span class="chip '+s.k+'">'+esc(s.t)+'</span>':'')+(r[2]?' <a class="small" href="'+r[2]+'">Abrir</a>':'')+'</li>'; }).join('')+'</ul></section>';
}

/* ---------- jornada da obra no app: o que se pode fazer em cada momento ---------- */
function fluxoTab(o,t){ return o&&abaMapa()[t]?'#/obra/'+o.id+'/'+t:''; }
function fluxoJornada(o){
  var staff=Store.papel!=='cliente';
  var J=[
    ['Cadastro','Quem é o cliente, onde é a obra, o que foi contratado e para onde vão os pagamentos.',[['Cadastros (clientes, prestadores, fornecedores, usuários)',staff?'#/cadastros':''],['Cadastro da obra: cliente, endereço, serviços contratados, conta',fluxoTab(o,'cadastro')],['Arquivos recebidos dos outros aplicativos',fluxoTab(o,'cadastro')]]],
    ['Planejamento','Orçamento, cronograma e programação de compras antes de abrir a frente.',[['Orçamento',fluxoTab(o,'orcamento')],['Cronograma e linha de base',fluxoTab(o,'cronograma')],['Físico-financeiro',fluxoTab(o,'fisfin')],['Contratos e frentes de prestadores',fluxoTab(o,'contratos')]]],
    ['Execução e qualidade','As 22 etapas, cada uma liberada na vistoria, com apontamentos e conclusão.',[['Etapas, quadro de evolução e apontamentos',fluxoTab(o,'etapas')],['Diário de obra',fluxoTab(o,'diario')],['Ocorrências e fichas de verificação',fluxoTab(o,'ocorrencias')],['Semana e PPC',fluxoTab(o,'semana')]]],
    ['Suprimentos e financeiro','Compras, medições, pedidos de pagamento e fluxo do mês.',[['Compras e cotações',fluxoTab(o,'compras')],['Medição de serviços',fluxoTab(o,'medicao')],['Pedidos de pagamento e fora do escopo',fluxoTab(o,'pedidos')],['Financeiro e pagamentos e prazos',fluxoTab(o,'financeiro')],['Estoque e locações',fluxoTab(o,'estoque')]]],
    ['Gestão','Leitura rápida para decidir: atrasos, o que comprar, meta × evolução e relatórios ao cliente.',[['Visão geral (7, 15, 30, 90 e 120 dias)',staff?'#/visao':''],['Meta × evolução × pagamentos',fluxoTab(o,'metaevo')],['Relatório quinzenal ao cliente',fluxoTab(o,'quinzenal')],['Relatório mensal',fluxoTab(o,'relatorio')],['DRE e fluxo de caixa',staff?'#/dre':'']]],
    ['Entrega e pós-obra','Fim de obra alinhado às compras, entrega formal, garantias e visitas.',[['Encerramento e P0',fluxoTab(o,'encerramento')],['Pré-entrega',fluxoTab(o,'entrega')],['Garantias, chamados e satisfação',fluxoTab(o,'garantias')]]]
  ];
  return '<section class="card sec flx-jor"><div class="card-h"><div><h2>O que dá para fazer no aplicativo</h2><p class="muted small">Da esquerda para a direita, na ordem em que a obra acontece. Toque em um item para abrir.'+(o?'':' Escolha uma obra acima para ligar os atalhos.')+'</p></div></div><ol class="jor">'
    +J.map(function(f,i){ return '<li><span class="jor-n">'+(i+1)+'</span><h3>'+esc(f[0])+'</h3><p class="muted small">'+esc(f[1])+'</p><ul>'+f[2].map(function(x){ return '<li>'+(x[1]?'<a href="'+x[1]+'">'+esc(x[0])+'</a>':'<span class="muted">'+esc(x[0])+'</span>')+'</li>'; }).join('')+'</ul></li>'; }).join('')+'</ol></section>';
}
/* cada serviço do catálogo aponta para a tela do app onde ele acontece */
var FLX_SERV_TELA={go_consult:'quinzenal',go_visitas:'diario',go_acomp:'etapas',go_fin:'financeiro',go_compras:'compras',
  ad_compra:'compras',ad_oc:'compras',ad_conf:'compras',ad_ctrlmat:'estoque',ad_aprov:'compras',ad_cot:'compras',ad_contr:'contratos',ad_ctrlpr:'contratos',ad_med:'medicao',
  ad_op:'pedidos',ad_cpr:'financeiro',ad_fluxo:'financeiro',ad_plan:'metaevo',ad_adit:'pedidos',ad_nf:'financeiro',ad_rel:'relatorio',
  en_prot:'etapas',en_viz:'etapas',en_conf:'etapas',en_mob:'etapas',en_fisc:'etapas',en_qual:'ocorrencias',en_recm:'compras',en_epi:'ocorrencias',en_sem:'semana',en_duv:'ocorrencias',en_eq:'diario',en_contr:'contratos',en_kpi:'metaevo',
  en_res:'diario',en_reg:'diario',en_mud:'pedidos',en_risco:'ocorrencias',en_curva:'cronograma',en_entrega:'encerramento'};
function fluxoServicos(o){
  if(!o||Store.papel==='cliente'||Store.papel==='campo') return '';
  var sel=cadServicos(o), n=sel.length, tot=gestTodos().length;
  var grupos=GEST_SERV.map(function(g){
    var li=g[1].filter(function(i){ return sel.indexOf(i[0])>=0; });
    if(!li.length) return '';
    return '<div class="esc-g"><h4>'+esc(g[0])+'</h4><ul class="esc-l">'+li.map(function(i){ var t=fluxoTab(o,FLX_SERV_TELA[i[0]]); return '<li class="on"><span aria-hidden="true">✓</span> '+(t?'<a href="'+t+'">'+esc(i[1])+'</a>':esc(i[1]))+'</li>'; }).join('')+'</ul></div>';
  }).join('');
  return '<section class="card sec"><div class="card-h"><div><h2>Serviços contratados nesta obra</h2><p class="muted small"><span class="chip steel">'+esc(CAD_MOD_NOME[o.modalidade]||o.modalidade||'—')+'</span> '+n+' de '+tot+' serviços. Cada um leva à tela onde acontece. Para mudar a lista: <a href="#/obra/'+o.id+'/cadastro">Cadastro da obra</a>.</p></div></div><div class="pad">'+(n?'<div class="esc">'+grupos+'</div>':'<p class="muted">Nenhum serviço marcado ainda.</p>')+'</div></section>';
}
function vFluxo(){
  var r=fluxoRota(), obras=L('obras').sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); });
  if(!r.oid&&!r.sem&&obras.length) r.oid=obras[0].id;
  var o=r.oid?G('obras',r.oid):null; if(r.oid&&!o) r.oid='';
  var crit={}; if(o) byObra('ocorrencias',o.id).forEach(function(x){ if(ocAberta(x)&&x.gravidade==='critica'&&x.etapa) crit[x.etapa]=1; });
  var sel=r.n>=1&&r.n<=22?r.n:0;
  var seletor='<div class="row" style="gap:10px;flex-wrap:wrap"><label class="muted small" for="fluxo-obra">Mostrar a situação da obra:</label><select id="fluxo-obra" data-chg="fluxo-obra" aria-label="Obra"><option value="-"'+(o?'':' selected')+'>Só o protocolo (sem obra)</option>'
    +obras.map(function(x){ return '<option value="'+esc(x.id)+'"'+(o&&o.id===x.id?' selected':'')+'>'+esc(x.nome)+'</option>'; }).join('')+'</select></div>';
  var leg=o?'<div class="flx-leg" aria-label="Legenda">'+STATUS_ORDER.map(function(s){ return '<span><i class="flx-dot '+s+'"></i>'+STATUS[s]+'</span>'; }).join('')+'<span><i class="flx-dot crit"></i>Ocorrência crítica aberta</span></div>':'<p class="muted small">Escolha uma obra para ver em que etapa ela está.</p>';
  var h='<div class="wrap"><div class="sec-h"><div><h1>Fluxo geral</h1><p class="muted" style="margin-top:4px">O caminho de uma obra, da pré-obra ao pós-obra. Cada etapa só é liberada na vistoria (losango).</p></div>'+seletor+'</div>'+leg;
  h+=fluxoJornada(o)+fluxoServicos(o)+fluxoRitos(o);
  h+='<div class="flx"><div class="flx-fim ini"><strong>Início</strong><span>A obra abre com terreno regularizado, projetos, orçamento, contrato e licenças</span></div>';
  FASES.forEach(function(f,fi){
    h+='<section class="flx-fase" aria-label="Fase '+(fi+1)+': '+esc(f.nome)+'"><h2><span class="flx-num">'+(fi+1)+'</span>'+esc(f.nome)+'</h2><div class="flx-row">';
    f.etapas.forEach(function(n,i){
      var e=etapaInfo(n), st=o?etapaDoc(o.id,n).status:'', cr=crit[n]?' crit':'', on=sel===n?' sel':'';
      var nf=fichasResumo(o?o.id:'-',n);
      h+=(i?'<span class="flx-seta" aria-hidden="true"></span>':'')+'<a class="flx-no'+(st?' '+st:'')+cr+on+'" href="'+fluxoLink(o?o.id:'',n)+'" aria-current="'+(sel===n?'true':'false')+'" title="'+esc(e.nome+(st?' — '+STATUS[st]:''))+'"><span class="flx-n">'+n+'</span><span class="flx-t">'+esc(e.nome)+'</span>'+(st?'<span class="flx-s">'+STATUS[st]+(cr?' · crítica':'')+'</span>':'')+'</a><span class="flx-porta" title="Vistoria de liberação da etapa '+n+'" aria-hidden="true"></span>';
    });
    h+='</div></section>'+(fi<FASES.length-1?'<div class="flx-liga" aria-hidden="true"></div>':'');
  });
  h+='<div class="flx-fim"><strong>Entrega e pós-obra</strong><span>Entrega, garantias e visitas de 30, 90 e 180 dias</span></div></div>';
  if(sel){
    var e=etapaInfo(sel), ed=o?etapaDoc(o.id,sel):null, fr=o?fichasResumo(o.id,sel):null, it=e.itens||[], vf=e.verif||[];
    h+='<section class="card sec flx-det" id="flx-det"><div class="card-h"><div><h2>Etapa '+sel+' — '+esc(e.nome)+'</h2>'+(ed?'<span class="chip '+({liberada:'ok',aguardando_vistoria:'warn',em_execucao:'steel'}[ed.status]||'')+'">'+STATUS[ed.status]+'</span>':'')+'</div>'+(o?'<a class="btn primary" href="#/obra/'+o.id+'/etapa/'+sel+'">Abrir na obra</a>':'')+'</div><div class="pad">'
      +'<p><strong>Objetivo.</strong> '+esc(e.objetivo||'')+'</p>'
      +'<p class="flx-lib"><span class="flx-losango" aria-hidden="true"></span><span><strong>Só libera quando:</strong> '+esc(e.liberacao||'')+'</span></p>'
      +(o&&gVe()?fluxoMetaEtapa(o.id,sel):'')
      +(o?fluxoApont(o.id,sel):'')
      +(fr?'<p class="muted small">Fichas de verificação desta obra: '+fr.aprov+' aprovadas de '+fr.total+(fr.rep?' · '+fr.rep+' reprovada(s)':'')+(fr.pend?' · '+fr.pend+' sem inspeção':'')+'.</p>':'')
      +'<div class="flx-cols"><div><h3>O que se executa ('+it.length+')</h3><ul class="lst">'+it.slice(0,12).map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+(it.length>12?'<li class="muted">e mais '+(it.length-12)+' itens</li>':'')+'</ul></div>'
      +'<div><h3>O que se verifica ('+vf.length+')</h3><ul class="lst">'+vf.map(function(x){ return '<li>'+esc(x.item||x)+'</li>'; }).join('')+'</ul></div></div></div></section>';
  }
  return h+'</div>';
}
function fluxoApont(oid,n){
  var l=etapaApont(oid,n), c=etapaConcl(oid,n), pend=apontPendentes(oid,n), h='';
  if(!l.length&&!c) return '<p class="muted small">Nenhum apontamento nem conclusão registrados nesta etapa. <a href="#/obra/'+oid+'/etapa/'+n+'">Abrir a etapa</a></p>';
  h+='<div class="small"><strong>Apontamentos:</strong> '+plural(l.length,'registro','registros')+(pend.length?' · <span class="chip warn">'+plural(pend.length,'pendência aberta','pendências abertas')+'</span>':'');
  if(l[0]) h+='<div class="muted" style="margin-top:4px">Último ('+fmt((l[0].data||'').slice(0,10))+', '+esc(APONT_TIPO[l[0].tipo]||'')+'): '+esc(short(l[0].texto,160))+'</div>';
  h+='</div>';
  if(c) h+='<div class="small" style="margin-top:8px"><strong>Conclusão:</strong> <span class="chip '+CONCL_RES[c.resultado][0]+'">'+CONCL_RES[c.resultado][1]+'</span> '+esc(short(c.resumo,200))+'</div>';
  return '<div style="margin:8px 0">'+h+' <a class="small" href="#/obra/'+oid+'/etapa/'+n+'">Abrir a etapa</a></div>';
}
function fluxoMetaEtapa(oid,n){
  var l=metaEvo(oid).linhas.filter(function(x){ return x.n===n; })[0]; if(!l) return '';
  return '<p class="small"><strong>Meta × evolução × pagamentos:</strong> meta do cronograma '+(l.esp==null?'—':Math.round(l.esp*100)+'%')+' · executado '+Math.round(l.fis*100)+'% · pago '+(l.pagoPct==null?'—':Math.round(l.pagoPct*100)+'%')+' ('+brl(l.pago)+' de '+brl(l.orc)+')'+(l.k?' <span class="chip '+l.k+'">'+(l.k==='crit'?'Desalinhada':'Atenção')+'</span> '+esc(l.mot.join(' ')):'')+'</p>';
}
COBX.vFluxo=vFluxo;
