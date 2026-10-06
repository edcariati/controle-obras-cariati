/* ================= APONTAMENTOS E CONCLUSÃO DE CADA ETAPA + QUADRO DE EVOLUÇÃO =================
   Cada etapa da obra ganha:
   · apontamentos: o que a equipe escreve ao longo da execução (observação, decisão, pendência, risco, avanço), com ligação opcional a uma atividade;
   · conclusão: o fechamento da etapa (resultado, o que foi feito, o que aprendemos, o que ficou pendente), pedido ao liberar.
   Ficam no próprio registro da etapa (coleção "etapas"), então seguem as mesmas permissões e o mesmo histórico.
   O quadro de evolução mostra as etapas e as atividades (serviços) em colunas, com gráficos de avanço por fase. */
var APONT_TIPO={observacao:'Observação', decisao:'Decisão', pendencia:'Pendência', risco:'Risco', avanco:'Avanço'};
var APONT_COR={observacao:'', decisao:'steel', pendencia:'warn', risco:'crit', avanco:'ok'};
var CONCL_RES={conforme:['ok','Concluída conforme'], ressalvas:['warn','Concluída com ressalvas'], pendente:['crit','Concluída com pendências']};
function etapaApont(oid,n){ return (etapaDoc(oid,n).apontamentos||[]).slice().sort(function(a,b){ return (b.data||'')<(a.data||'')?-1:1; }); }
function etapaConcl(oid,n){ return etapaDoc(oid,n).conclusao||null; }
function apontPendentes(oid,n){ return etapaApont(oid,n).filter(function(a){ return a.tipo==='pendencia'&&!a.resolvidoEm; }); }
function etapaSalvar(oid,n,patch){
  var e=etapaDoc(oid,n), upd=Object.assign({}, e, patch); var id=e.id; delete upd.id;
  return Store.set('etapas', id, upd);
}

/* ---------- formulários ---------- */
function apontForm(oid,n,a){
  var ats=byObra('atividades',oid).filter(function(x){ return x.etapa===n; });
  var f=[{name:'tipo',label:'Tipo',type:'select',options:Object.keys(APONT_TIPO).map(function(k){ return [k,APONT_TIPO[k]]; }),value:(a&&a.tipo)||'observacao'},
    {name:'texto',label:'O que você quer registrar',type:'textarea',rows:4,required:true,value:a&&a.texto,hint:'Escreva do jeito que a equipe vai entender daqui a um mês: o quê, onde e por quê.'}];
  if(ats.length) f.push({name:'atividadeId',label:'Serviço (atividade) relacionado, se houver',type:'select',options:selOpts(ats.map(function(x){ return [x.id,x.nome]; }),'Nenhum'),value:(a&&a.atividadeId)||''});
  f.push({name:'fotos',label:'Fotos',type:'photos',value:(a&&a.fotos)||[]});
  openForm({title:a?'Editar apontamento':'Novo apontamento', intro:'Etapa '+n+' — '+esc(etapaInfo(n).nome), wide:true, fields:f,
    onSubmit:async function(v){
      if(!(v.texto||'').trim()) return 'Escreva o apontamento.';
      var lista=(etapaDoc(oid,n).apontamentos||[]).slice();
      var rec=Object.assign({id:nid(), data:new Date().toISOString(), por:Store.uid||null}, a||{}, {tipo:v.tipo, texto:v.texto.trim(), atividadeId:v.atividadeId||'', fotos:(v.fotos||[]).slice(0,8)});
      if(a){ lista=lista.map(function(x){ return x.id===a.id?rec:x; }); } else lista.push(rec);
      await etapaSalvar(oid,n,{apontamentos:lista.slice(-300)});
      toast('Apontamento salvo.');
    }});
}
function conclusaoForm(oid,n,aoLiberar){
  var c=etapaConcl(oid,n)||{}, ap=apontPendentes(oid,n);
  var intro=(aoLiberar?'<strong>A etapa foi liberada.</strong> Registre agora como ela terminou. ':'')+(ap.length?'<span style="color:var(--crit)">Há '+plural(ap.length,'pendência aberta','pendências abertas')+' nos apontamentos desta etapa.</span>':'');
  openForm({title:'Conclusão da etapa '+n+' — '+etapaInfo(n).nome, wide:true, intro:intro||'Como a etapa terminou, o que foi feito e o que fica para as próximas.', submit:'Salvar conclusão', fields:[
    {name:'resultado',label:'Resultado',type:'radio',required:true,options:Object.keys(CONCL_RES).map(function(k){ return [k,CONCL_RES[k][1]]; }),value:c.resultado||''},
    {name:'resumo',label:'O que foi feito',type:'textarea',rows:4,required:true,value:c.resumo,hint:'Resumo da execução: serviços concluídos, materiais, prestadores e prazos.'},
    {name:'aprendizados',label:'O que aprendemos (para as próximas obras)',type:'textarea',rows:3,value:c.aprendizados},
    {name:'pendencias',label:'O que ficou pendente para as etapas seguintes',type:'textarea',rows:3,value:c.pendencias},
    {name:'fotos',label:'Fotos da etapa concluída',type:'photos',value:c.fotos||[]}],
    onSubmit:async function(v){
      if(!v.resultado) return 'Escolha o resultado.'; if(!(v.resumo||'').trim()) return 'Escreva o que foi feito.';
      if(v.resultado==='pendente'&&!(v.pendencias||'').trim()) return 'Descreva as pendências que ficaram.';
      await etapaSalvar(oid,n,{conclusao:{resultado:v.resultado, resumo:v.resumo.trim(), aprendizados:(v.aprendizados||'').trim(), pendencias:(v.pendencias||'').trim(), fotos:(v.fotos||[]).slice(0,8), data:c.data||hoje(), por:c.por||Store.uid||null, atualizadoEm:new Date().toISOString()}});
      toast('Conclusão registrada.');
    }});
}

