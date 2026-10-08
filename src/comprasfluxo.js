/* ================= FLUXO DE COMPRAS DA CARIATI (11 etapas em 5 fases) =================
   Integra ao módulo de compras o fluxograma do setor: etapa de cada compra, pagamento pelo cliente (ou pela Cariati),
   aviso ao fornecedor em divergência e atraso, e a calculadora de quantificação de materiais.
   Regras combinadas com a Cariati:
   · menor preço, ou outro fornecedor com justificativa (já existente na escolha da cotação);
   · divergência na entrega: avisar o fornecedor e acompanhar até concluir;
   · cliente que não confirma o pagamento: cobrar depois de 2 dias;
   · margem de segurança na quantificação: 5%, a validar com a engenharia. */
var PAGTO_PRAZO_DIAS=2;
var QUANT_MARGEM=5;
var PAG_QUEM={cliente:'Cliente paga', cariati:'Cariati paga'};
var DIV_TIPOS=[['falta','Falta de material'],['excesso','Excesso de material'],['errado','Item errado'],['espec','Fora da especificação'],['avaria','Avaria ou mau estado'],['outro','Outro']];
var FLX_FASES=[
  {n:1,t:'Quantificação e solicitação',e:[1,2,3]},{n:2,t:'Cotação',e:[4,5]},{n:3,t:'Aprovação e compra',e:[6,7]},{n:4,t:'Pagamento e arquivamento',e:[8,9]},{n:5,t:'Entrega e conferência',e:[10,11]}];
var FLX_COMPRAS=[
  {n:1,nome:'Quantificação do material',quem:'Obras',ret:'Sem a relação de materiais definida, não há o que solicitar.'},
  {n:2,nome:'Solicitação recebida e analisada',quem:'Obras envia · Compras confere',ret:'Solicitação sem quantidade, especificação e prazo conferidos não é registrada.'},
  {n:3,nome:'Registro no sistema',quem:'Compras',ret:'A cotação só começa com a solicitação criada.'},
  {n:4,nome:'Fornecedores e cotação',quem:'Compras',ret:'A análise só começa com as cotações dos fornecedores selecionados.'},
  {n:5,nome:'Análise e negociação',quem:'Compras',ret:''},
  {n:6,nome:'Aprovação do fornecedor',quem:'Compras',ret:'Sem fornecedor aprovado, não se emite a ordem de compra. Vale o menor preço; outro, só com justificativa.'},
  {n:7,nome:'Ordem de compra',quem:'Compras',ret:''},
  {n:8,nome:'Finalização e pedido de pagamento',quem:'Compras',ret:'O pagamento só é pedido depois do pedido finalizado. Cliente: cobrança depois de '+PAGTO_PRAZO_DIAS+' dias sem confirmação.'},
  {n:9,nome:'Confirmação do pagamento',quem:'Compras',ret:'O comprovante só vai ao fornecedor depois da confirmação do pagamento.'},
  {n:10,nome:'Acompanhamento da entrega',quem:'Compras acompanha · Obras recebe',ret:'Atraso: avisar o fornecedor e registrar.'},
  {n:11,nome:'Conferência do recebimento',quem:'Obras confere · Compras confirma',ret:'A compra só se encerra com quantidade e especificações conferidas. Divergência: avisar o fornecedor e acompanhar até concluir.'}];
function pagQuemObra(o){ return (o&&o.pagCompras)||'cliente'; }
function pagDe(c){ return c.pagto||{}; }
/* em qual das 11 etapas a compra está (0 = encerrada) */
function compraEtapaFluxo(o,c){
  var st=c.status, p=pagDe(c);
  if(st==='necessidade') return 2;
  if(st==='cotacao') return (c.cotacoes||[]).length?5:4;
  if(st==='aprovacao') return c.aprov?7:6;
  if(st==='pedido'){ if(!p.solicitadoEm) return 8; if(!p.confirmadoEm||!p.comprovanteEm) return 9; return 10; }
  if(st==='entregue') return 11;
  return 0;
}
function cfPagCobrar(c){ var p=pagDe(c); return !!(p.solicitadoEm&&!p.confirmadoEm&&p.quem!=='cariati'&&diffDays(p.solicitadoEm,hoje())>PAGTO_PRAZO_DIAS); }
function cfPagDias(c){ var p=pagDe(c); return p.solicitadoEm?diffDays(p.solicitadoEm,hoje()):0; }
function cfDivAberta(c){ return !!(c.diverg&&!c.diverg.resolvidoEm); }
function cfAtrasoSemAviso(c){ return pedidoAtrasado(c)&&!c.avisoAtraso; }

