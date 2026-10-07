/* ================= PAINEL DE EVOLUÇÃO DA OBRA E GERADOR DE CRONOGRAMA =================
   Painel: a primeira tela de cada obra. Mostra o executado contra o pretendido, etapa por etapa, o quadro de situação,
   os atrasos (cronograma, entregas, pagamentos, relatórios) e o que vem pela frente (liberações, entregas, pagamentos).
   Gerador: monta as atividades do cronograma a partir do tipo da obra (nova, reforma, ampliação ou por etapas). */
var OBRA_TIPOS=['Obra nova','Reforma','Ampliação','Por etapas'];
/* duração relativa de cada etapa (peso) e etapas sugeridas por tipo de obra; tudo pode ser ajustado no formulário */
var CRONO_PESO={1:2,2:1,3:2,4:2,5:3,6:5,7:4,8:3,9:3,10:2,11:1,12:2,13:2,14:4,15:3,16:3,17:3,18:2,19:2,20:3,21:1,22:0};
var CRONO_TIPO={'Obra nova':[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],
  'Reforma':[1,2,7,9,12,13,14,16,17,19,21],
  'Ampliação':[1,2,3,5,6,7,8,9,12,13,14,15,16,17,19,21],
  'Por etapas':[]};
/* ---------- indicadores de prazo a partir das atividades ---------- */
function pnPlanejado(oid){
  var ats=byObra('atividades',oid), hj=hoje(), tot=0, acc=0;
  ats.forEach(function(a){ var d=Math.max(1,diffDays(a.inicio,a.fim)+1); tot+=d; acc+=d*Math.max(0,Math.min(1,(diffDays(a.inicio,hj)+1)/d)); });
  return tot?acc/tot*100:null;
}
function pnProjecao(oid,fis,plan){
  var ats=byObra('atividades',oid); if(!ats.length) return null;
  var ini=ats.reduce(function(m,a){ return a.inicio<m?a.inicio:m; },ats[0].inicio), fim=ats.reduce(function(m,a){ return a.fim>m?a.fim:m; },ats[0].fim), hj=hoje();
  var out={ini:ini, fim:fim, proj:fim, atraso:0};
  if(plan>0&&fis!=null&&hj>ini&&hj<fim){ var spi=Math.max(0.5,Math.min(1.5,(fis||0.01)/plan)), dias=diffDays(ini,fim)+1; out.proj=addDays(ini,Math.ceil(dias/spi)-1); out.atraso=Math.max(0,diffDays(fim,out.proj)); out.spi=spi; }
  else if(hj>=fim&&fis!=null&&fis<100){ out.atraso=diffDays(fim,hj); out.proj=hj; }
  return out;
}
function pnCurva(oid){
  var ats=byObra('atividades',oid); if(!ats.length) return null;
  var ini=ats.reduce(function(m,a){ return a.inicio<m?a.inicio:m; },ats[0].inicio), fim=ats.reduce(function(m,a){ return a.fim>m?a.fim:m; },ats[0].fim), hj=hoje();
  var pts=[], d=segunda(ini), fimS=addDays(segunda(fim),7); if(hj>fimS) fimS=addDays(segunda(hj),7);
  var tot=ats.reduce(function(s,a){ return s+Math.max(1,diffDays(a.inicio,a.fim)+1); },0);
  var plan=function(dia){ var s=0; ats.forEach(function(a){ var du=Math.max(1,diffDays(a.inicio,a.fim)+1); s+=du*Math.max(0,Math.min(1,(diffDays(a.inicio,dia)+1)/du)); }); return s/tot*100; };
  for(var i=0;d<=fimS&&i<120;d=addDays(d,7),i++) pts.push(d);
  var real=avancoCron(oid), iHj=-1; pts.forEach(function(x,k){ if(x<=hj) iHj=k; });
  return {labels:pts.map(function(x){ return fmtC(x); }), plan:pts.map(function(x){ return Math.round(plan(x)*10)/10; }), real:pts.map(function(x,k){ return k===iHj&&real!=null?Math.round(real*10)/10:null; }), hoje:iHj};
}
/* ---------- painel ---------- */
function tPainelObra(o){
  var oid=o.id, ve=gVe(), hj=hoje(), et=vgEtapas(oid), A=vgAtrasos([o]), T=vgTimeline([o]), ats=byObra('atividades',oid);
  var lib=et.filter(function(e){ return e.lib; }).length, fis=avancoCron(oid); if(!(fis>0)&&lib&&ats.length) fis=lib/22*100; var plan=pnPlanejado(oid), proj=pnProjecao(oid,fis,plan);
  var dev=(fis!=null&&plan!=null)?fis-plan:null, ppc=ppcAtual(oid), nAtr=A.ativ.length;
  var sit=!ats.length?{k:'',t:'sem cronograma'}:(proj&&proj.atraso>0?{k:'crit',t:'atrasada ≈ '+plural(proj.atraso,'dia','dias')}:(dev!=null&&dev<-5?{k:'warn',t:'abaixo do pretendido'}:{k:'ok',t:'no prazo'}));
  var hero=heroHtml({pct:fis!=null?fis:lib/22*100, rotulo:fis!=null?'Executado':'Etapas liberadas', sub:plan!=null?'pretendido hoje: '+Math.round(plan)+'%':lib+' de 22 etapas', eyebrow:'Evolução da obra', titulo:o.nome,
    texto:(o.tipoObra?o.tipoObra+' · ':'')+(sit.t==='sem cronograma'?'Monte o cronograma para acompanhar o pretendido.':'Situação do prazo: '+sit.t+'.'),
    orbes:[orbHtml(plan,'Pretendido',plan==null?'—':null,'cy'),orbHtml(lib/22*100,'Liberadas',lib+'/22'),orbHtml(ppc?ppc.ppc*100:null,'PPC semana',ppc?null:'—')]});
  var kp=function(t,v,s,k,to){ return (to?'<a class="kpi-a" href="'+to+'" style="color:inherit;text-decoration:none">':'')+'<div class="kpi'+(k?' '+k:'')+'"><div class="kpi-r">'+t+'</div><div class="kpi-v"><span class="num">'+v+'</span></div><div class="kpi-s">'+s+'</div></div>'+(to?'</a>':''); };
  var b='#/obra/'+oid+'/', maxA=A.ativ.reduce(function(m,x){ return Math.max(m,x.d); },0), nEt=A.etapas.filter(function(x){ return x.e.sit==='atrasada'; }).length;
  var kpis='<div class="kpis">'
    +kp('Atividades atrasadas',nAtr,nAtr?'a mais antiga há '+plural(maxA,'dia','dias'):'nenhuma',nAtr?'crit':'ok',b+'cronograma')
    +kp('Etapas fora do pretendido',A.etapas.length,nEt?plural(nEt,'atrasada','atrasadas'):(A.etapas.length?'abaixo da meta':'todas no ritmo'),nEt?'crit':(A.etapas.length?'warn':'ok'),b+'etapas')
    +kp('Entregas de compras atrasadas',A.entregas.length,A.pedir.length?plural(A.pedir.length,'pedido fora do prazo','pedidos fora do prazo'):'fornecedores em dia',A.entregas.length?'crit':(A.pedir.length?'warn':'ok'),b+'compras')
    +(ve?kp('Pagamentos vencidos',A.pagos.length,A.pagos.length?'conferir no financeiro':'em dia',A.pagos.length?'crit':'ok',b+'pagprazos'):'')
    +kp('Relatórios quinzenais em atraso',A.quinz.length,A.quinz.length?'engenharia deve emitir':'em dia',A.quinz.length?'warn':'ok',b+'quinzenal')
    +kp('Término previsto',proj?fmt(proj.fim):'—',proj?(proj.atraso>0?'projeção: '+fmt(proj.proj)+' ('+plural(proj.atraso,'dia','dias')+' a mais)':'dentro do cronograma'):'monte o cronograma',proj&&proj.atraso>0?'crit':(proj?'ok':''),b+'cronograma')+'</div>';
  /* curva S grande: a física (com orçamento) ou a do cronograma */
  var curva='';
  if(ats.length){
    var cv=pnCurva(oid), pf=function(v){ return Math.round(v)+'%'; };
    curva='<section class="card sec"><div class="card-h"><div><h2>Curva S: pretendido × executado</h2><p class="muted small">A linha tracejada é o ritmo do cronograma; o ponto é o executado de hoje.</p></div><a class="btn sm" href="'+b+'cronograma">Abrir cronograma</a></div><div class="pad">'
      +svgGrafico({titulo:'Avanço acumulado', labels:cv.labels, linhas:[{nome:'Pretendido',cor:'var(--steel)',tracejado:true,v:cv.plan},{nome:'Executado',cor:'var(--ok)',v:cv.real}], fmt:pf, altura:300, largBarra:34})+'</div></section>';
  } else curva='<section class="card empty sec"><h3>Ainda não há cronograma desta obra</h3><p>Gere o cronograma pelo tipo da obra (nova, reforma, ampliação ou por etapas) e ajuste as datas depois.</p><p style="margin-top:12px"><button class="btn primary" data-act="crono-gerar" data-oid="'+oid+'" data-write>Gerar cronograma</button></p></section>';
  /* etapa por etapa */
  var linhas=et.filter(function(e){ return e.j||e.st!=='nao_iniciada'||e.lib; });
  var tab=linhas.length?'<section class="card sec"><div class="card-h"><div><h2>Etapa por etapa</h2><p class="muted small">Situação pretendida hoje contra o executado. Toque na etapa para abrir.</p></div></div><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Etapa</th><th>Situação</th><th>Janela</th><th>Pretendido</th><th>Executado</th><th>Desvio</th></tr></thead><tbody>'
    +linhas.map(function(e){ var s=VG_SIT[e.sit], ex=e.lib?100:Math.round(e.fis*100), pr=e.lib?100:(e.esp==null?null:Math.round(e.esp*100)), dv=pr==null?null:ex-pr;
      return '<tr'+(e.sit==='atrasada'?' style="background:var(--crit-soft)"':'')+'><td><a href="'+b+'etapa/'+e.n+'">'+e.n+'. '+esc(e.nome)+'</a></td><td><span class="chip '+s[0]+'">'+esc(s[1])+'</span>'+(e.atraso?' <span class="tiny muted">'+plural(e.atraso,'dia','dias')+'</span>':'')+'</td><td class="small">'+(e.j?fmtC(e.j.ini)+' → '+fmtC(e.j.fim):'—')+'</td><td class="num">'+(pr==null?'—':pr+'%')+'</td>'
        +'<td><div class="hbar" style="grid-template-columns:1fr 40px;padding:0"><div class="t"><i style="width:'+ex+'%'+(e.sit==='atrasada'?';background:var(--crit)':'')+'"></i></div><span class="num">'+ex+'%</span></div></td><td class="num" style="color:'+(dv==null?'inherit':(dv<-10?'var(--crit)':(dv<0?'var(--amber)':'var(--ok)')))+'">'+(dv==null?'—':(dv>0?'+':'')+dv+' pp')+'</td></tr>'; }).join('')+'</tbody></table></div></section>':'';
  /* quadro de situação (resumo do Kanban) */
  var st={}; STATUS_ORDER.forEach(function(s){ st[s]=0; }); ETAPAS.forEach(function(e){ st[etapaDoc(oid,e.n).status]++; });
  var col={iniciar:0,execucao:0,atrasada:0,concluida:0}; ats.forEach(function(a){ var av=a.avanco||0; if(av>=100) col.concluida++; else if(a.fim<hj) col.atrasada++; else if(av>0||a.inicio<=hj) col.execucao++; else col.iniciar++; });
  var kb='<section class="card sec"><div class="card-h"><div><h2>Quadro de situação</h2><p class="muted small">Resumo do Kanban de etapas e de atividades.</p></div><a class="btn sm" href="'+b+'etapas">Abrir o quadro</a></div><div class="pad"><div class="grid cols2"><div><h3 class="small muted">Etapas do protocolo</h3><div class="evo-leg" style="margin-top:8px">'+STATUS_ORDER.map(function(s){ return '<span><strong class="num">'+st[s]+'</strong> '+esc(STATUS[s])+'</span>'; }).join('')+'</div></div><div><h3 class="small muted">Atividades do cronograma</h3><div class="evo-leg" style="margin-top:8px"><span><strong class="num">'+col.iniciar+'</strong> A iniciar</span><span><strong class="num">'+col.execucao+'</strong> Em execução</span><span><strong class="num" style="color:var(--crit)">'+col.atrasada+'</strong> Atrasadas</span><span><strong class="num">'+col.concluida+'</strong> Concluídas</span></div></div></div></div></section>';
  /* o que vem pela frente */
  var lim=addDays(hj,15), prox=T.filter(function(x){ return x.data<=lim; }).slice(0,10), CAT={'etapa-fim':'Liberação','etapa-ini':'Início de etapa',prest:'Prestador',entrega:'Entrega',pedir:'Pedir até',loc:'Locação',pag:'Pagamento',aporte:'Aporte'};
  var aguard=et.filter(function(e){ return e.st==='aguardando_vistoria'; });
  var pf='<section class="card sec"><div class="card-h"><div><h2>Próximos 15 dias</h2><p class="muted small">Liberações, entregas de fornecedores, prestadores e pagamentos.</p></div></div><ul class="alerts">'
    +(aguard.length?aguard.map(function(e){ return '<li><span class="dot warn"></span><div class="grow"><strong>Vistoria pendente:</strong> etapa '+e.n+' — '+esc(e.nome)+'</div><a class="small" href="'+b+'etapa/'+e.n+'">Abrir</a></li>'; }).join(''):'')
    +(prox.length?prox.map(function(x){ return '<li><span class="dot"></span><div class="grow"><strong>'+fmtC(x.data)+'</strong> · '+esc(CAT[x.cat]||x.cat)+': '+esc(x.txt)+'</div>'+(x.to?'<a class="small" href="'+x.to+'">Abrir</a>':'')+'</li>'; }).join(''):(aguard.length?'':'<li class="muted">Nada programado para os próximos 15 dias.</li>'))
    +'</ul></section>';
  /* detalhes dos atrasos */
  var det=[]; A.ativ.slice(0,6).forEach(function(x){ det.push('<li><span class="dot crit"></span><div class="grow"><strong>'+esc(x.a.nome)+'</strong> <span class="muted">— '+plural(x.d,'dia','dias')+' de atraso ('+(x.a.avanco||0)+'%)</span></div><a class="small" href="'+b+'cronograma">Abrir</a></li>'); });
  A.entregas.slice(0,4).forEach(function(x){ det.push('<li><span class="dot crit"></span><div class="grow"><strong>'+esc(x.c.item)+'</strong> <span class="muted">— entrega '+plural(x.d,'dia','dias')+' atrasada'+(fornNome(x.c.pedido.fornecedorId)?' · '+esc(fornNome(x.c.pedido.fornecedorId)):'')+'</span></div><a class="small" href="'+b+'compras">Abrir</a></li>'); });
  A.pagos.slice(0,4).forEach(function(x){ det.push('<li><span class="dot crit"></span><div class="grow"><strong>'+esc(x.p.desc)+'</strong> <span class="muted">— vencido há '+plural(x.d,'dia','dias')+'</span></div><a class="small" href="'+x.p.to+'">Abrir</a></li>'); });
  var atr='<section class="card sec"><div class="card-h"><div><h2>Onde está o atraso</h2></div></div>'+(det.length?'<ul class="alerts">'+det.join('')+'</ul>':'<div class="pad"><span class="dot ok" style="margin-right:8px"></span>Nenhum atraso de cronograma, entrega ou pagamento.</div>')+'</section>';
  var botoes='<div class="row no-print" style="gap:8px;flex-wrap:wrap;margin-bottom:6px"><button class="btn" data-act="crono-gerar" data-oid="'+oid+'" data-write>Gerar cronograma</button><a class="btn" href="'+b+'cronograma">Cronograma</a><a class="btn" href="'+b+'etapas">Etapas e Kanban</a><a class="btn" href="'+b+'metaevo">Meta × evolução</a></div>';
  return '<div class="stack">'+hero+botoes+kpis+curva+tab+'<div class="grid cols2"><div class="stack">'+atr+kb+'</div><div class="stack">'+pf+'</div></div></div>';
}
COBX.tPainelObra=tPainelObra; COBX.pnPlanejado=pnPlanejado; COBX.pnProjecao=pnProjecao;