/* ---------- cartões da página da etapa ---------- */
function apontCard(oid,n){
  var l=etapaApont(oid,n), ats={}; byObra('atividades',oid).forEach(function(x){ ats[x.id]=x.nome; });
  var corpo=l.length?l.map(function(a){
    return '<div class="ficha" style="grid-template-columns:1fr auto"><div><div class="row" style="gap:6px"><span class="chip '+(APONT_COR[a.tipo]||'')+'">'+esc(APONT_TIPO[a.tipo]||'Observação')+'</span>'+(a.tipo==='pendencia'?(a.resolvidoEm?'<span class="chip ok">Resolvida em '+fmt(a.resolvidoEm.slice(0,10))+'</span>':'<span class="chip warn">Aberta</span>'):'')+(a.atividadeId&&ats[a.atividadeId]?'<span class="chip">'+esc(short(ats[a.atividadeId],32))+'</span>':'')+'<span class="tiny muted">'+fmt((a.data||'').slice(0,10))+' · '+esc(Names.get(a.por))+'</span></div>'
      +'<p style="white-space:pre-wrap;margin-top:6px">'+esc(a.texto)+'</p>'+thumbs(a.fotos)+'</div>'
      +'<div style="text-align:right;white-space:nowrap">'+(a.tipo==='pendencia'&&!a.resolvidoEm?'<button class="btn sm" data-act="apont-resolver" data-oid="'+oid+'" data-n="'+n+'" data-id="'+a.id+'" data-write>Resolver</button> ':'')+'<button class="btn sm" data-act="apont-editar" data-oid="'+oid+'" data-n="'+n+'" data-id="'+a.id+'" data-write>Editar</button> <button class="btn sm danger" data-act="apont-excluir" data-oid="'+oid+'" data-n="'+n+'" data-id="'+a.id+'" data-write>Excluir</button></div></div>'; }).join('')
    :'<p class="muted small" style="padding:14px 16px">Nenhum apontamento ainda. Registre decisões, pendências, riscos e o avanço da etapa.</p>';
  return '<section class="card"><div class="card-h"><div><h2>Apontamentos da etapa</h2><p class="muted small">'+plural(l.length,'registro','registros')+(apontPendentes(oid,n).length?' · '+plural(apontPendentes(oid,n).length,'pendência aberta','pendências abertas'):'')+'</p></div><button class="btn sm primary" data-act="apont-novo" data-oid="'+oid+'" data-n="'+n+'" data-write>+ Apontamento</button></div>'+corpo+'</section>';
}
function conclCard(oid,n,status){
  var c=etapaConcl(oid,n), r=c&&CONCL_RES[c.resultado];
  var corpo=c?'<div class="pad"><div class="row" style="gap:6px;margin-bottom:8px"><span class="chip '+r[0]+'">'+r[1]+'</span><span class="tiny muted">'+fmt(c.data)+(c.por?' · '+esc(Names.get(c.por)):'')+'</span></div>'
      +'<p class="small" style="font-weight:600">O que foi feito</p><p style="white-space:pre-wrap">'+esc(c.resumo)+'</p>'
      +(c.aprendizados?'<p class="small" style="font-weight:600;margin-top:10px">O que aprendemos</p><p style="white-space:pre-wrap">'+esc(c.aprendizados)+'</p>':'')
      +(c.pendencias?'<p class="small" style="font-weight:600;margin-top:10px">Ficou pendente</p><p style="white-space:pre-wrap">'+esc(c.pendencias)+'</p>':'')+thumbs(c.fotos)+'</div>'
    :'<p class="muted small" style="padding:14px 16px">'+(status==='liberada'?'A etapa foi liberada e ainda não tem conclusão registrada.':'A conclusão é registrada quando a etapa termina (o app pergunta ao liberar).')+'</p>';
  return '<section class="card"><div class="card-h"><div><h2>Conclusão da etapa</h2></div><button class="btn sm'+(status==='liberada'&&!c?' primary':'')+'" data-act="concl-editar" data-oid="'+oid+'" data-n="'+n+'" data-write>'+(c?'Editar conclusão':'Registrar conclusão')+'</button></div>'+corpo+'</section>';
}
Object.assign(AG,{
  'apont-novo':function(d){ apontForm(d.oid,Number(d.n),null); },
  'apont-editar':function(d){ var a=(etapaDoc(d.oid,Number(d.n)).apontamentos||[]).filter(function(x){ return x.id===d.id; })[0]; if(a) apontForm(d.oid,Number(d.n),a); },
  'apont-resolver':async function(d){ var n=Number(d.n), l=(etapaDoc(d.oid,n).apontamentos||[]).map(function(x){ return x.id===d.id?Object.assign({}, x, {resolvidoEm:new Date().toISOString(), resolvidoPor:Store.uid||null}):x; }); await etapaSalvar(d.oid,n,{apontamentos:l}); toast('Pendência resolvida.'); },
  'apont-excluir':async function(d){ var n=Number(d.n), ok=await confirmDlg('Excluir o apontamento?','<p>O registro sai da etapa e não dá para desfazer.</p>','Excluir',true); if(!ok) return; await etapaSalvar(d.oid,n,{apontamentos:(etapaDoc(d.oid,n).apontamentos||[]).filter(function(x){ return x.id!==d.id; })}); },
  'concl-editar':function(d){ conclusaoForm(d.oid,Number(d.n),false); },
  'qv-vista':function(d){ ui.qvVista=d.v; render(); }
});