/* ---------- blocos no diálogo da compra ---------- */
function cfBlocos(o,c){
  if(!modAdm(o)) return cfDivHtml(c)+cfAtrasoHtml(c);
  var h='', p=pagDe(c), e=compraEtapaFluxo(o,c), quem=p.quem||pagQuemObra(o);
  if(c.status==='pedido'||p.solicitadoEm){
    var cobrar=cfPagCobrar(c);
    h+='<div class="callout'+(cobrar?' crit':(p.comprovanteEm?' ok':''))+'" style="margin-top:14px"><strong>Pagamento (etapas 8 e 9) · '+esc(PAG_QUEM[quem])+'</strong><ul class="small" style="margin:6px 0 0;padding-left:18px">'
      +'<li>Pedido de pagamento: '+(p.solicitadoEm?'solicitado em '+fmt(p.solicitadoEm)+(p.pdf?' · PDF salvo na pasta do cliente':''):'ainda não solicitado')+'</li>'
      +'<li>Confirmação do pagamento: '+(p.confirmadoEm?'confirmado em '+fmt(p.confirmadoEm):(p.solicitadoEm?(quem==='cariati'?'a Cariati ainda não pagou':'aguardando o cliente'+(cobrar?' — há '+plural(cfPagDias(c),'dia','dias')+', cobrar agora':' (cobrança depois de '+PAGTO_PRAZO_DIAS+' dias)')):'—'))+'</li>'
      +'<li>Comprovante ao fornecedor: '+(p.comprovanteEm?'enviado em '+fmt(p.comprovanteEm):'ainda não enviado')+'</li></ul>'+anexosHtml(p.anexos)
      +(c.status==='pedido'?'<p style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">'
        +(!p.solicitadoEm?'<button class="btn sm primary" data-act="pg-pedir" data-id="'+c.id+'" data-write>Pedir pagamento</button>':'')
        +(p.solicitadoEm&&!p.confirmadoEm?'<button class="btn sm primary" data-act="pg-confirmar" data-id="'+c.id+'" data-write>Confirmar pagamento</button>':'')
        +(p.confirmadoEm&&!p.comprovanteEm?'<button class="btn sm primary" data-act="pg-comprovante" data-id="'+c.id+'" data-write>Comprovante enviado ao fornecedor</button>':'')+'</p>':'')+'</div>';
  }
  return h+cfAtrasoHtml(c)+cfDivHtml(c)+(e?'<p class="small muted" style="margin-top:12px">Etapa '+e+' do fluxo de compras: '+esc(FLX_COMPRAS[e-1].nome)+'.</p>':'');
}
function cfAtrasoHtml(c){
  if(!pedidoAtrasado(c)) return '';
  return '<div class="callout crit" style="margin-top:14px"><strong>Entrega atrasada desde '+fmt(c.pedido.entregaPrevista)+'</strong><p class="small">'+(c.avisoAtraso?'Fornecedor avisado em '+fmt(c.avisoAtraso.data)+(c.avisoAtraso.obs?' — '+esc(c.avisoAtraso.obs):'')+'.':'O fornecedor ainda não foi avisado do atraso.')+'</p>'
    +(c.avisoAtraso?'':'<p style="margin-top:8px"><button class="btn sm primary" data-act="av-atraso" data-id="'+c.id+'" data-write>Registrar aviso ao fornecedor</button></p>')+'</div>';
}
function cfDivHtml(c){
  var d=c.diverg; if(!d) return '';
  var tipo=(DIV_TIPOS.filter(function(t){ return t[0]===d.tipo; })[0]||['',''])[1]||d.tipo;
  return '<div class="callout '+(d.resolvidoEm?'ok':'crit')+'" style="margin-top:14px"><strong>Divergência na entrega: '+esc(tipo)+(d.resolvidoEm?' · concluída em '+fmt(d.resolvidoEm):' · não concluída há '+plural(diffDays(d.abertaEm,hoje()),'dia','dias'))+'</strong>'
    +'<p class="small">'+esc(d.desc||'')+'</p><p class="small">Fornecedor avisado em '+fmt(d.avisadoEm)+'.'+(d.resolvidoEm&&d.solucao?' Solução: '+esc(d.solucao):'')+'</p>'
    +(d.resolvidoEm?'':'<p style="margin-top:8px"><button class="btn sm primary" data-act="dv-resolver" data-id="'+c.id+'" data-write>Marcar como concluída</button></p>')+'</div>';
}