/* ---------- gerador de cronograma por tipo de obra ---------- */
function cronoDistribuir(inicio,fim,etapas){
  var total=Math.max(etapas.length*2,diffDays(inicio,fim)+1), pesos=etapas.map(function(n){ return Math.max(1,CRONO_PESO[n]||1); }), soma=pesos.reduce(function(a,b){ return a+b; },0);
  var out=[], cur=inicio, usados=0;
  etapas.forEach(function(n,i){
    var ult=i===etapas.length-1, d=ult?Math.max(2,total-usados):Math.max(2,Math.round(total*pesos[i]/soma)); usados+=d;
    var f=addDays(cur,d-1); out.push({etapa:n, inicio:cur, fim:f}); cur=addDays(f,1);
  });
  return out;
}
function cronoGerarForm(oid){
  var o=G('obras',oid), tipo=o.tipoObra||'Obra nova', tem=byObra('atividades',oid).length, sel=CRONO_TIPO[tipo]||[];
  openForm({title:'Gerar cronograma', submit:'Gerar cronograma', wide:true, semPassos:true,
    intro:'O cronograma sai com uma atividade por etapa, em sequência, com a duração proporcional ao peso de cada etapa. Depois você ajusta datas, prestadores e predecessoras.'+(tem?' <strong>Já existem '+tem+' atividades: as novas serão acrescentadas.</strong>':''),
    fields:[
      {name:'tipo',label:'Tipo da obra',type:'select',options:OBRA_TIPOS.map(function(t){ return [t,t]; }),value:tipo},
      {name:'padrao',label:'Marcar as etapas sugeridas para o tipo escolhido?',type:'select',options:[['nao','Não, usar as marcações abaixo'],['sim','Sim, substituir pelas sugeridas']],value:tem?'nao':'sim'},
      [{name:'inicio',label:'Início da obra',type:'date',required:true,value:o.inicio||hoje()},{name:'fim',label:'Término desejado',type:'date',required:true,value:addDays(o.inicio||hoje(),(tipo==='Reforma'?120:(tipo==='Por etapas'?60:300)))}],
      {name:'etapas',label:'Etapas que entram no cronograma',type:'checks',options:ETAPAS.filter(function(e){ return e.n!==22; }).map(function(e){ return [String(e.n),e.n+'. '+e.nome]; }),value:sel.map(String)}],
    onSubmit:async function(v){
      var tp=v.tipo||tipo, lista=(v.padrao==='sim'?(CRONO_TIPO[tp]||[]):(v.etapas||[]).map(Number)).filter(function(n){ return n>=1&&n<=21; }).sort(function(a,b){ return a-b; });
      if(!lista.length) return 'Marque ao menos uma etapa.';
      if(!v.inicio||!v.fim) return 'Informe o início e o término.';
      if(v.fim<=v.inicio) return 'O término precisa ser depois do início.';
      var cur=G('obras',oid), rec=Object.assign({}, cur, {tipoObra:tp}); delete rec.id; await Store.set('obras',oid,rec);
      var plano=cronoDistribuir(v.inicio,v.fim,lista), ant='';
      for(var i=0;i<plano.length;i++){ var p=plano[i], id=nid();
        await Store.set('atividades',id,{obraId:oid, nome:etapaInfo(p.etapa).nome, etapa:p.etapa, prestadorId:'', inicio:p.inicio, fim:p.fim, pred:ant, avanco:0, geradaPor:'tipo-obra'}); ant=id; }
      toast('Cronograma gerado: '+plural(plano.length,'atividade','atividades')+'.'); location.hash='#/obra/'+oid+'/cronograma';
    }});
}
COBX.cronoDistribuir=cronoDistribuir; COBX.CRONO_TIPO_N=function(t){ return CRONO_TIPO[t].length; };
Object.assign(AG,{ 'crono-gerar':function(d){ cronoGerarForm(d.oid); } });
