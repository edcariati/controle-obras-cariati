/* ================= SOLICITAÇÕES E MUDANÇAS (protocolo) =================
   Registro único de tudo o que muda o combinado: projeto, obra, aditivo, material ou escopo.
   Dados sem valores em "solicitacoes" (campo registra); variação em R$ em "solicitacoesImpacto" (mesmo id),
   que o perfil campo nunca lê. Liga-se ao diário (data/diarioId) e ao aditivo (origem). */
var SOL_TIPOS=[['mudanca_projeto','Mudança de projeto'],['solicitacao_obra','Solicitação de obra'],['aditivo','Solicitação de aditivo'],['mudanca_material','Mudança de material'],['mudanca_escopo','Mudança de escopo (técnica)']];
var SOL_ORIGENS=[['cliente','Cliente'],['tecnica','Equipe técnica Cariati'],['projetista','Projetista'],['prestador','Prestador / execução']];
var SOL_ST={registrada:'Registrada', em_analise:'Em análise', aguardando_decisao:'Aguardando decisão', aprovada:'Aprovada', recusada:'Recusada', concluida:'Concluída'};
var SOL_ABERTA=['registrada','em_analise','aguardando_decisao'];
function solNome(lista,k){ return (lista.filter(function(x){ return x[0]===k; })[0]||[k,k||'—'])[1]; }
function solDaObra(oid){ return byObra('solicitacoes',oid).sort(function(a,b){ return a.numero-b.numero; }); }
function solProtocolo(o,s){ var n=String(s.numero||0); while(n.length<3) n='0'+n; return (o&&o.codigo?o.codigo:'OBRA')+'-SOL'+n; }
function solImpacto(id){ return G('solicitacoesImpacto',id)||null; }
function solCusto(s){ var i=solImpacto(s.id); return i&&i.custo!=null?Number(i.custo)||0:null; }
function solAditivo(s){ return byObra('aditivos',s.obraId).filter(function(a){ return a.origem&&a.origem.col==='solicitacoes'&&a.origem.id===s.id; })[0]||null; }
function solEditavel(s){ return SOL_ABERTA.indexOf(s.status)>=0; }
function solHist(s,acao,obs){ return (s.hist||[]).concat([{acao:acao, data:new Date().toISOString(), por:Store.uid||null, obs:obs||''}]).slice(-30); }
function solDoDia(oid,e){ return solDaObra(oid).filter(function(s){ return s.diarioId===e.id||(!s.diarioId&&s.data===e.data); }); }
function solResumo(oid){
  var l=solDaObra(oid), ab=l.filter(function(s){ return solEditavel(s); }), cust=function(f){ return r2(l.filter(f).reduce(function(t,s){ return t+(solCusto(s)||0); },0)); };
  return {total:l.length, abertas:ab.length, aguardando:l.filter(function(s){ return s.status==='aguardando_decisao'; }).length,
    aprovadas:l.filter(function(s){ return s.status==='aprovada'||s.status==='concluida'; }).length,
    custoPendente:cust(function(s){ return solEditavel(s); }), custoAprovado:cust(function(s){ return s.status==='aprovada'||s.status==='concluida'; }),
    prazoAprovado:l.filter(function(s){ return s.status==='aprovada'||s.status==='concluida'; }).reduce(function(t,s){ return t+(Number(s.impactoPrazoDias)||0); },0)};
}

