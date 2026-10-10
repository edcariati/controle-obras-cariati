/* ================= LIBERAÇÕES: QUEM VÊ, QUEM EDITA E QUEM APROVA =================
   O administrador define, por papel (financeiro, compras, engenharia, campo…), o que cada setor do aplicativo mostra
   (sem acesso, ver, editar), quais aprovações pode dar e se enxerga valores em R$. O cliente só visualiza e nunca aprova.
   A matriz fica na coleção "liberacoes" (doc "matriz"); no servidor, os níveis por grupo e as aprovações são gravados
   pela função definir_liberacoes. Sem matriz salva, valem os padrões abaixo (os mesmos de antes). */
var LIB_PAPEIS=[['dono','Administrador'],['gestor','Gestão'],['financeiro','Financeiro'],['compras','Compras'],['engenharia','Engenharia'],['campo','Obra (campo)'],['cliente','Cliente'],['leitura','Somente leitura']];
var LIB_SETORES=['Obras','Planejamento','Execução e qualidade','Suprimentos','Prestadores','Custo e financeiro','Gestão','Pós-obra','Encerramento','Sistema'];
/* [chave, nome, setor, grupo no servidor] */
var LIB_AREAS=[
  ['painel','Painel de evolução',0,'obras'],['resumo','Resumo da obra',0,'obras'],['cadastro','Cadastro da obra',0,'obras'],
  ['etapas','Etapas e evolução',1,'obras'],['cronograma','Cronograma',1,'obras'],['balanco','Balanço',1,'obras'],['semana','Semana e PPC',1,'obras'],
  ['diario','Diário de obra',2,'campo'],['solicitacoes','Solicitações e mudanças',2,'campo'],['ocorrencias','Ocorrências',2,'campo'],['entrega','Pré-entrega',2,'campo'],['projeto','RFI e materiais',2,'campo'],
  ['compras','Compras e cotações da obra',3,'suprimentos'],['estoque','Estoque',3,'estoque'],['locacoes','Locações',3,'suprimentos'],['comprasg','Página Compras (todas as obras)',3,'suprimentos'],
  ['contratos','Contratos e frentes',4,'contratos'],['avaliacoes','Avaliações de prestadores',4,'avaliacao'],['prestadoresg','Prestadores e fornecedores (cadastro)',4,'cadastros'],
  ['orcamento','Orçamento e aditivos',5,'orcamento'],['medicao','Medição',5,'medicao'],['pedidos','Pedidos de pagamento',5,'financeiro'],['financeiro','Financeiro',5,'financeiro'],['pagprazos','Pagamentos e prazos',5,'financeiro'],['metaevo','Meta × evolução',5,'financeiro'],['fisfin','Físico-financeiro',5,'financeiro'],['dre','DRE e fluxo de caixa',5,'dre'],
  ['agenda','Agenda',6,'obras'],['reunioes','Reuniões',6,'campo'],['documentos','Documentos',6,'campo'],['quinzenal','Relatório quinzenal',6,'relatorio'],['relatorio','Relatório mensal',6,'relatorio'],['visao','Visão geral',6,'obras'],
  ['garantias','Garantias',7,'garantia'],['chamados','Chamados de garantia',7,'chamados'],['visitas','Visitas pós-obra',7,'posobra'],['satisfacao','Satisfação',7,'satisfacao'],
  ['encerramento','Encerramento e P0',8,'obras'],
  ['cadastros','Cadastros (clientes, usuários, lista de serviços)',9,'cadastros'],['fluxo','Fluxo e protocolos',9,'obras'],['nuvem','Nuvem e histórico',9,'config']
];
/* [chave, nome, setor] */
var LIB_APROV=[
  ['compra_pagar','Confirmar pagamento de compra','Suprimentos'],
  ['med_aprovar','Aprovar medição','Custo e financeiro'],['med_pagar','Pagar medição','Custo e financeiro'],
  ['ped_aprovar','Aprovar pedido de pagamento','Custo e financeiro'],['ped_pagar','Pagar pedido de pagamento','Custo e financeiro'],
  ['adt_assinar','Registrar assinatura de aditivo','Custo e financeiro'],['sol_decidir','Registrar decisão de solicitação','Execução e qualidade'],
  ['etapa_liberar','Liberar etapa na vistoria','Execução e qualidade'],['rel_emitir','Emitir relatório ao cliente','Gestão'],
  ['chamado_negar','Negar chamado de garantia','Pós-obra'],['obra_encerrar','Encerrar ou reabrir obra','Encerramento']
];
var LIB_ACOES={'pg-confirmar':'compra_pagar','med-aprovar':'med_aprovar','med-pagar':'med_pagar','ped-aprovar':'ped_aprovar','ped-pagar':'ped_pagar','adt-assinar':'adt_assinar','sol-decidir':'sol_decidir','rel-emitir':'rel_emitir','qz-emitir':'rel_emitir','obra-encerrar':'obra_encerrar','obra-reabrir':'obra_encerrar'};
var LIB_COL={diarios:'diario',solicitacoes:'solicitacoes',solicitacoesImpacto:'solicitacoes',ocorrencias:'ocorrencias',fichas:'etapas',etapas:'etapas',pacotes:'semana',atividades:'cronograma',compras:'compras',locacoes:'locacoes',movEstoque:'estoque',contratosPrest:'contratos',termos:'contratos',danos:'contratos',orcamentos:'orcamento',orcItens:'orcamento',aditivos:'orcamento',medicoes:'medicao',pedidosPag:'pedidos',contasPagar:'financeiro',aportes:'financeiro',lancamentos:'dre',empresas:'dre',contratosCliente:'dre',relatorios:'relatorio',rfis:'projeto',materiais:'projeto',avaliacoes:'avaliacoes',eventos:'agenda',atas:'reunioes',acoes:'reunioes',docsLegais:'documentos',docsPrest:'documentos',clientes:'cadastros',catalogoServicos:'cadastros',prestadores:'prestadoresg',fornecedores:'prestadoresg',cadastros:'cadastro',arquivosObra:'cadastro',garantias:'garantias',chamadosGarantia:'chamados',visitasPosObra:'visitas',pesquisasSatisfacao:'satisfacao'};
var LIB_PAG={compras:'comprasg',dre:'dre',agenda:'agenda',prestadores:'prestadoresg',fornecedores:'prestadoresg',cadastros:'cadastros',visao:'visao',fluxo:'fluxo',nuvem:'nuvem',historico:'nuvem'};
var libSys=0;
function libSistema(fn){ libSys++; try{ return fn(); } finally{ libSys--; } }