/* ---------- quadro de evolução ---------- */
function evolFase(oid){
  return FASES.map(function(f){
    var es=f.etapas.map(function(n){ var x=fisicoEtapa(oid,n), j=janelaEtapa(oid,n), hj=hoje(), esp=j?Math.max(0,Math.min(1,(diffDays(j.ini,hj)+1)/j.dias)):null; return {n:n, fis:x.v, esp:esp, lib:x.liberada}; });
    var fis=es.reduce(function(s,x){ return s+x.fis; },0)/es.length, comEsp=es.filter(function(x){ return x.esp!=null; }), esp=comEsp.length?comEsp.reduce(function(s,x){ return s+x.esp; },0)/comEsp.length:null;
    return {nome:f.nome, n:es.length, lib:es.filter(function(x){ return x.lib; }).length, fis:fis, esp:esp};
  });
}
function evolPainel(o){
  var oid=o.id, st={}; STATUS_ORDER.forEach(function(s){ st[s]=0; });
  ETAPAS.forEach(function(e){ st[etapaDoc(oid,e.n).status]++; });
  var corSt={nao_iniciada:'var(--idle)', em_execucao:'var(--steel)', aguardando_vistoria:'var(--amber-bar)', liberada:'var(--ok)'};
  var seg='<div class="evo-seg" role="img" aria-label="Etapas por situação">'+STATUS_ORDER.map(function(s){ return st[s]?'<i style="flex:'+st[s]+';background:'+corSt[s]+'" title="'+esc(STATUS[s])+': '+st[s]+'"></i>':''; }).join('')+'</div>'
    +'<div class="evo-leg">'+STATUS_ORDER.map(function(s){ return '<span><i style="background:'+corSt[s]+'"></i>'+esc(STATUS[s])+' <strong class="num">'+st[s]+'</strong></span>'; }).join('')+'</div>';
  var fs=evolFase(oid);
  var g=svgGrafico({titulo:'Avanço por fase da obra', labels:fs.map(function(f,i){ return 'F'+(i+1); }), barras:[{nome:'Executado',cor:'var(--steel)',v:fs.map(function(f){ return Math.round(f.fis*100); })},{nome:'Meta do cronograma',cor:'var(--amber-bar)',opaco:true,v:fs.map(function(f){ return f.esp==null?0:Math.round(f.esp*100); })}], fmt:function(v){ return Math.round(v)+'%'; }});
  var legFase='<ol class="evo-fases">'+fs.map(function(f,i){ return '<li><strong>F'+(i+1)+'</strong> '+esc(f.nome)+' <span class="muted">· '+f.lib+'/'+f.n+' liberadas</span></li>'; }).join('')+'</ol>';
  var pend=0, concl=0, liberadas=0, apont=0;
  ETAPAS.forEach(function(e){ var d=etapaDoc(oid,e.n); pend+=(d.apontamentos||[]).filter(function(a){ return a.tipo==='pendencia'&&!a.resolvidoEm; }).length; apont+=(d.apontamentos||[]).length; if(d.status==='liberada'){ liberadas++; if(d.conclusao) concl++; } });
  var kpi=function(t,v,sub,k){ return '<div class="kpi'+(k?' '+k:'')+'"><div class="kpi-r">'+t+'</div><div class="kpi-v">'+v+'</div><div class="kpi-s">'+(sub||'&nbsp;')+'</div></div>'; };
  var k='<div class="kpis">'+kpi('Etapas liberadas','<span class="num">'+st.liberada+'/22</span>',Math.round(st.liberada/22*100)+'% do protocolo','')
    +kpi('Em execução e vistoria','<span class="num">'+(st.em_execucao+st.aguardando_vistoria)+'</span>',st.aguardando_vistoria?plural(st.aguardando_vistoria,'aguarda vistoria','aguardam vistoria'):'nenhuma aguardando',st.aguardando_vistoria?'warn':'')
    +kpi('Apontamentos',' <span class="num">'+apont+'</span>',pend?plural(pend,'pendência aberta','pendências abertas'):'sem pendências abertas',pend?'warn':'ok')
    +kpi('Conclusões registradas','<span class="num">'+concl+'/'+liberadas+'</span>',liberadas?(concl<liberadas?plural(liberadas-concl,'etapa liberada sem conclusão','etapas liberadas sem conclusão'):'todas as liberadas'):'nenhuma liberada ainda',liberadas&&concl<liberadas?'warn':(liberadas?'ok':''))+'</div>';
  return heroHtml({pct:st.liberada/22*100,rotulo:'Etapas liberadas',sub:st.liberada+' de 22',eyebrow:'Evolução',titulo:o.nome,texto:pend?plural(pend,'pendência aberta nos apontamentos.','pendências abertas nos apontamentos.'):'Sem pendências abertas nos apontamentos.',orbes:[orbHtml((st.em_execucao+st.aguardando_vistoria)/22*100,'Em andamento',String(st.em_execucao+st.aguardando_vistoria)),orbHtml(liberadas?concl/liberadas*100:null,'Conclusões',liberadas?concl+'/'+liberadas:'—','cy')]})+'<section class="card pad" style="margin-bottom:14px"><div class="dash-h"><h2>Evolução da obra</h2><span class="muted small">Etapas do protocolo e atividades do cronograma</span></div>'+k+'<div class="evo-grid"><div>'+seg+g+'</div><div>'+legFase+'</div></div></section>';
}
function kcardAtividade(o,a){
  var av=a.avanco||0, hj=hoje(), atras=av<100&&a.fim<hj, dias=atras?diffDays(a.fim,hj):0, ap=byObra('atividades',o.id);
  return '<div class="kcard'+(atras?' crit':'')+'"><button type="button" class="linkbtn t" data-act="ativ-editar" data-id="'+a.id+'">'+esc(a.nome)+'</button><div class="m">'+(a.etapa?'<a class="chip" href="#/obra/'+o.id+'/etapa/'+a.etapa+'">Etapa '+a.etapa+'</a>':'')+(a.prestadorId?'<span class="chip steel">'+esc(short(prestNome(a.prestadorId)||'Prestador',22))+'</span>':'')+(atras?'<span class="chip crit">'+plural(dias,'dia','dias')+' de atraso</span>':'')+'</div>'
    +'<div class="hbar" style="grid-template-columns:1fr 38px;padding:8px 0 0"><div class="t"><i style="width:'+av+'%'+(atras?';background:var(--crit)':'')+'"></i></div><span class="num">'+av+'%</span></div><div class="tiny muted" style="margin-top:4px">'+fmtC(a.inicio)+' a '+fmtC(a.fim)+'</div></div>';
}
function quadroAtividades(o){
  var hj=hoje(), ats=byObra('atividades',o.id).sort(cmpAt);
  var col=function(a){ var av=a.avanco||0; if(av>=100) return 'concluida'; if(a.fim<hj) return 'atrasada'; if(av>0||a.inicio<=hj) return 'execucao'; return 'iniciar'; };
  var C=[['iniciar','A iniciar'],['execucao','Em execução'],['atrasada','Atrasadas'],['concluida','Concluídas']];
  if(!ats.length) return '<div class="card empty"><h3>Nenhuma atividade no cronograma</h3><p>Cadastre as atividades de cada etapa para acompanhar os serviços aqui.</p><p style="margin-top:12px"><button class="btn primary" data-act="ativ-nova" data-oid="'+o.id+'" data-write>+ Atividade</button></p></div>';
  return '<div class="board">'+C.map(function(c){ var l=ats.filter(function(a){ return col(a)===c[0]; }); return '<section class="col"><header>'+c[1]+' <span class="n num">'+l.length+'</span></header><div class="cards">'+(l.length?l.map(function(a){ return kcardAtividade(o,a); }).join(''):'<p class="muted small" style="padding:8px 4px">Nenhuma atividade</p>')+'</div></section>'; }).join('')+'</div>';
}
function tEvolucao(o){
  var v=ui.qvVista==='atividades'?'atividades':'etapas';
  var bar='<div class="row spread no-print" style="margin:4px 0 12px;flex-wrap:wrap;gap:8px"><p class="muted small" style="max-width:62ch">'+(v==='etapas'?'O quadro segue o protocolo: uma etapa só começa com a anterior liberada em vistoria, e só é liberada com todas as fichas aprovadas e sem ocorrência crítica aberta.':'Os serviços do cronograma por situação. Toque em uma atividade para atualizar o avanço.')+'</p><div class="row" style="gap:4px"><button class="btn sm'+(v==='etapas'?' primary':'')+'" data-act="qv-vista" data-v="etapas">Etapas</button><button class="btn sm'+(v==='atividades'?' primary':'')+'" data-act="qv-vista" data-v="atividades">Atividades (serviços)</button></div></div>';
  return evolPainel(o)+bar+(v==='etapas'?tEtapasQuadro(o):quadroAtividades(o));
}
function tEtapas(o){ return tEvolucao(o); }
/* chips e barra de avanço no cartão da etapa */
function kcardExtra(oid,n){
  var d=etapaDoc(oid,n), ap=(d.apontamentos||[]), pend=ap.filter(function(a){ return a.tipo==='pendencia'&&!a.resolvidoEm; }).length, h='';
  if(pend) h+='<span class="chip warn">'+plural(pend,'pendência','pendências')+'</span>'; else if(ap.length) h+='<span class="chip">'+plural(ap.length,'apontamento','apontamentos')+'</span>';
  if(d.status==='liberada') h+=d.conclusao?'<span class="chip '+CONCL_RES[d.conclusao.resultado][0]+'">Conclusão</span>':'<span class="chip warn">Sem conclusão</span>';
  return h;
}
function kcardBarra(oid,n){
  var f=fisicoEtapa(oid,n), p=Math.round(f.v*100); if(f.semAtividades&&!f.liberada) return '';
  return '<div class="hbar" style="grid-template-columns:1fr 38px;padding:8px 0 0"><div class="t"><i style="width:'+p+'%"></i></div><span class="num">'+p+'%</span></div>';
}