function solForm(oid, s, pre){
  var novo=!s, o=G('obras',oid), ve=gVe(), imp=s?solImpacto(s.id):null; pre=pre||{};
  if(s && !solEditavel(s)){ blockDlg('Solicitação não pode ser editada',['Solicitação '+SOL_ST[s.status].toLowerCase()+' fica registrada como foi decidida. Para mudar algo, abra uma nova solicitação.'],'Edição bloqueada'); return; }
  var f=[
    [{name:'tipo',label:'Tipo da solicitação',type:'select',required:true,options:selOpts(SOL_TIPOS,'Selecione…'),value:s?s.tipo:(pre.tipo||'')},{name:'origem',label:'Quem pediu',type:'select',required:true,options:selOpts(SOL_ORIGENS,'Selecione…'),value:s?s.origem:(pre.origem||'')}],
    [{name:'solicitante',label:'Nome de quem pediu',value:s&&s.solicitante,ph:'Ex.: Sra. Almeida, Eng. Paulo'},{name:'data',label:'Data do pedido',type:'date',required:true,value:s?s.data:(pre.data||hoje())}],
    [{name:'etapa',label:'Etapa afetada',type:'select',options:etapaOptions('Geral'),value:s&&s.etapa?String(s.etapa):''},{name:'local',label:'Local da obra',value:s&&s.local,ph:'Ex.: varanda frontal'}],
    {name:'titulo',label:'Assunto',required:true,value:s&&s.titulo,ph:'Ex.: Ampliar varanda e trocar guarda-corpo por vidro'},
    {name:'descricao',label:'O que foi pedido ou proposto',type:'textarea',required:true,rows:3,value:s&&s.descricao},
    {name:'justificativa',label:'Por que (motivo)',type:'textarea',rows:2,value:s&&s.justificativa,ph:'Decisão do cliente, incompatibilidade de projeto, imprevisto de obra…'},
    {name:'impactoDesc',label:'Impacto: o que muda em custo, prazo, projeto ou qualidade',type:'textarea',rows:3,value:s&&s.impactoDesc,hint:'Preencha antes de enviar para decisão: o cliente decide em cima disto.'},
    [{name:'impactoPrazoDias',label:'Impacto no prazo (dias)',type:'number',step:1,value:s?s.impactoPrazoDias:0}].concat(ve?[{name:'custo',label:'Variação de custo estimada (R$)',type:'number',step:'0.01',value:imp&&imp.custo!=null?imp.custo:'',hint:'Positivo = acréscimo; negativo = economia.'}]:[]),
    {name:'anexos',label:'Desenho, foto ou mensagem do pedido',type:'anexos',value:(s&&s.anexos)||[]}
  ];
  openForm({title:novo?'Nova solicitação':'Editar solicitação '+solProtocolo(o,s), wide:true,
    intro:novo?'Registre o pedido no protocolo. Ele recebe um número, aparece no diário do dia e no relatório, e só vira execução depois de decidido.':'',
    fields:f,
    extra:novo?'':'<button type="button" class="btn danger" data-act="sol-excluir" data-id="'+s.id+'" style="margin-right:auto">Excluir</button>',
    onSubmit:async function(v){
      if(!v.tipo) return 'Escolha o tipo.';
      if(!v.origem) return 'Diga quem pediu.';
      if(!v.data) return 'Informe a data do pedido.';
      if(!(v.titulo||'').trim()) return 'Dê um assunto à solicitação.';
      if(!(v.descricao||'').trim()) return 'Descreva o que foi pedido.';
      var dias=Number(v.impactoPrazoDias)||0; if(dias<0) return 'O impacto no prazo não pode ser negativo.';
      var num=s?s.numero:solDaObra(oid).reduce(function(m,x){ return Math.max(m,x.numero||0); },0)+1, id=s?s.id:nid();
      var rec=Object.assign({status:'registrada', criadoEm:new Date().toISOString(), por:Store.uid||null, hist:[]}, s||{}, {obraId:oid, numero:num, tipo:v.tipo, origem:v.origem, solicitante:(v.solicitante||'').trim(), data:v.data, etapa:v.etapa?Number(v.etapa):0, local:(v.local||'').trim(), titulo:v.titulo.trim(), descricao:v.descricao.trim(), justificativa:(v.justificativa||'').trim(), impactoDesc:(v.impactoDesc||'').trim(), impactoPrazoDias:dias, anexos:v.anexos||[]});
      if(novo){ if(pre.diarioId) rec.diarioId=pre.diarioId; rec.hist=solHist(rec,'registrada'); }
      await Store.set('solicitacoes', id, rec);
      if(ve && v.custo!==''&&v.custo!=null && !isNaN(Number(v.custo))) await Store.set('solicitacoesImpacto', id, {obraId:oid, custo:Number(v.custo)});
      else if(ve && imp) await Store.set('solicitacoesImpacto', id, Object.assign({}, imp, {custo:null}));
      toast(novo?'Solicitação registrada: '+solProtocolo(o,rec)+'.':'Solicitação atualizada.');
    }});
}
function solMover(id,to){
  var s=G('solicitacoes',id); if(!s) return;
  if(to==='aguardando_decisao' && !(s.impactoDesc||'').trim()){ blockDlg('Falta descrever o impacto',['Preencha “Impacto: o que muda em custo, prazo, projeto ou qualidade” antes de enviar para decisão.'],'Envio bloqueado'); return; }
  if(to==='concluida'){
    var c=solCusto(s); if(c&&!solAditivo(s)){ blockDlg('Falta o aditivo',['Esta solicitação tem variação de custo. Gere o aditivo antes de concluir, para o valor entrar no orçamento revisado.'],'Conclusão bloqueada'); return; }
  }
  return Store.set('solicitacoes', id, Object.assign({}, s, {status:to, hist:solHist(s,to)}));
}
function solDecidir(id){
  var s=G('solicitacoes',id), o=G('obras',s.obraId);
  openForm({title:'Decisão sobre '+solProtocolo(o,s), intro:esc(s.titulo)+(s.impactoPrazoDias?' · +'+s.impactoPrazoDias+' dias':'')+(gVe()&&solCusto(s)!=null?' · variação '+brl(solCusto(s)):'')+'. Registre quem decidiu e como ficou documentado.',
    fields:[{name:'resultado',label:'Decisão',type:'radio',required:true,options:[['aprovada','Aprovada'],['recusada','Recusada']]},
      [{name:'data',label:'Data da decisão',type:'date',required:true,value:hoje()},{name:'quem',label:'Quem decidiu',required:true,ph:'Ex.: cliente, Sra. Almeida'}],
      {name:'ref',label:'Como foi decidido',type:'textarea',required:true,rows:2,ph:'Ex.: aprovado por WhatsApp em 12/03, print anexado.'},
      {name:'anexos',label:'Comprovante (print, e-mail ou documento)',type:'anexos',value:[]}],
    submit:'Registrar decisão',
    onSubmit:async function(v){
      if(!v.resultado) return 'Escolha aprovada ou recusada.';
      if(!(v.quem||'').trim()) return 'Diga quem decidiu.';
      if(!(v.ref||'').trim()) return 'Registre como foi decidido (obrigatório).';
      await Store.set('solicitacoes', id, Object.assign({}, s, {status:v.resultado, decisao:{data:v.data, quem:v.quem.trim(), ref:v.ref.trim(), anexos:v.anexos||[]}, hist:solHist(s,v.resultado,v.quem.trim())}));
      toast('Decisão registrada.');
    }});
}