function libPadrao(p){
  var a={}, ap=[], val=true, todas=LIB_AREAS.map(function(x){ return x[0]; });
  var set=function(n,l){ l.forEach(function(k){ a[k]=n; }); };
  var fin=['orcamento','medicao','pedidos','financeiro','pagprazos','metaevo','fisfin','dre'], exec=['etapas','cronograma','balanco','semana','diario','solicitacoes','ocorrencias','entrega','projeto','reunioes','documentos'], sup=['compras','estoque','locacoes','comprasg'], pos=['garantias','chamados','visitas','satisfacao'];
  set('v',todas);
  if(p==='dono'){ set('e',todas); ap=LIB_APROV.map(function(x){ return x[0]; }); }
  else if(p==='gestor'){ set('e',todas); set('v',['pedidos','financeiro','pagprazos','metaevo','fisfin']); set('n',['dre']); ap=LIB_APROV.map(function(x){ return x[0]; }).filter(function(k){ return k!=='obra_encerrar'&&k!=='med_aprovar'&&k!=='med_pagar'&&k!=='ped_aprovar'&&k!=='ped_pagar'&&k!=='compra_pagar'; }); }
  else if(p==='financeiro'){ set('e',fin.concat(sup,['contratos','prestadoresg','cadastros','quinzenal','relatorio'])); ap=['compra_pagar','med_aprovar','med_pagar','ped_aprovar','ped_pagar','adt_assinar']; }
  else if(p==='compras'){ set('e',sup.concat(['prestadoresg'])); set('n',['medicao','financeiro','pagprazos','metaevo','fisfin','dre','orcamento','cadastros']); }
  else if(p==='engenharia'){ set('e',exec.concat(['contratos','avaliacoes','medicao','encerramento'].concat(pos))); set('n',['pedidos','financeiro','pagprazos','metaevo','fisfin','dre','cadastros']); ap=['etapa_liberar','chamado_negar','sol_decidir']; }
  else if(p==='campo'){ set('e',['etapas','semana','diario','solicitacoes','ocorrencias','entrega','projeto','reunioes','documentos','compras','estoque','locacoes']); set('n',fin.concat(['comprasg','cadastro','painel','cadastros','prestadoresg','quinzenal','relatorio','nuvem'],pos)); val=false; }
  else if(p==='cliente'){ set('n',todas); set('v',['painel','cronograma','etapas','diario','solicitacoes','relatorio','quinzenal'].concat(pos)); val=false; }
  else if(p==='leitura'){ set('n',['nuvem']); }
  return {a:a, ap:ap, val:val};
}
function libMatriz(){ var d=G('liberacoes','matriz'); return (d&&d.papeis)||{}; }
function libCfg(p){
  var pad=libPadrao(p), m=libMatriz()[p]; if(!m) return pad;
  var a=Object.assign({}, pad.a, m.a||{}), ap=Array.isArray(m.ap)?m.ap:pad.ap;
  if(p==='cliente'){ ap=[]; Object.keys(a).forEach(function(k){ if(a[k]==='e') a[k]='v'; }); }
  return {a:a, ap:ap, val:m.val==null?pad.val:!!m.val};
}
function libPapel(){ return Store.papel||'dono'; }
function libNivel(k,p){ p=p||libPapel(); if(p==='dono') return 'e'; return libCfg(p).a[k]||'v'; }
function libVe(k){ return libNivel(k)!=='n'; }
function libEdita(k){ return libNivel(k)==='e'; }
function libAprova(k,p){ p=p||libPapel(); if(p==='cliente') return false; if(p==='dono') return true; return libCfg(p).ap.indexOf(k)>=0; }
function libValores(){ var p=libPapel(); if(p==='dono') return true; if(p==='cliente') return false; return libCfg(p).val; }
/* área da tela aberta, para saber se ela é só de leitura ou está bloqueada */
function libAreaRota(r){
  if(r.view==='obra'){ var m=abaMapa(), t=m[r.tab]?r.tab:(m.painel?'painel':(m.resumo?'resumo':(m.chamados?'chamados':Object.keys(m)[0]))); return t||''; }
  if(r.view==='etapa') return 'etapas';
  return LIB_PAG[r.view]||'';
}
function libSoVer(r){ var k=libAreaRota(r); return !!k&&libNivel(k)==='v'; }
function libBloqueio(r){
  if(r.view==='liberacoes') return libPapel()==='dono'?null:'<div class="wrap"><div class="card empty"><h3>Só o administrador altera as liberações</h3><p><a href="#/painel">Voltar às obras</a></p></div></div>';
  var k=LIB_PAG[r.view]; if(k&&!libVe(k)) return '<div class="wrap"><div class="card empty"><h3>Sem acesso a esta área</h3><p>O administrador não liberou “'+esc((LIB_AREAS.filter(function(x){ return x[0]===k; })[0]||[0,k])[1])+'” para o seu papel. <a href="#/painel">Voltar às obras</a></p></div></div>';
  return null;
}
function libPodeCol(c){ if(libSys>0) return true; var k=LIB_COL[c]; if(!k) return true; return libEdita(k); }
function libAcaoBloqueada(act,d){
  var k=LIB_ACOES[act]; if(!k&&act==='etapa-mover'&&d&&d.to==='liberada') k='etapa_liberar';
  if(!k) return '';
  if(libAprova(k)) return '';
  return libPapel()==='cliente'?'O cliente não aprova nada pelo aplicativo.':'Seu papel não pode: '+(LIB_APROV.filter(function(x){ return x[0]===k; })[0]||[0,k])[1].toLowerCase()+'.';
}
/* menu lateral: tira o que o papel não enxerga e mostra "Liberações" ao administrador */
function libFiltraNav(nav){
  Object.keys(LIB_PAG).forEach(function(v){ if(libVe(LIB_PAG[v])) return; nav=nav.replace(new RegExp('<a href="#/'+v+'"[^>]*>[^<]*</a>'),''); });
  if(libPapel()==='dono') nav=nav.replace('<a href="#/nuvem"','<a href="#/liberacoes"'+(parseRoute().view==='liberacoes'?' aria-current="page"':'')+'>Liberações</a><a href="#/nuvem"');
  return nav;
}
/* áreas do servidor: o nível do grupo é o maior entre as áreas do papel (o servidor é por grupo; a tela é mais fina) */
function libGrupos(p){
  var c=libCfg(p), g={};
  LIB_AREAS.forEach(function(x){ if(!x[3]) return; var n=c.a[x[0]], r={n:0,v:1,e:2}; if(g[x[3]]==null||r[n]>r[g[x[3]]]) g[x[3]]=n; });
  var out={}; Object.keys(g).forEach(function(k){ out[k]=g[k]==='e'?'E':(g[k]==='v'?'L':'N'); }); return out;
}
async function libSalvar(p,cfg){
  var papeis=Object.assign({}, libMatriz()); papeis[p]={a:cfg.a, ap:cfg.ap, val:cfg.val};
  await Store.set('liberacoes','matriz',{papeis:papeis, atualizadoEm:new Date().toISOString(), por:Store.uid||null});
  if(typeof Supa!=='undefined'&&Supa.v2&&Supa.v2()&&Supa.cli&&p!=='cliente'&&p!=='dono'){
    try{ var r=await Supa.cli.rpc('definir_liberacoes',{p_papel:p, p_grupos:libGrupos(p), p_aprova:cfg.ap}); if(r.error) throw r.error; }
    catch(e){ toast('Salvo no aplicativo, mas o servidor não aceitou ('+(e.message||e.code)+').', true); }
  }
}