/* ---------- ações de pagamento, aviso e divergência ---------- */
function pgPedir(id){
  var c=G('compras',id), o=G('obras',c.obraId);
  openForm({title:'Pedir pagamento', intro:esc(c.item)+' — '+brl(valorCompra(c))+'<br>Depois de finalizar o pedido na plataforma, peça o pagamento ao cliente (WhatsApp) e salve o pedido em PDF na pasta do cliente.',
    fields:[[{name:'data',label:'Data do pedido de pagamento',type:'date',required:true,value:hoje()},{name:'quem',label:'Quem paga',type:'select',options:Object.keys(PAG_QUEM).map(function(k){ return [k,PAG_QUEM[k]]; }),value:pagQuemObra(o)}],
      {name:'pdf',label:'Pedido em PDF salvo na pasta do cliente?',type:'select',options:[['sim','Sim'],['nao','Ainda não']],value:'sim'}],
    submit:'Registrar pedido de pagamento',
    onSubmit:async function(v){ await setCompra(c,{pagto:Object.assign({},pagDe(c),{solicitadoEm:v.data, quem:v.quem, pdf:v.pdf==='sim'})},'Pagamento solicitado ('+PAG_QUEM[v.quem]+')'); openCompra(id); return false; }});
}
function pgConfirmar(id){
  var c=G('compras',id);
  openForm({title:'Confirmar pagamento', intro:esc(c.item), fields:[{name:'data',label:'Data da confirmação',type:'date',required:true,value:hoje()},{name:'anexos',label:'Comprovante (print ou PDF)',type:'anexos',value:[]}], submit:'Confirmar',
    onSubmit:async function(v){ await setCompra(c,{pagto:Object.assign({},pagDe(c),{confirmadoEm:v.data, anexos:v.anexos||[]})},'Pagamento confirmado'); openCompra(id); return false; }});
}
async function pgComprovante(id){
  var c=G('compras',id); var p=pagDe(c);
  await setCompra(c,{pagto:Object.assign({},p,{comprovanteEm:hoje()})},'Comprovante enviado ao fornecedor'); toast('Comprovante registrado. Acompanhe a entrega.'); openCompra(id);
}
function avAtraso(id){
  var c=G('compras',id);
  openForm({title:'Aviso de atraso ao fornecedor', intro:esc(c.item)+' — entrega prevista em '+fmt(c.pedido.entregaPrevista), fields:[{name:'data',label:'Data do aviso',type:'date',required:true,value:hoje()},{name:'obs',label:'O que o fornecedor respondeu',type:'textarea',rows:2,ph:'Nova data combinada, motivo…'}], submit:'Registrar aviso',
    onSubmit:async function(v){ await setCompra(c,{avisoAtraso:{data:v.data, obs:(v.obs||'').trim(), por:Store.uid||null}},'Fornecedor avisado do atraso'); openCompra(id); return false; }});
}
function dvResolver(id){
  var c=G('compras',id);
  openForm({title:'Concluir divergência', intro:esc(c.item), fields:[{name:'data',label:'Data da solução',type:'date',required:true,value:hoje()},{name:'solucao',label:'Como foi resolvido',type:'textarea',required:true,rows:2,ph:'Reposição, crédito, devolução…'}], submit:'Marcar como concluída',
    onSubmit:async function(v){ if(!(v.solucao||'').trim()) return 'Descreva como foi resolvido.'; await setCompra(c,{diverg:Object.assign({},c.diverg,{resolvidoEm:v.data, solucao:v.solucao.trim()})},'Divergência concluída'); openCompra(id); return false; }});
}
Object.assign(AG,{
  'pg-pedir':function(d){ pgPedir(d.id); }, 'pg-confirmar':function(d){ pgConfirmar(d.id); }, 'pg-comprovante':function(d){ pgComprovante(d.id); },
  'av-atraso':function(d){ avAtraso(d.id); }, 'dv-resolver':function(d){ dvResolver(d.id); }
});
/* alertas da obra: cobrança do cliente, atraso sem aviso, divergência em aberto */
function alertasCF(o){
  var A=[], cs=byObra('compras',o.id), base='#/obra/'+o.id+'/compras';
  var cob=cs.filter(cfPagCobrar); if(cob.length) A.push({k:'crit', t:plural(cob.length,'pagamento do cliente sem confirmação','pagamentos do cliente sem confirmação')+' há mais de '+PAGTO_PRAZO_DIAS+' dias. Cobrar o cliente: '+cob.slice(0,2).map(function(c){ return c.item; }).join(', ')+(cob.length>2?'…':'')+'.', to:base});
  var sa=cs.filter(cfAtrasoSemAviso); if(sa.length) A.push({k:'crit', t:plural(sa.length,'entrega atrasada','entregas atrasadas')+' sem aviso ao fornecedor: '+sa.slice(0,2).map(function(c){ return c.item; }).join(', ')+'.', to:base});
  var dv=cs.filter(cfDivAberta); if(dv.length) A.push({k:'warn', t:plural(dv.length,'divergência de entrega não concluída','divergências de entrega não concluídas')+': '+dv.slice(0,2).map(function(c){ return c.item; }).join(', ')+'.', to:base});
  return A;
}