function solChip(s){ return '<span class="chip '+(s.status==='aprovada'||s.status==='concluida'?'ok':(s.status==='recusada'?'crit':(s.status==='aguardando_decisao'?'warn':'')))+'">'+SOL_ST[s.status]+'</span>'; }
function solAcoes(s){
  var a='<button class="btn sm ghost" data-act="sol-ver" data-id="'+s.id+'">Ver</button>';
  if(solEditavel(s)) a+='<button class="btn sm" data-act="sol-editar" data-id="'+s.id+'" data-write>Editar</button>';
  if(s.status==='registrada') a+='<button class="btn sm primary" data-act="sol-mover" data-id="'+s.id+'" data-to="em_analise" data-write>Iniciar análise</button>';
  if(s.status==='em_analise') a+='<button class="btn sm primary" data-act="sol-mover" data-id="'+s.id+'" data-to="aguardando_decisao" data-write>Enviar para decisão</button>';
  if(s.status==='aguardando_decisao') a+='<button class="btn sm primary" data-act="sol-decidir" data-id="'+s.id+'" data-write>Registrar decisão</button>';
  if(s.status==='aprovada'&&gVe()){ if(!solAditivo(s)) a+='<button class="btn sm" data-act="sol-aditivo" data-id="'+s.id+'" data-write>Gerar aditivo</button>'; a+='<button class="btn sm primary" data-act="sol-mover" data-id="'+s.id+'" data-to="concluida" data-write>Marcar concluída</button>'; }
  return a;
}
function solCard(o,s,compacto){
  var c=gVe()?solCusto(s):null, ad=solAditivo(s);
  return '<article class="entry"><div class="row spread"><div class="row" style="gap:6px"><strong class="num">'+esc(solProtocolo(o,s))+'</strong>'+solChip(s)+'<span class="chip steel">'+esc(solNome(SOL_TIPOS,s.tipo))+'</span></div><div class="row">'+solAcoes(s)+'</div></div>'
    +'<p style="margin-top:8px"><strong>'+esc(s.titulo)+'</strong></p>'
    +(compacto?'':'<p class="small" style="white-space:pre-wrap;margin-top:4px">'+esc(s.descricao)+'</p>')
    +'<p class="small muted" style="margin-top:6px">'+esc(solNome(SOL_ORIGENS,s.origem))+(s.solicitante?' · '+esc(s.solicitante):'')+' · '+fmt(s.data)+(s.etapa?' · etapa '+s.etapa:'')+(s.local?' · '+esc(s.local):'')+'</p>'
    +'<div class="row" style="gap:6px;margin-top:6px">'+(s.impactoPrazoDias?'<span class="chip warn">+'+s.impactoPrazoDias+' dias</span>':'')+(c!=null&&c!==0?'<span class="chip '+(c>0?'warn':'ok')+'">'+(c>0?'+':'')+brl(c)+'</span>':'')+(ad?'<span class="chip">Aditivo nº '+ad.numero+' ('+ADT_ST[ad.status]+')</span>':'')+'</div></article>';
}
function tSolicitacoes(o){
  var oid=o.id, all=solDaObra(oid), f=ui.solF||'', r=solResumo(oid), ve=gVe();
  var lista=all.filter(function(s){ return !f||(f==='abertas'?solEditavel(s):s.status===f); }).reverse();
  var head='<div class="sec-h"><div><h2>Solicitações e mudanças</h2><p class="muted small">Protocolo de tudo que muda o combinado: projeto, obra, aditivo, material ou escopo. Nada é executado ou comprado por conta de um pedido sem decisão registrada.</p></div><button class="btn primary" data-act="sol-nova" data-oid="'+oid+'" data-write>+ Nova solicitação</button></div>';
  var kp=function(t,v,sub){ return '<div class="card pad"><div class="small muted">'+t+'</div><div class="num" style="font-size:24px;font-weight:600">'+v+'</div>'+(sub?'<div class="tiny muted">'+sub+'</div>':'')+'</div>'; };
  var cards='<div class="grid cols3" style="margin-top:14px">'+kp('Em aberto',r.abertas,r.aguardando?plural(r.aguardando,'aguarda decisão','aguardam decisão'):'')+kp('Aprovadas',r.aprovadas,r.prazoAprovado?'+'+r.prazoAprovado+' dias de prazo':'')+(ve?kp('Variação de custo',(r.custoAprovado>0?'+':'')+brl(r.custoAprovado),'aprovada · pendente '+brl(r.custoPendente)):kp('Total registrado',r.total,''))+'</div>';
  var chips='<div class="row" style="gap:6px;margin:14px 0">'+[['','Todas'],['abertas','Em aberto'],['aprovada','Aprovadas'],['recusada','Recusadas'],['concluida','Concluídas']].map(function(x){ return '<button class="btn sm'+(f===x[0]?' primary':'')+'" data-act="sol-filtro" data-f="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</div>';
  var corpo=lista.length?'<div class="card">'+lista.map(function(s){ return solCard(o,s); }).join('')+'</div>':'<div class="card empty"><h3>'+(all.length?'Nada neste filtro':'Nenhuma solicitação registrada')+'</h3><p>Pedido do cliente, mudança de projeto ou de material, ou ajuste de escopo da equipe técnica: registre aqui, com o impacto em custo e prazo.</p></div>';
  return head+cards+chips+corpo;
}
function solDiarioHtml(o,e){
  var l=solDoDia(o.id,e);
  return '<div class="sol-dia" style="margin-top:8px">'+(l.length?'<p class="small" style="font-weight:600">Solicitações do dia</p>'+l.map(function(s){ return '<p class="small" style="margin-top:4px"><button type="button" class="linkbtn" style="display:inline;width:auto" data-act="sol-ver" data-id="'+s.id+'">'+esc(solProtocolo(o,s))+'</button> · '+esc(s.titulo)+' '+solChip(s)+(s.impactoPrazoDias?' <span class="chip warn">+'+s.impactoPrazoDias+' d</span>':'')+'</p>'; }).join(''):'')
    +'<button class="btn sm ghost" data-act="sol-nova" data-oid="'+o.id+'" data-dia="'+e.id+'" data-data="'+e.data+'" data-write>+ Solicitação do dia</button></div>';
}
function solVer(id){
  var s=G('solicitacoes',id); if(!s) return; var o=G('obras',s.obraId), c=gVe()?solCusto(s):null, ad=solAditivo(s), d=s.decisao;
  var linha=function(k,v){ return v?'<p class="small" style="margin-top:6px"><span class="muted">'+k+':</span> '+v+'</p>':''; };
  openDlg('<div class="dlg-h"><h2>'+esc(solProtocolo(o,s))+'</h2><button type="button" class="btn ghost ico" data-close aria-label="Fechar">✕</button></div><div class="dlg-b">'
    +'<div class="row" style="gap:6px;margin-bottom:8px">'+solChip(s)+'<span class="chip steel">'+esc(solNome(SOL_TIPOS,s.tipo))+'</span>'+(s.impactoPrazoDias?'<span class="chip warn">+'+s.impactoPrazoDias+' dias</span>':'')+(c!=null&&c!==0?'<span class="chip '+(c>0?'warn':'ok')+'">'+(c>0?'+':'')+brl(c)+'</span>':'')+'</div>'
    +'<p><strong>'+esc(s.titulo)+'</strong></p><p style="white-space:pre-wrap;margin-top:4px">'+esc(s.descricao)+'</p>'
    +linha('Quem pediu',esc(solNome(SOL_ORIGENS,s.origem))+(s.solicitante?' — '+esc(s.solicitante):'')+' em '+fmt(s.data))+linha('Etapa / local',(s.etapa?'etapa '+s.etapa:'')+(s.local?' · '+esc(s.local):''))
    +(s.justificativa?'<p class="small" style="margin-top:10px;font-weight:600">Motivo</p><p class="small" style="white-space:pre-wrap">'+esc(s.justificativa)+'</p>':'')
    +(s.impactoDesc?'<p class="small" style="margin-top:10px;font-weight:600">Impacto</p><p class="small" style="white-space:pre-wrap">'+esc(s.impactoDesc)+'</p>':'')
    +anexosHtml(s.anexos)
    +(d?'<div class="callout '+(s.status==='recusada'?'crit':'ok')+'" style="margin-top:12px"><strong>'+(s.status==='recusada'?'Recusada':'Aprovada')+' em '+fmt(d.data)+' por '+esc(d.quem)+'</strong><p class="small" style="white-space:pre-wrap">'+esc(d.ref)+'</p>'+anexosHtml(d.anexos)+'</div>':'')
    +(ad?'<p class="small" style="margin-top:10px">Aditivo vinculado: nº '+ad.numero+' ('+ADT_ST[ad.status]+')</p>':'')
    +'<p class="small" style="margin-top:12px;font-weight:600">Histórico</p><ul class="lst">'+(s.hist||[]).map(function(h){ return '<li>'+fmt((h.data||'').slice(0,10))+' — '+esc(SOL_ST[h.acao]||h.acao)+' · '+esc(Names.get(h.por))+(h.obs?' ('+esc(h.obs)+')':'')+'</li>'; }).join('')+'</ul>'
    +'</div><div class="dlg-f"><button class="btn" data-act="sol-protocolo" data-id="'+s.id+'">Protocolo para imprimir</button><button class="btn primary" data-close>Fechar</button></div>', true);
}
function solProtocoloHtml(o,s){
  var css=(document.querySelector('style')||{}).textContent||'', c=gVe()?solCusto(s):null, d=s.decisao;
  var tr=function(k,v){ return '<tr><th style="text-align:left;width:32%;vertical-align:top">'+k+'</th><td style="white-space:pre-wrap">'+(v||'&nbsp;')+'</td></tr>'; };
  var ass=function(t){ return '<div style="flex:1;text-align:center"><div style="border-top:1px solid #000;margin-top:48px;padding-top:4px" class="small">'+t+'</div></div>'; };
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Protocolo '+esc(solProtocolo(o,s))+'</title><style>'+css+'\nbody{padding:16px;background:#fff;color:#000}.sol-doc{max-width:820px;margin:0 auto}</style></head><body><article class="sol-doc">'
    +'<img class="rel-logo" src="'+LOGO+'" alt="Cariati Arquitetura &amp; Gestão"><p class="small">Protocolo de solicitação de mudança</p><h1 style="margin:4px 0">'+esc(solProtocolo(o,s))+'</h1><p>'+esc(o.nome)+(o.endereco?' · '+esc(o.endereco):'')+'</p>'
    +'<table class="tbl" style="margin-top:12px"><tbody>'+tr('Tipo',esc(solNome(SOL_TIPOS,s.tipo)))+tr('Quem pediu',esc(solNome(SOL_ORIGENS,s.origem))+(s.solicitante?' — '+esc(s.solicitante):''))+tr('Data do pedido',fmt(s.data))+tr('Etapa / local',(s.etapa?'Etapa '+s.etapa:'')+(s.local?' · '+esc(s.local):''))
    +tr('Assunto',esc(s.titulo))+tr('O que foi pedido',esc(s.descricao))+tr('Motivo',esc(s.justificativa))+tr('Impacto (custo, prazo, projeto, qualidade)',esc(s.impactoDesc))+tr('Impacto no prazo',s.impactoPrazoDias?'+'+s.impactoPrazoDias+' dias':'Sem impacto')
    +(c!=null?tr('Variação de custo',c?(c>0?'+':'')+brl(c):'Sem variação'):'')+tr('Situação',SOL_ST[s.status])+(d?tr('Decisão',esc(d.quem)+' em '+fmt(d.data)+'\n'+esc(d.ref)):tr('Decisão',''))+'</tbody></table>'
    +'<div style="display:flex;gap:24px;margin-top:24px">'+ass('Solicitante')+ass('Cariati')+ass('Cliente')+'</div></article></body></html>';
}
function solRelDados(o,mes){
  var noMes=function(d){ return d&&String(d).slice(0,7)===mes; }, ve=gVe();
  var mapa=function(s){ var c=ve?solCusto(s):null; return {protocolo:solProtocolo(o,s), tipo:solNome(SOL_TIPOS,s.tipo), titulo:s.titulo, status:SOL_ST[s.status], origem:solNome(SOL_ORIGENS,s.origem), dias:Number(s.impactoPrazoDias)||0, custo:c}; };
  var l=solDaObra(o.id);
  return {noMes:l.filter(function(s){ return noMes(s.data); }).map(mapa), pendentes:l.filter(solEditavel).map(mapa)};
}
function alertasSol(o){
  var dias=o.diasEscalar==null?7:o.diasEscalar, hj=hoje(), A=[];
  var par=solDaObra(o.id).filter(function(s){ if(s.status!=='aguardando_decisao') return false; var h=(s.hist||[]).filter(function(x){ return x.acao==='aguardando_decisao'; }).pop(); return h&&diffDays(h.data.slice(0,10),hj)>dias; });
  if(par.length) A.push({k:'warn', t:plural(par.length,'solicitação aguardando decisão','solicitações aguardando decisão')+' há mais de '+dias+' dias: '+par.slice(0,2).map(function(s){ return solProtocolo(o,s); }).join(', ')+'.', to:'#/obra/'+o.id+'/solicitacoes'});
  return A;
}
Object.assign(AG,{
  'sol-nova':function(d){ var o=d.dia?G('diarios',d.dia):null; solForm(d.oid,null,{data:d.data||hoje(), diarioId:o?o.id:''}); },
  'sol-editar':function(d){ var s=G('solicitacoes',d.id); solForm(s.obraId,s); },
  'sol-ver':function(d){ solVer(d.id); },
  'sol-mover':function(d){ solMover(d.id,d.to); },
  'sol-decidir':function(d){ solDecidir(d.id); },
  'sol-filtro':function(d){ ui.solF=d.f||''; render(); },
  'sol-excluir':async function(d){ var ok=await confirmDlg('Excluir solicitação?','<p>O registro sai do protocolo, do diário e do relatório.</p>','Excluir',true); if(ok){ var s=G('solicitacoes',d.id); await Store.del('solicitacoes',d.id); if(s&&solImpacto(d.id)) await Store.del('solicitacoesImpacto',d.id); closeDlg(); } },
  'sol-aditivo':function(d){ var s=G('solicitacoes',d.id), c=solCusto(s)||0; aditivoForm(s.obraId,null,{origem:{col:'solicitacoes',id:s.id}, descricao:s.titulo+'. '+s.descricao, tipo:c<0?'supressao':'acrescimo', impactoPrazoDias:Number(s.impactoPrazoDias)||0}); },
  'sol-protocolo':function(d){ var s=G('solicitacoes',d.id), o=G('obras',s.obraId); baixar('protocolo-'+solProtocolo(o,s)+'.html', solProtocoloHtml(o,s), 'text/html').then(function(ok){ if(ok) toast('Protocolo baixado: abra e imprima ou salve como PDF.'); }); }
});
COBX.solDaObra=solDaObra; COBX.solProtocoloHtml=solProtocoloHtml; COBX.solResumo=solResumo; COBX.solProtocolo=solProtocolo; COBX.tSolicitacoes=tSolicitacoes; COBX.alertasSol=alertasSol;