function vLiberacoes(){
  var p=ui.libPapel||'financeiro', cfg=libCfg(p), cli=p==='cliente', adm=p==='dono';
  var chips='<div class="row" style="gap:6px;flex-wrap:wrap;margin:14px 0">'+LIB_PAPEIS.map(function(x){ return '<button class="btn sm'+(p===x[0]?' primary':'')+'" data-act="lib-papel" data-p="'+x[0]+'">'+esc(x[1])+'</button>'; }).join('')+'</div>';
  var nota=adm?'<div class="callout" style="margin-bottom:12px"><strong>O administrador sempre pode tudo.</strong> Só ele altera as liberações e os usuários.</div>':(cli?'<div class="callout" style="margin-bottom:12px"><strong>O cliente só visualiza e não aprova nada.</strong> Aqui você define o que pode ser liberado a ele; em cada obra, no Cadastro, você escolhe o que ele realmente vê.</div>':'');
  var opt=function(v,s){ return '<option value="'+v+'"'+(s===v?' selected':'')+'>'+({n:'Sem acesso',v:'Só ver',e:'Ver e editar'}[v])+'</option>'; };
  var setores=LIB_SETORES.map(function(nome,si){
    var l=LIB_AREAS.filter(function(x){ return x[2]===si; }); if(!l.length) return '';
    return '<section class="card sec"><div class="card-h"><h2>'+esc(nome)+'</h2></div><div class="tbl-scroll"><table class="tbl"><tbody>'+l.map(function(x){
      var n=adm?'e':cfg.a[x[0]];
      return '<tr><td>'+esc(x[1])+'</td><td style="width:190px"><select data-chg="lib-niv" data-k="'+x[0]+'" aria-label="'+esc(x[1])+'"'+(adm?' disabled':'')+'>'+opt('n',n)+opt('v',n)+(cli?'':opt('e',n))+'</select></td></tr>';
    }).join('')+'</tbody></table></div></section>';
  }).join('');
  var porSetor={}; LIB_APROV.forEach(function(x){ (porSetor[x[2]]=porSetor[x[2]]||[]).push(x); });
  var aprov='<section class="card sec"><div class="card-h"><div><h2>O que este papel pode aprovar</h2><p class="muted small">'+(cli?'O cliente não aprova nada: o que ele decide é registrado pela equipe.':'Aprovar é diferente de editar: marque só quem pode dar o “de acordo”.')+'</p></div></div><div class="pad">'
    +Object.keys(porSetor).map(function(s){ return '<h4 class="small muted" style="margin:8px 0 4px">'+esc(s)+'</h4>'+porSetor[s].map(function(x){ return '<label style="display:flex;gap:8px;align-items:center;margin:4px 0"><input type="checkbox" data-chg="lib-ap" data-k="'+x[0]+'"'+((adm||cfg.ap.indexOf(x[0])>=0)&&!cli?' checked':'')+((adm||cli)?' disabled':'')+'> '+esc(x[1])+'</label>'; }).join(''); }).join('')+'</div></section>';
  var val='<section class="card sec"><div class="card-h"><div><h2>Valores em R$</h2><p class="muted small">Se desmarcado, este papel nunca vê preços, custos nem valores de contrato.</p></div></div><div class="pad"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-chg="lib-val"'+((adm||cfg.val)&&!cli?' checked':'')+((adm||cli)?' disabled':'')+'> Pode ver valores em R$</label></div></section>';
  return '<div class="wrap"><div class="sec-h"><div><h2>Liberações</h2><p class="muted small">Quem vê, quem edita e quem aprova cada área do aplicativo. A mudança vale na hora e é gravada no servidor.</p></div>'+(adm?'':'<button class="btn" data-act="lib-padrao" data-p="'+p+'" data-write>Restaurar o padrão deste papel</button>')+'</div>'+chips+nota+'<div class="grid cols2" style="align-items:start"><div class="stack">'+setores+'</div><div class="stack">'+aprov+val+'<section class="card sec"><div class="pad small muted">O servidor aplica o nível por grupo de dados (o maior entre as áreas do grupo); a tela é mais fina e esconde ou bloqueia o resto. Aprovar medição, assinar aditivo e negar chamado também são checados no servidor.</div></section></div></div></div>';
}
Object.assign(AG,{
  'lib-papel':function(d){ ui.libPapel=d.p; render(); },
  'lib-padrao':async function(d){ var ok=await confirmDlg('Restaurar o padrão?','<p>As liberações de “'+esc((LIB_PAPEIS.filter(function(x){ return x[0]===d.p; })[0]||[0,d.p])[1])+'” voltam ao padrão.</p>','Restaurar',false); if(!ok) return; var m=Object.assign({}, libMatriz()); delete m[d.p]; await Store.set('liberacoes','matriz',{papeis:m, atualizadoEm:new Date().toISOString(), por:Store.uid||null}); var pd=libPadrao(d.p); if(d.p!=='cliente') await libSalvar(d.p,pd); toast('Padrão restaurado.'); }
});
document.addEventListener('change', function(e){
  var el=e.target.closest&&e.target.closest('[data-chg^="lib-"]'); if(!el) return;
  var p=ui.libPapel||'financeiro'; if(p==='dono') return;
  var cfg=libCfg(p), a=Object.assign({}, cfg.a), ap=cfg.ap.slice(), val=cfg.val, t=el.dataset.chg;
  if(t==='lib-niv') a[el.dataset.k]=el.value;
  else if(t==='lib-ap'){ var i=ap.indexOf(el.dataset.k); if(el.checked&&i<0) ap.push(el.dataset.k); if(!el.checked&&i>=0) ap.splice(i,1); }
  else if(t==='lib-val') val=el.checked;
  libSalvar(p,{a:a,ap:ap,val:val});
});
COBX.libCfg=libCfg; COBX.libPadrao=libPadrao; COBX.libNivel=libNivel; COBX.libAprova=libAprova; COBX.libGrupos=libGrupos; COBX.libValores=libValores; COBX.libAcaoBloqueada=libAcaoBloqueada; COBX.libPodeCol=libPodeCol; COBX.LIB_AREAS=LIB_AREAS; COBX.LIB_APROV=LIB_APROV;