/* ---------- quantificação de materiais (etapa 1) ---------- */
function quantCalcular(tipo,total,margem){
  var m=1+(Number(margem)||0)/100, c=total*m, ceil=Math.ceil, r=[];
  if(tipo==='cerquite'){
    var cab=ceil(c/1.5)+2;
    r=[['Cerquite (tela de sinalização)','m',ceil(c)],['Área de cerquite','m²',ceil(c*1.2)],['Caibro 5x5 cm','un',cab],['Enforca-gato (abraçadeira)','un',cab*6+50]];
  } else if(tipo==='madeirite'){
    var ch=ceil(c/1.2)+2, sar=ceil(c*3+12);
    r=[['Madeirite (placa 1,10 × 2,20 m)','chapas',ch],['Caibro de apoio','un',ch+2],['Prego 19x21','kg',5],['Sarrafo 7x2','m',sar],['Sarrafo 7x2','un',ceil(sar/3)]];
  } else {
    var tubo=ceil(c/5)*5;
    r=[['Tubo de drenagem','m',tubo],['Manta geotêxtil (Bidim)','m²',Math.round(tubo*2.4*100)/100],['Pedra brita','m³',Math.round(tubo*0.36*100)/100]];
  }
  return r.map(function(x){ return {item:x[0], un:x[1], qtd:x[2]}; });
}
var QUANT_TIPOS={cerquite:'Fechamento de obra com cerquite', madeirite:'Fechamento de obra com madeirite', drenagem:'Sistema de drenagem'};
function quantForm(oid){
  openForm({title:'Calcular materiais', wide:true, semPassos:true,
    intro:'Fórmulas dos documentos de quantificação da Cariati. A margem de segurança de '+QUANT_MARGEM+'% é um valor provisório: <strong>validar com a engenharia</strong>. Na drenagem, manta e brita seguem a seção padrão do exemplo (2,40 m² e 0,36 m³ por metro) e o tubo arredonda para cima de 5 em 5 m.',
    fields:[{name:'tipo',label:'O que vai ser calculado',type:'select',options:Object.keys(QUANT_TIPOS).map(function(k){ return [k,QUANT_TIPOS[k]]; }),value:'cerquite'},
      [{name:'total',label:'Comprimento total (m)',type:'number',min:0,step:'0.01',required:true,hint:'Na drenagem, some os trechos medidos.'},{name:'margem',label:'Margem de segurança (%)',type:'number',min:0,max:100,step:'0.1',value:QUANT_MARGEM}],
      {name:'dataUso',label:'Data de uso na obra',type:'date',required:true,value:addDays(hoje(),14)},
      {name:'criar',label:'Criar as solicitações de compra com estas quantidades?',type:'select',options:[['nao','Não, só calcular e mostrar'],['sim','Sim, criar uma necessidade por material']],value:'nao'}],
    submit:'Calcular',
    onSubmit:async function(v){
      if(!(v.total>0)) return 'Informe o comprimento total.';
      var rows=quantCalcular(v.tipo,v.total,v.margem==null?QUANT_MARGEM:v.margem), tp=QUANT_TIPOS[v.tipo];
      if(v.criar==='sim'){
        for(var i=0;i<rows.length;i++){ var x=rows[i];
          await Store.set('compras',nid(),{obraId:oid, codigo:proximoCodigoCompra(), status:'necessidade', cotacoes:[], prioridade:'media', item:x.item, etapa:0, un:UNIDADES.indexOf(x.un)>=0?x.un:'un', qtd:x.qtd, dataUso:v.dataUso, prazoEntrega:null, critico:false, obs:tp+': '+v.total+' m com margem de '+(v.margem==null?QUANT_MARGEM:v.margem)+'% (calculado no app).', criadoEm:new Date().toISOString(), por:Store.uid||null}); }
        toast(plural(rows.length,'necessidade criada.','necessidades criadas.')); return;
      }
      closeDlg();
      openDlg('<div class="dlg-h"><h2>'+esc(tp)+'</h2><button type="button" class="btn ghost ico" data-close aria-label="Fechar">✕</button></div><div class="dlg-b"><p class="muted small">Comprimento '+String(v.total).replace('.',',')+' m, margem de '+String(v.margem==null?QUANT_MARGEM:v.margem).replace('.',',')+'%.</p><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Material</th><th>Unidade</th><th>Quantidade</th></tr></thead><tbody>'
        +rows.map(function(x){ return '<tr><td>'+esc(x.item)+'</td><td>'+esc(x.un)+'</td><td class="num">'+esc(String(x.qtd).replace('.',','))+'</td></tr>'; }).join('')+'</tbody></table></div><p class="small muted" style="margin-top:10px">Para lançar na solicitação, calcule de novo marcando “Sim, criar uma necessidade por material”.</p></div><div class="dlg-f"><button class="btn primary" data-close>Fechar</button></div>');
      return false;
    }});
}
COBX.quantCalcular=quantCalcular; COBX.compraEtapaFluxo=compraEtapaFluxo; COBX.FLX_COMPRAS=FLX_COMPRAS; COBX.alertasCF=alertasCF; COBX.cfPagCobrar=cfPagCobrar;
Object.assign(AG,{ 'quant-calc':function(d){ quantForm(d.oid); } });

/* ---------- mapa interativo do fluxo de compras (Fluxo geral) ---------- */
var CF_SET_NOME={OBR:'Obras',CMP:'Compras'}, CF_TIPO={X:'Executa',P:'Apoia',T:'Confere',H:'Retenção'};
function pad2(n){ return (n<10?'0':'')+n; }
function cfSetorAtua(n,s){ return (CF_SETORES[n]||[]).some(function(x){ return x[0]===s; }); }
function cfEtapaSel(o){
  if(ui.cfEtapa) return ui.cfEtapa;
  var cs=o?byObra('compras',o.id):[], e=0; cs.forEach(function(c){ var x=compraEtapaFluxo(o,c); if(x&&(!e||x<e)) e=x; });
  return e||1;
}
/* botão da próxima ação da compra, conforme a etapa do fluxo (pagamento tem ações próprias) */
function cfAcaoEtapa(n,c,rot){
  var p=pagDe(c), b=function(act,t){ return '<button class="btn sm primary" data-act="'+act+'" data-id="'+c.id+'" data-write>'+esc(t)+' →</button>'; };
  if(n===8) return b('pg-pedir','Pedir pagamento');
  if(n===9) return p.confirmadoEm?b('pg-comprovante','Comprovante enviado ao fornecedor'):b('pg-confirmar','Confirmar pagamento');
  return rot?b('compra-avancar',rot):'';
}
function cfDetalhe(o,n){
  var s=CF_ETAPAS[n-1], f=FLX_COMPRAS[n-1], cs=o?byObra('compras',o.id).filter(function(c){ return compraEtapaFluxo(o,c)===n; }):[];
  var list=(CF_SETORES[n]||[]).map(function(x){ return '<li><strong>'+esc(CF_SET_NOME[x[0]])+' · '+esc(CF_TIPO[x[1]])+':</strong> '+esc(x[2])+'</li>'; }).join('');
  var acoes='';
  if(n===1&&o) acoes='<button class="btn sm primary" data-act="quant-calc" data-oid="'+o.id+'" data-write>Calcular materiais</button>';
  if((n===2||n===3)&&o) acoes='<button class="btn sm primary" data-act="compra-nova" data-oid="'+o.id+'" data-write>+ Necessidade de compra</button>';
  var comp=!o?'<p class="muted small">Escolha uma obra acima para ver as compras desta etapa.</p>':(cs.length?'<ul class="cf-c">'+cs.map(function(c){
      var rot=rotuloAvancar(o,c), atras=pedidoAtrasado(c)||cfPagCobrar(c)||cfDivAberta(c);
      return '<li><div class="grow"><button type="button" class="linkbtn" data-act="compra-abrir" data-id="'+c.id+'"><strong>'+esc(c.item)+'</strong></button> <span class="muted small">'+esc(String(c.qtd).replace('.',','))+' '+esc(c.un||'')+'</span>'
        +(atras?' <span class="chip crit">Pede atenção</span>':'')+'</div>'+cfAcaoEtapa(n,c,rot)+'</li>'; }).join('')+'</ul>'
      :'<p class="muted small">Nenhuma compra desta obra está nesta etapa agora.</p>');
  return '<div class="cf-det" aria-live="polite"><div class="row spread" style="gap:8px;flex-wrap:wrap"><h3>Etapa '+pad2(n)+' · '+esc(s.nome)+'</h3><span class="chip steel">'+esc(f.quem)+'</span></div>'
    +'<p>'+esc(s.faz)+'</p><div class="cf-io"><div><small>Entra</small>'+esc(s.entra)+'</div><div><small>Sai</small>'+esc(s.sai)+'</div></div>'
    +(f.ret?'<p class="small cf-r"><span aria-hidden="true">◆</span> <strong>Retenção:</strong> '+esc(f.ret)+'</p>':'')
    +(list?'<h4 class="small muted" style="margin:12px 0 4px">Quem faz o quê</h4><ul class="lst">'+list+'</ul>':'')
    +'<h4 class="small muted" style="margin:12px 0 4px">Passo a passo</h4><ol class="lst">'+s.passos.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ol>'
    +(s.des&&s.des.length?'<h4 class="small muted" style="margin:12px 0 4px">Desdobramentos</h4><ul class="lst">'+s.des.map(function(d){ return '<li><strong>'+esc(d.t)+':</strong> '+esc(d.a)+'</li>'; }).join('')+'</ul>':'')
    +'<h4 class="small muted" style="margin:12px 0 4px">Compras da obra nesta etapa</h4>'+comp+(acoes?'<p style="margin-top:8px">'+acoes+'</p>':'')+'</div>';
}
function fluxoCompras(o){
  var cs=o?byObra('compras',o.id):[], cont={}; cs.forEach(function(c){ var e=o?compraEtapaFluxo(o,c):0; if(e) cont[e]=(cont[e]||0)+1; });
  var b=o?'#/obra/'+o.id+'/compras':'', sel=cfEtapaSel(o), st=ui.cfSetor||'';
  var chips='<div class="row" style="gap:6px;flex-wrap:wrap" role="group" aria-label="Filtrar por setor"><span class="muted small">Setor:</span>'
    +[['','Todos'],['OBR','Obras'],['CMP','Compras']].map(function(x){ return '<button type="button" class="btn sm'+(st===x[0]?' primary':'')+'" data-act="cf-setor" data-s="'+x[0]+'" aria-pressed="'+(st===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div>';
  var fases=FLX_FASES.map(function(f){
    return '<li class="cf-f"><h3><span class="jor-n">'+f.n+'</span>'+esc(f.t)+'</h3><ol class="cf-e">'+f.e.map(function(n){ var s=FLX_COMPRAS[n-1], k=cont[n], dim=st&&!cfSetorAtua(n,st);
      return '<li><button type="button" class="cf-b'+(dim?' dim':'')+'" data-act="cf-etapa" data-n="'+n+'" aria-pressed="'+(sel===n)+'"><span class="row spread" style="gap:6px"><strong>'+pad2(n)+' · '+esc(s.nome)+'</strong>'+(k?'<span class="chip warn" title="Compras desta obra nesta etapa">'+k+'</span>':'')+'</span><span class="tiny muted">'+esc(s.quem)+'</span>'+(s.ret?'<span class="small cf-r"><span aria-hidden="true">◆</span> retenção</span>':'')+'</button></li>'; }).join('')+'</ol></li>';
  }).join('');
  var SIMB={X:'●',P:'◐',T:'✓',H:'◆'}, ORD=['H','T','P','X'];
  var matriz='<div class="tbl-scroll" style="margin-top:14px"><table class="tbl cf-mx" aria-label="Quem atua em cada etapa"><thead><tr><th>Setor</th>'+FLX_COMPRAS.map(function(f){ return '<th><button type="button" class="linkbtn" data-act="cf-etapa" data-n="'+f.n+'" title="'+esc(f.nome)+'">'+pad2(f.n)+'</button></th>'; }).join('')+'</tr></thead><tbody>'
    +['OBR','CMP'].map(function(k){ return '<tr><td><strong>'+CF_SET_NOME[k]+'</strong></td>'+FLX_COMPRAS.map(function(f){ var ts=(CF_SETORES[f.n]||[]).filter(function(x){ return x[0]===k; }).map(function(x){ return x[1]; }); var u=ORD.filter(function(t){ return ts.indexOf(t)>=0; });
        return '<td'+(sel===f.n?' class="sel"':'')+' title="'+esc(u.map(function(t){ return CF_TIPO[t]; }).join(', '))+'">'+(u.length?u.map(function(t){ return '<span aria-label="'+CF_TIPO[t]+'">'+SIMB[t]+'</span>'; }).join(' '):'<span class="muted">—</span>')+'</td>'; }).join('')+'</tr>'; }).join('')+'</tbody></table></div><p class="tiny muted" style="margin-top:6px">● executa · ◐ apoia · ✓ confere · ◆ ponto de retenção</p>';
  var regras=['Fornecedor: vale o menor preço. Outro só com justificativa registrada.','Divergência na entrega: avisar o fornecedor e acompanhar até concluir. Fica alerta enquanto não for concluída.','Atraso de entrega: avisar o fornecedor e registrar o aviso.','Pagamento do cliente: se não confirmar em '+PAGTO_PRAZO_DIAS+' dias, cobrar.','Quantificação: margem de segurança de '+QUANT_MARGEM+'%, a validar com a engenharia.','Quem paga as compras (cliente ou Cariati) é definido em cada obra.'];
  return '<section class="card sec"><div class="card-h"><div><h2>Fluxo de compras</h2><p class="muted small">Toque numa etapa para ver o que entra, o que se faz, o que sai e as compras da obra que estão nela'+(o?'':'. Escolha uma obra acima para ligar as compras')+'.</p></div>'+(o?'<a class="btn sm" href="'+b+'">Abrir compras</a>':'')+'</div><div class="pad">'+chips+'<ol class="cf" style="margin-top:12px">'+fases+'</ol>'+cfDetalhe(o,sel)+matriz
    +'<h4 style="margin:16px 0 6px" class="small muted">Regras combinadas</h4><ul class="lst">'+regras.map(function(r){ return '<li>'+esc(r)+'</li>'; }).join('')+'</ul></div></section>';
}
Object.assign(AG,{ 'cf-etapa':function(d){ ui.cfEtapa=Number(d.n); render(); }, 'cf-setor':function(d){ ui.cfSetor=d.s||''; render(); } });
COBX.cfEtapaSel=cfEtapaSel;
