/* ================= CADASTRO DA OBRA =================
   Painel único com os dados do cliente, da obra, da equipe, do contrato e os arquivos recebidos dos outros aplicativos.
   Dados pessoais e de contrato ficam na coleção própria "cadastros" (um registro por obra) e os arquivos em "arquivosObra":
   as duas só são lidas por dono, gestor, financeiro e leitura (nunca por campo nem cliente).
   Os campos principais da obra (nome, código, endereço, área, início, tipologia, modalidade) continuam no registro da obra,
   porque o resto do app já usa esses campos. */
var CAD_ORIGEM={projetos:'App de projetos', financeiro:'App financeiro', cliente:'Cliente', cariati:'Cariati (interno)', outro:'Outro'};
var CAD_CATEG=['Projeto arquitetônico','Projeto complementar','Orçamento','Contrato','Alvará e licenças','Documentos do terreno','Fotos','Financeiro','Outro'];
var CAD_FASE={projeto:'Em projeto', aprovacao:'Em aprovação', obra:'Em obra', entrega:'Em entrega', posobra:'Pós-obra'};
var CAD_CONTATO={whatsapp:'WhatsApp', telefone:'Telefone', email:'E-mail'};
/* serviços entregues pela Cariati, por fase. A lista é um ponto de partida e pode ser ajustada por obra. */
var GEST_SERV=[
  ['Planejamento',[['plan_proj','Análise e compatibilização dos projetos'],['plan_orc','Orçamento detalhado e quantitativos'],['plan_crono','Cronograma físico-financeiro'],['plan_comp','Planejamento de compras e contratações'],['plan_forn','Cadastro e qualificação de fornecedores e prestadores']]],
  ['Suprimentos e contratações',[['sup_cot','Cotações e negociação com fornecedores'],['sup_comp','Compra e logística de materiais'],['sup_prest','Contratação e gestão de prestadores'],['sup_pag','Pedidos de pagamento e conferência de entregas']]],
  ['Acompanhamento técnico',[['ac_visita','Visitas técnicas periódicas'],['ac_diario','Diário de obra'],['ac_quinz','Relatório quinzenal com fotos ao cliente'],['ac_qual','Inspeção de qualidade por etapa (fichas de verificação)'],['ac_ppc','Controle de prazos e cronograma (PPC)'],['ac_oc','Gestão de ocorrências e não conformidades'],['ac_seg','Acompanhamento de segurança do trabalho']]],
  ['Financeiro',[['fin_ctrl','Controle financeiro da obra (orçado × realizado)'],['fin_med','Medições de prestadores'],['fin_aporte','Gestão de aportes do cliente e fluxo de caixa'],['fin_conta','Prestação de contas ao cliente']]],
  ['Mudanças',[['mud_aditivo','Gestão de mudanças e serviços fora do escopo (aditivos)']]],
  ['Entrega',[['ent_vist','Vistoria final e lista de pendências'],['ent_docs','Entrega de documentação (as built, manuais, garantias)'],['ent_pos','Pós-obra e assistência técnica']]]
];
var GEST_ACOMP=['plan_proj','ac_visita','ac_quinz','ac_qual','ac_oc','mud_aditivo','ent_vist'];
var GEST_SO_GESTAO=['plan_proj','plan_orc','plan_crono','plan_comp','plan_forn','sup_cot','sup_prest','sup_pag','ac_visita','ac_diario','ac_quinz','ac_qual','ac_ppc','ac_oc','ac_seg','fin_ctrl','fin_med','fin_aporte','fin_conta','mud_aditivo','ent_vist','ent_docs','ent_pos'];
function gestTodos(){ var l=[]; GEST_SERV.forEach(function(g){ g[1].forEach(function(i){ l.push(i[0]); }); }); return l; }
/* o que cada modalidade costuma incluir: administração e gestão = tudo (a Cariati também compra); somente gestão = sem compra de material */
function gestPadrao(mod){ return mod==='Administração de Obra'?gestTodos():(mod==='Acompanhamento de Obra'?GEST_ACOMP.slice():GEST_SO_GESTAO.slice()); }
var CAD_MOD_NOME={'Administração de Obra':'Administração e gestão','Gestão de Obras':'Somente gestão','Acompanhamento de Obra':'Acompanhamento'};
function cadServicos(o){ var e=cadDoc(o.id).escopo; return Array.isArray(e.servicos)?e.servicos:gestPadrao(o.modalidade); }
function cadDoc(oid){ var c=G('cadastros',oid)||{}; return {cliente:c.cliente||{}, obra:c.obra||{}, equipe:c.equipe||{}, contrato:c.contrato||{}, escopo:c.escopo||{}, conta:c.conta||{}, hist:c.hist||[]}; }
function cadArquivos(oid){ return byObra('arquivosObra',oid).sort(function(a,b){ return (b.data||'')<(a.data||'')?-1:1; }); }
function cadSalvar(oid,secao,vals){
  var cur=G('cadastros',oid)||{obraId:oid}, rec=Object.assign({}, cur, {obraId:oid}); rec[secao]=Object.assign({}, cur[secao]||{}, vals); delete rec.id;
  return Store.set('cadastros', oid, rec);
}
/* o que falta para o cadastro ficar completo (sem contar valores: quem não vê R$ também precisa ver o cadastro completo) */
function cadCompletude(o){
  var c=cadDoc(o.id), arq=cadArquivos(o.id), t=function(x){ return x!=null&&String(x).trim()!==''; };
  var itens=[['Nome do cliente',t(o.cliente)],['CPF ou CNPJ do cliente',t(c.cliente.doc)],['Telefone do cliente',t(c.cliente.telefone)],['E-mail do cliente',t(c.cliente.email)],
    ['Endereço do cliente',t(c.cliente.cidade)||t(c.cliente.endereco)],['Endereço da obra',t(o.endereco)],['Escopo e serviços do contrato',Array.isArray(c.escopo.servicos)],['Cidade e UF',t(c.obra.cidade)&&t(c.obra.uf)],['Área (m²)',o.area>0],['Início da obra',t(o.inicio)],['Previsão de término',t(c.obra.previsaoFim)],
    ['Responsável técnico',t(c.equipe.respTecnico)],['ART ou RRT',t(c.equipe.registro)],['Contrato anexado',arq.some(function(a){ return a.categoria==='Contrato'; })]];
  var ok=itens.filter(function(i){ return i[1]; }).length;
  return {ok:ok, total:itens.length, pct:ok/itens.length, faltam:itens.filter(function(i){ return !i[1]; }).map(function(i){ return i[0]; })};
}
function cadAviso(o){
  if(Store.papel==='campo'||ehCliente()) return '';
  var k=cadCompletude(o); if(!k.faltam.length) return '';
  return '<section class="card pad"><div class="row spread"><div><strong>Cadastro da obra '+Math.round(k.pct*100)+'% completo</strong><div class="small muted">Faltam: '+k.faltam.slice(0,4).map(esc).join(', ')+(k.faltam.length>4?' e mais '+(k.faltam.length-4):'')+'.</div></div><a class="btn sm" href="#/obra/'+o.id+'/cadastro">Completar cadastro</a></div></section>';
}
function cadDl(rows){
  return '<dl class="cad-dl">'+rows.map(function(r){ var v=r[1]; return '<dt>'+esc(r[0])+'</dt><dd>'+((v==null||String(v).trim()==='')?'<span class="muted">—</span>':(r[2]?v:esc(v)))+'</dd>'; }).join('')+'</dl>';
}
function cadCard(titulo,sub,corpo,acao){
  return '<section class="card"><div class="card-h"><div><h2>'+esc(titulo)+'</h2>'+(sub?'<p class="muted small">'+sub+'</p>':'')+'</div>'+(acao||'')+'</div><div class="pad">'+corpo+'</div></section>';
}
function cadEnd(x){
  var l1=[x.logradouro,x.numero].filter(Boolean).join(', ')+(x.complemento?' — '+x.complemento:''), l2=[x.bairro,[x.cidade,x.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' · ');
  var t=[l1,l2,x.cep?'CEP '+x.cep:''].filter(function(y){ return y&&y.trim(); }).join(' · ');
  return t||x.endereco||'';
}
function cadEscopoCard(o,ed){
  var sel=cadServicos(o), e=cadDoc(o.id).escopo, custom=Array.isArray(e.servicos);
  var grupos=GEST_SERV.map(function(g){
    return '<div class="esc-g"><h4>'+esc(g[0])+'</h4><ul class="esc-l">'+g[1].map(function(i){ var on=sel.indexOf(i[0])>=0; return '<li class="'+(on?'on':'off')+'"><span aria-hidden="true">'+(on?'✓':'—')+'</span> '+esc(i[1])+(on?'':' <span class="visually-hidden">(não incluso)</span>')+'</li>'; }).join('')+'</ul></div>';
  }).join('');
  var n=sel.length, tot=gestTodos().length;
  return cadCard('Contrato e serviços entregues','<span class="chip steel">'+esc(CAD_MOD_NOME[o.modalidade]||o.modalidade||'—')+'</span> <span class="muted small">'+n+' de '+tot+' serviços'+(custom?'':' · padrão da modalidade, ainda não revisado')+'</span>',
    '<div class="esc">'+grupos+'</div>'+(e.extras?'<p class="small" style="margin-top:10px"><strong>Outros serviços combinados:</strong> '+esc(e.extras)+'</p>':'')+(e.fora?'<p class="small"><strong>Fora do contrato:</strong> '+esc(e.fora)+'</p>':''),ed('cad-escopo'));
}
function cadContaCard(o,ed){
  var k=cadDoc(o.id).conta;
  return cadCard('Conta para solicitações','Conta que recebe os aportes e os pagamentos pedidos ao cliente. Só quem tem acesso ao financeiro vê este quadro.',cadDl([['Titular',k.titular],['CPF ou CNPJ do titular',k.doc],['Banco',k.banco],['Agência',k.agencia],['Conta',[k.conta,k.tipo].filter(Boolean).join(' · ')],['Chave PIX',k.pix],['Observações',k.obs]]),ed('cad-conta'));
}
function tCadastro(o){
  var oid=o.id, c=cadDoc(oid), k=cadCompletude(o), ve=gVe(), arq=cadArquivos(oid);
  var ed=function(a,t){ return '<button class="btn sm" data-act="'+a+'" data-oid="'+oid+'" data-write>'+(t||'Editar')+'</button>'; };
  var wa=function(tel){ var n=String(tel||'').replace(/\D/g,''); return n.length>=10?'<a href="https://wa.me/55'+n.replace(/^55/,'')+'" target="_blank" rel="noopener">'+esc(tel)+'</a>':esc(tel||''); };
  var head='<div class="sec-h"><div><h2>Cadastro da obra</h2><p class="muted small">Dados do cliente, da obra, da equipe e do contrato, e os arquivos recebidos dos outros aplicativos.</p></div>'
    +'<div class="row" style="gap:8px"><div class="cad-prog" role="img" aria-label="Cadastro '+Math.round(k.pct*100)+'% completo"><i style="width:'+Math.round(k.pct*100)+'%"></i></div><span class="chip '+(k.faltam.length?'warn':'ok')+'">'+(k.faltam.length?'Cadastro '+k.ok+' de '+k.total:'Cadastro completo')+'</span></div></div>';
  var falta=k.faltam.length?'<div class="callout" style="margin:12px 0"><strong>Falta preencher</strong><ul>'+k.faltam.map(function(f){ return '<li>'+esc(f)+'</li>'; }).join('')+'</ul></div>':'';
  var cli=cadCard('Dados do cliente',(G('clientes',o.clienteId)?'Vinculado ao cadastro de clientes.':'<button class="linkbtn" data-act="cad-escolher-cliente" data-oid="'+oid+'" data-write>Escolher um cliente já cadastrado</button>'),cadDl([['Nome ou razão social',o.cliente],['Tipo',c.cliente.tipo==='pj'?'Pessoa jurídica':(c.cliente.tipo==='pf'?'Pessoa física':'')],['CPF ou CNPJ',c.cliente.doc],['RG ou inscrição estadual',c.cliente.rg],['Profissão',c.cliente.profissao],['Telefone ou WhatsApp',wa(c.cliente.telefone),true],['E-mail',c.cliente.email],['Endereço do cliente',cadEnd(c.cliente)],['Contato preferido',CAD_CONTATO[c.cliente.contato]||''],['Observações',c.cliente.obs]]),ed('cad-cliente'));
  var obr=cadCard('Dados da obra','',cadDl([['Nome',o.nome],['Código',o.codigo],['Tipologia',o.tipologia],['Modalidade',o.modalidade],['Fase',CAD_FASE[c.obra.fase]||''],['Endereço',o.endereco],['Bairro',c.obra.bairro],['Cidade e UF',[c.obra.cidade,c.obra.uf].filter(Boolean).join(' / ')],['CEP',c.obra.cep],['Área',o.area>0?String(o.area).replace('.',',')+' m²':''],['Início',o.inicio?fmt(o.inicio):''],['Previsão de término',c.obra.previsaoFim?fmt(c.obra.previsaoFim):''],['Matrícula do imóvel',c.obra.matricula],['Inscrição municipal',c.obra.inscricao],['Origem do contrato',c.obra.origem],['Etiquetas',(c.obra.etiquetas||[]).map(function(e){ return '<span class="chip steel">'+esc(e)+'</span>'; }).join(' '),true]]),ed('cad-obra'));
  var eq=cadCard('Equipe e responsáveis','',cadDl([['Responsável técnico',c.equipe.respTecnico],['ART ou RRT nº',c.equipe.registro],['Engenheiro ou arquiteto da obra',c.equipe.engenheiro],['Mestre de obras',c.equipe.mestre],['Compras',c.equipe.compras],['Financeiro',c.equipe.financeiro],['Observações',c.equipe.obs]]),ed('cad-equipe'));
  var ct=ve?cadCard('Contrato e valores','Só quem tem acesso ao financeiro vê este quadro.',cadDl([['Valor do contrato',c.contrato.valor!=null&&c.contrato.valor!==''?brl(c.contrato.valor):''],['Valor estimado',c.contrato.estimado!=null&&c.contrato.estimado!==''?brl(c.contrato.estimado):''],['Data de assinatura',c.contrato.assinatura?fmt(c.contrato.assinatura):''],['Forma de pagamento',c.contrato.forma],['Empresa do grupo',empresaNome(o.empresaId)],['Alçada de compra',o.alcada!=null?brl(o.alcada):'']])+'<p class="small" style="margin-top:8px"><button class="linkbtn" data-act="obra-editar" data-oid="'+oid+'" data-write>Alçada, margens e parâmetros da obra</button></p>',ed('cad-contrato')):'';
  var linhas=arq.length?'<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Arquivo</th><th>Categoria</th><th>Origem</th><th>Recebido em</th><th></th></tr></thead><tbody>'+arq.map(function(a){
    return '<tr><td><strong>'+esc(a.nome||'Arquivo')+'</strong>'+(a.link&&/^https:\/\//.test(a.link)?' <a class="small" href="'+esc(a.link)+'" target="_blank" rel="noopener">abrir link</a>':'')+(a.obs?'<div class="tiny muted">'+esc(a.obs)+'</div>':'')+anexosHtml(a.anexos)+'</td><td>'+esc(a.categoria||'—')+'</td><td><span class="chip'+(a.origem==='projetos'||a.origem==='financeiro'?' steel':'')+'">'+esc(CAD_ORIGEM[a.origem]||'Outro')+'</span></td><td>'+fmt((a.data||'').slice(0,10))+'</td><td style="white-space:nowrap"><button class="btn sm" data-act="cad-arq-editar" data-id="'+a.id+'" data-write>Editar</button> <button class="btn sm danger" data-act="cad-arq-excluir" data-id="'+a.id+'" data-write>Excluir</button></td></tr>'; }).join('')+'</tbody></table></div>'
    :'<p class="muted small" style="padding:6px 0">Nenhum arquivo recebido ainda.</p>';
  var imp='<label class="btn" data-write>Importar dados de um arquivo<input type="file" accept="application/json,.json" data-chg="cad-importar" data-oid="'+oid+'" hidden></label>';
  var arqCard='<section class="card sec"><div class="card-h"><div><h2>Arquivos recebidos</h2><p class="muted small">Projetos, orçamentos, contratos e documentos que chegam do app de projetos, do app financeiro ou do cliente. PDF e imagens, até 10 por envio.</p></div><div class="row" style="gap:6px;flex-wrap:wrap">'+imp+'<button class="btn" data-act="cad-modelo">Baixar modelo do arquivo</button><button class="btn primary" data-act="cad-arq-novo" data-oid="'+oid+'" data-write>+ Receber arquivos</button></div></div><div class="pad">'+linhas+'</div></section>';
  var hist=c.hist.length?'<p class="tiny muted" style="margin-top:10px">Última importação: '+c.hist.slice(-1).map(function(h){ return fmt((h.em||'').slice(0,10))+' — '+esc(CAD_ORIGEM[h.origem]||'Outro')+(h.arquivo?' ('+esc(h.arquivo)+')':''); })[0]+'.</p>':'';
  return head+falta+'<div class="grid cols2" style="margin-top:14px"><div class="stack">'+cli+cadEscopoCard(o,ed)+eq+'</div><div class="stack">'+obr+ct+(ve?cadContaCard(o,ed):'')+'</div></div>'+arqCard+hist;
}

/* ---------- formulários ---------- */
function cadFormCliente(oid){
  var o=G('obras',oid), c=cadDoc(oid).cliente;
  openForm({title:'Dados do cliente', wide:true, fields:[
    [{name:'nome',label:'Nome ou razão social',required:true,value:o.cliente},{name:'tipo',label:'Tipo',type:'select',options:[['','—'],['pf','Pessoa física'],['pj','Pessoa jurídica']],value:c.tipo||''}],
    [{name:'doc',label:'CPF ou CNPJ',value:c.doc},{name:'rg',label:'RG ou inscrição estadual',value:c.rg}],
    [{name:'telefone',label:'Telefone ou WhatsApp',value:c.telefone,ph:'(15) 99999-9999'},{name:'email',label:'E-mail',type:'email',value:c.email}],
    [{name:'profissao',label:'Profissão',value:c.profissao},{name:'contato',label:'Contato preferido',type:'select',options:selOpts(Object.keys(CAD_CONTATO).map(function(k){ return [k,CAD_CONTATO[k]]; }),'—'),value:c.contato||''}],
    [{name:'cep',label:'CEP',value:c.cep,ph:'00000-000'},{name:'logradouro',label:'Rua ou avenida',value:c.logradouro||c.endereco}],
    [{name:'numero',label:'Número',value:c.numero},{name:'complemento',label:'Complemento',value:c.complemento}],
    [{name:'bairro',label:'Bairro',value:c.bairro},{name:'cidade',label:'Cidade',value:c.cidade}],
    [{name:'uf',label:'UF',value:c.uf,ph:'SP'},{name:'obs',label:'Observações',value:c.obs}]],
    steps:['Identificação','Contato','Endereço'],
    onSubmit:async function(v){
      if(!(v.nome||'').trim()) return 'Informe o nome do cliente.';
      if(v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return 'E-mail inválido.';
      if(v.uf&&!/^[A-Za-z]{2}$/.test(v.uf.trim())) return 'UF deve ter 2 letras.';
      var cur=G('obras',oid), rec=Object.assign({}, cur, {cliente:v.nome.trim()}); delete rec.id; await Store.set('obras', oid, rec);
      var t=function(x){ return (x||'').trim(); };
      await cadSalvar(oid,'cliente',{tipo:v.tipo||'', doc:t(v.doc), rg:t(v.rg), profissao:t(v.profissao), telefone:t(v.telefone), email:t(v.email), contato:v.contato||'', cep:t(v.cep), logradouro:t(v.logradouro), numero:t(v.numero), complemento:t(v.complemento), bairro:t(v.bairro), cidade:t(v.cidade), uf:t(v.uf).toUpperCase(), endereco:'', obs:t(v.obs)});
    }});
}
function cadFormEscopo(oid){
  var o=G('obras',oid), e=cadDoc(oid).escopo, atual=cadServicos(o);
  var opts=[]; GEST_SERV.forEach(function(g){ g[1].forEach(function(i,ix){ opts.push([i[0],i[1],ix===0?g[0]:'']); }); });
  openForm({title:'Contrato e serviços entregues', wide:true, intro:'Escolha como a obra é contratada e marque o que a Cariati entrega. Ao trocar o tipo de contrato, use “Marcar pelo padrão” para recarregar a lista sugerida.', fields:[
    {name:'modalidade',label:'Tipo de contrato',type:'select',options:MODALIDADES.map(function(m){ return [m,CAD_MOD_NOME[m]||m]; }),value:o.modalidade||MODALIDADES[0]},
    {name:'padrao',label:'Marcar pelo padrão do tipo de contrato escolhido?',type:'select',options:[['nao','Não, manter as marcações abaixo'],['sim','Sim, substituir pelo padrão']],value:'nao'},
    {name:'servicos',label:'Serviços entregues',type:'checks',options:opts,value:atual},
    {name:'extras',label:'Outros serviços combinados',type:'textarea',rows:2,value:e.extras},
    {name:'fora',label:'O que fica fora do contrato',type:'textarea',rows:2,value:e.fora}],
    steps:['Tipo','Serviços','Observações'], semPassos:true,
    onSubmit:async function(v){
      var cur=G('obras',oid), rec=Object.assign({}, cur, {modalidade:v.modalidade}); delete rec.id; await Store.set('obras', oid, rec);
      var lista=v.padrao==='sim'?gestPadrao(v.modalidade):(v.servicos||[]);
      await cadSalvar(oid,'escopo',{servicos:lista, extras:(v.extras||'').trim(), fora:(v.fora||'').trim()});
    }});
}
function cadFormConta(oid){
  if(!gVe()) return; var k=cadDoc(oid).conta;
  openForm({title:'Conta para solicitações', wide:true, intro:'Dados bancários usados nos pedidos de aporte e de pagamento enviados ao cliente.', fields:[
    [{name:'titular',label:'Titular',value:k.titular},{name:'doc',label:'CPF ou CNPJ do titular',value:k.doc}],
    [{name:'banco',label:'Banco',value:k.banco},{name:'tipo',label:'Tipo de conta',type:'select',options:[['','—'],['Corrente','Corrente'],['Poupança','Poupança'],['Pagamento','Pagamento']],value:k.tipo||''}],
    [{name:'agencia',label:'Agência',value:k.agencia},{name:'conta',label:'Conta com dígito',value:k.conta}],
    {name:'pix',label:'Chave PIX',value:k.pix},
    {name:'obs',label:'Observações',type:'textarea',rows:2,value:k.obs}],
    onSubmit:async function(v){ var t=function(x){ return (x||'').trim(); }; await cadSalvar(oid,'conta',{titular:t(v.titular), doc:t(v.doc), banco:t(v.banco), tipo:v.tipo||'', agencia:t(v.agencia), conta:t(v.conta), pix:t(v.pix), obs:t(v.obs)}); }});
}
function cadFormObra(oid){
  var o=G('obras',oid), c=cadDoc(oid).obra;
  openForm({title:'Dados da obra', wide:true, fields:[
    [{name:'nome',label:'Nome da obra',required:true,value:o.nome},{name:'codigo',label:'Código',value:o.codigo,ph:'CA000000'}],
    [{name:'tipologia',label:'Tipologia',type:'select',options:TIPOLOGIAS.map(function(t){ return [t,t]; }),value:o.tipologia||TIPOLOGIAS[0]},{name:'fase',label:'Fase',type:'select',options:selOpts(Object.keys(CAD_FASE).map(function(k){ return [k,CAD_FASE[k]]; }),'—'),value:c.fase||''}],
    {name:'endereco',label:'Endereço da obra',value:o.endereco},
    [{name:'bairro',label:'Bairro',value:c.bairro},{name:'cep',label:'CEP',value:c.cep}],
    [{name:'cidade',label:'Cidade',value:c.cidade},{name:'uf',label:'UF',value:c.uf,ph:'SP'}],
    [{name:'area',label:'Área (m²)',type:'number',step:'0.01',min:0,value:o.area},{name:'inicio',label:'Início da obra',type:'date',value:o.inicio}],
    [{name:'previsaoFim',label:'Previsão de término',type:'date',value:c.previsaoFim},{name:'origem',label:'Origem do contrato',value:c.origem,ph:'Ex.: indicação'}],
    [{name:'matricula',label:'Matrícula do imóvel',value:c.matricula},{name:'inscricao',label:'Inscrição municipal',value:c.inscricao}],
    {name:'etiquetas',label:'Etiquetas (separe por vírgula)',value:(c.etiquetas||[]).join(', '),ph:'Ex.: premium, 3D, interiores'}],
    onSubmit:async function(v){
      if(!(v.nome||'').trim()) return 'Informe o nome da obra.';
      if(v.uf&&!/^[A-Za-z]{2}$/.test(v.uf.trim())) return 'UF deve ter 2 letras.';
      if(v.inicio&&v.previsaoFim&&v.previsaoFim<v.inicio) return 'A previsão de término não pode ser antes do início.';
      var cur=G('obras',oid), rec=Object.assign({}, cur, {nome:v.nome.trim(), codigo:(v.codigo||'').trim(), tipologia:v.tipologia, endereco:(v.endereco||'').trim(), area:v.area, inicio:v.inicio||''}); delete rec.id; await Store.set('obras', oid, rec);
      var et=(v.etiquetas||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean).slice(0,10).map(function(x){ return x.slice(0,24); });
      await cadSalvar(oid,'obra',{fase:v.fase||'', bairro:(v.bairro||'').trim(), cep:(v.cep||'').trim(), cidade:(v.cidade||'').trim(), uf:(v.uf||'').trim().toUpperCase(), previsaoFim:v.previsaoFim||'', origem:(v.origem||'').trim(), matricula:(v.matricula||'').trim(), inscricao:(v.inscricao||'').trim(), etiquetas:et});
    }});
}
function cadFormEquipe(oid){
  var c=cadDoc(oid).equipe;
  openForm({title:'Equipe e responsáveis', wide:true, fields:[
    [{name:'respTecnico',label:'Responsável técnico',value:c.respTecnico},{name:'registro',label:'ART ou RRT nº',value:c.registro}],
    [{name:'engenheiro',label:'Engenheiro ou arquiteto da obra',value:c.engenheiro},{name:'mestre',label:'Mestre de obras',value:c.mestre}],
    [{name:'compras',label:'Responsável por compras',value:c.compras},{name:'financeiro',label:'Responsável financeiro',value:c.financeiro}],
    {name:'obs',label:'Observações',type:'textarea',rows:2,value:c.obs}],
    onSubmit:async function(v){ await cadSalvar(oid,'equipe',{respTecnico:(v.respTecnico||'').trim(), registro:(v.registro||'').trim(), engenheiro:(v.engenheiro||'').trim(), mestre:(v.mestre||'').trim(), compras:(v.compras||'').trim(), financeiro:(v.financeiro||'').trim(), obs:(v.obs||'').trim()}); }});
}
function cadFormContrato(oid){
  if(!gVe()) return; var c=cadDoc(oid).contrato;
  openForm({title:'Contrato e valores', wide:true, fields:[
    [{name:'valor',label:'Valor do contrato (R$)',type:'number',min:0,step:'0.01',value:c.valor},{name:'estimado',label:'Valor estimado (R$)',type:'number',min:0,step:'0.01',value:c.estimado}],
    [{name:'assinatura',label:'Data de assinatura',type:'date',value:c.assinatura},{name:'forma',label:'Forma de pagamento',value:c.forma,ph:'Ex.: 18 parcelas mensais'}]],
    onSubmit:async function(v){ await cadSalvar(oid,'contrato',{valor:v.valor==null?'':r2(v.valor), estimado:v.estimado==null?'':r2(v.estimado), assinatura:v.assinatura||'', forma:(v.forma||'').trim()}); }});
}
function cadFormArquivo(oid,a){
  openForm({title:a?'Editar arquivo':'Receber arquivos', wide:true, intro:'Registre o que chegou, de onde veio e a que se refere. Aceita PDF e imagens.', fields:[
    {name:'nome',label:'Nome do documento',required:true,value:a&&a.nome,ph:'Ex.: Projeto estrutural rev. 03'},
    [{name:'origem',label:'Veio de',type:'select',options:Object.keys(CAD_ORIGEM).map(function(k){ return [k,CAD_ORIGEM[k]]; }),value:(a&&a.origem)||'projetos'},{name:'categoria',label:'Categoria',type:'select',options:CAD_CATEG.map(function(x){ return [x,x]; }),value:(a&&a.categoria)||CAD_CATEG[0]}],
    {name:'anexos',label:'Arquivos (PDF ou imagem)',type:'anexos',value:(a&&a.anexos)||[]},
    {name:'link',label:'Link do arquivo no outro aplicativo (opcional)',value:a&&a.link,ph:'https://…'},
    {name:'obs',label:'Observações',type:'textarea',rows:2,value:a&&a.obs}],
    onSubmit:async function(v){
      if(!(v.nome||'').trim()) return 'Informe o nome do documento.';
      if(v.link&&!/^https:\/\/\S+$/.test(v.link.trim())) return 'O link precisa começar com https://';
      if(!(v.anexos||[]).length&&!(v.link||'').trim()) return 'Anexe ao menos um arquivo ou informe o link.';
      if((v.anexos||[]).length>10) return 'No máximo 10 arquivos por envio.';
      var rec=Object.assign({data:new Date().toISOString(), por:Store.uid||null}, a||{}, {obraId:oid, nome:v.nome.trim(), origem:v.origem, categoria:v.categoria, anexos:v.anexos||[], link:(v.link||'').trim(), obs:(v.obs||'').trim()}); delete rec.id;
      await Store.set('arquivosObra', a?a.id:nid(), rec);
    }});
}

/* ---------- importação de dados vindos de outro aplicativo ----------
   Formato "cariati-obra" v1 (JSON). Só entram os campos conhecidos, com tamanho limitado; nada é gravado antes da confirmação. */
var CAD_MODELO={formato:'cariati-obra', versao:1, origem:'projetos',
  obra:{nome:'Casa Silva', codigo:'CA250804', tipologia:'Casa térrea', modalidade:'Gestão de Obras', endereco:'Rua das Flores, 100', area:180, inicio:'2026-03-01'},
  obra_extra:{bairro:'Centro', cidade:'Tatuí', uf:'SP', cep:'18270-000', previsaoFim:'2027-03-01', fase:'projeto', origem:'Indicação', matricula:'', inscricao:'', etiquetas:['premium']},
  cliente:{nome:'Maria Silva', doc:'000.000.000-00', telefone:'(15) 99999-9999', email:'maria@exemplo.com', endereco:'', contato:'whatsapp'},
  equipe:{respTecnico:'Edson Cariati', registro:'RRT 0000000', engenheiro:'', mestre:'', compras:'', financeiro:''},
  contrato:{valor:350000, estimado:0, assinatura:'2026-02-10', forma:'18 parcelas mensais'},
  arquivos:[{nome:'Projeto arquitetônico rev. 02', categoria:'Projeto arquitetônico', link:'https://exemplo.com/projeto.pdf'}]};
function cadTxt(x,max){ return typeof x==='string'?x.trim().slice(0,max||200):(typeof x==='number'&&isFinite(x)?String(x):''); }
function cadNum(x){ var n=Number(x); return isFinite(n)&&n>=0?n:null; }
function cadData(x){ return /^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?x:''; }
function cadNormalizar(j){
  if(!j||typeof j!=='object'||j.formato!=='cariati-obra') return {erro:'Este arquivo não é um pacote de dados da Cariati (formato "cariati-obra").'};
  if(j.versao!==1) return {erro:'Versão do arquivo não suportada (esperado 1).'};
  var ign=[], r={origem:CAD_ORIGEM[j.origem]?j.origem:'outro', obra:{}, extra:{}, cliente:{}, equipe:{}, contrato:null, arquivos:[]}, ob=j.obra||{}, ex=j.obra_extra||{}, cl=j.cliente||{}, eq=j.equipe||{};
  ['nome','codigo','endereco'].forEach(function(k){ var v=cadTxt(ob[k],160); if(v) r.obra[k]=v; });
  if(ob.tipologia!=null){ if(TIPOLOGIAS.indexOf(ob.tipologia)>=0) r.obra.tipologia=ob.tipologia; else ign.push('Tipologia “'+cadTxt(ob.tipologia,40)+'” não existe no app'); }
  if(ob.modalidade!=null){ if(MODALIDADES.indexOf(ob.modalidade)>=0) r.obra.modalidade=ob.modalidade; else ign.push('Modalidade “'+cadTxt(ob.modalidade,40)+'” não existe no app'); }
  if(ob.area!=null){ var a=cadNum(ob.area); if(a!=null) r.obra.area=a; else ign.push('Área inválida'); }
  if(ob.inicio!=null){ var d=cadData(ob.inicio); if(d) r.obra.inicio=d; else ign.push('Data de início inválida (use AAAA-MM-DD)'); }
  ['bairro','cidade','cep','origem','matricula','inscricao'].forEach(function(k){ var v=cadTxt(ex[k],80); if(v) r.extra[k]=v; });
  if(ex.uf!=null){ var uf=cadTxt(ex.uf,2).toUpperCase(); if(/^[A-Z]{2}$/.test(uf)) r.extra.uf=uf; else ign.push('UF inválida'); }
  if(ex.previsaoFim!=null){ var pf=cadData(ex.previsaoFim); if(pf) r.extra.previsaoFim=pf; else ign.push('Previsão de término inválida (use AAAA-MM-DD)'); }
  if(ex.fase!=null){ if(CAD_FASE[ex.fase]) r.extra.fase=ex.fase; else ign.push('Fase “'+cadTxt(ex.fase,30)+'” desconhecida'); }
  if(Array.isArray(ex.etiquetas)) r.extra.etiquetas=ex.etiquetas.map(function(x){ return cadTxt(x,24); }).filter(Boolean).slice(0,10);
  ['doc','telefone','endereco','obs'].forEach(function(k){ var v=cadTxt(cl[k],160); if(v) r.cliente[k]=v; });
  var cn=cadTxt(cl.nome,160); if(cn) r.cliente.nome=cn;
  if(cl.email!=null){ var em=cadTxt(cl.email,120); if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) r.cliente.email=em; else if(em) ign.push('E-mail do cliente inválido'); }
  if(cl.contato!=null){ if(CAD_CONTATO[cl.contato]) r.cliente.contato=cl.contato; }
  ['respTecnico','registro','engenheiro','mestre','compras','financeiro','obs'].forEach(function(k){ var v=cadTxt(eq[k],120); if(v) r.equipe[k]=v; });
  if(j.contrato&&typeof j.contrato==='object'){
    if(!gVe()) ign.push('Valores do contrato ignorados: seu acesso não inclui financeiro');
    else { var ct={}, c=j.contrato; if(c.valor!=null&&cadNum(c.valor)!=null) ct.valor=r2(cadNum(c.valor)); if(c.estimado!=null&&cadNum(c.estimado)!=null) ct.estimado=r2(cadNum(c.estimado)); var as=cadData(c.assinatura); if(as) ct.assinatura=as; var fp=cadTxt(c.forma,120); if(fp) ct.forma=fp; if(Object.keys(ct).length) r.contrato=ct; }
  }
  (Array.isArray(j.arquivos)?j.arquivos:[]).slice(0,50).forEach(function(a){
    var nome=cadTxt(a&&a.nome,160); if(!nome){ ign.push('Arquivo sem nome ignorado'); return; }
    var link=cadTxt(a.link,300); if(link&&!/^https:\/\/\S+$/.test(link)){ ign.push('Link de “'+nome+'” ignorado (precisa ser https)'); link=''; }
    r.arquivos.push({nome:nome, categoria:CAD_CATEG.indexOf(a.categoria)>=0?a.categoria:'Outro', link:link, obs:cadTxt(a.obs,200)});
  });
  r.ignorados=ign; return r;
}
var CAD_ROT={nome:'Nome da obra',codigo:'Código',endereco:'Endereço',tipologia:'Tipologia',modalidade:'Modalidade',area:'Área (m²)',inicio:'Início',bairro:'Bairro',cidade:'Cidade',uf:'UF',cep:'CEP',origem:'Origem do contrato',matricula:'Matrícula',inscricao:'Inscrição municipal',previsaoFim:'Previsão de término',fase:'Fase',etiquetas:'Etiquetas',doc:'CPF ou CNPJ',telefone:'Telefone',email:'E-mail',contato:'Contato preferido',obs:'Observações',respTecnico:'Responsável técnico',registro:'ART ou RRT',engenheiro:'Engenheiro ou arquiteto',mestre:'Mestre de obras',compras:'Compras',financeiro:'Financeiro',valor:'Valor do contrato',estimado:'Valor estimado',assinatura:'Assinatura',forma:'Forma de pagamento'};
function cadMostra(k,v){ if(Array.isArray(v)) return v.join(', '); if(k==='fase') return CAD_FASE[v]||v; if(k==='contato') return CAD_CONTATO[v]||v; if(k==='valor'||k==='estimado') return brl(v); if(/inicio|previsaoFim|assinatura/.test(k)) return fmt(v); return String(v); }
/* diferenças entre o que está cadastrado e o que o arquivo traz */
function cadDiffs(o,c,r){
  var out=[], cmp=function(sec,rot,k,atual,novo){ var a=atual==null?'':(Array.isArray(atual)?atual.join(', '):String(atual)), b=Array.isArray(novo)?novo.join(', '):String(novo); if(a!==b) out.push({sec:sec,k:k,de:(atual==null||atual==='')?'':cadMostra(k,atual),para:cadMostra(k,novo)}); };
  Object.keys(r.obra).forEach(function(k){ cmp('Obra',CAD_ROT[k],k,o?o[k]:'',r.obra[k]); });
  Object.keys(r.extra).forEach(function(k){ cmp('Obra',CAD_ROT[k],k,c.obra[k],r.extra[k]); });
  Object.keys(r.cliente).forEach(function(k){ cmp('Cliente',CAD_ROT[k],k,k==='nome'?(o&&o.cliente):c.cliente[k],r.cliente[k]); });
  Object.keys(r.equipe).forEach(function(k){ cmp('Equipe',CAD_ROT[k],k,c.equipe[k],r.equipe[k]); });
  if(r.contrato) Object.keys(r.contrato).forEach(function(k){ cmp('Contrato',CAD_ROT[k],k,c.contrato[k],r.contrato[k]); });
  return out;
}
async function cadAplicar(oid,r,nomeArquivo,novaObra){
  var cur=novaObra?{}:(G('obras',oid)||{}), rec=Object.assign({}, cur, r.obra); delete rec.id;
  if(r.cliente.nome) rec.cliente=r.cliente.nome;
  if(novaObra){ rec=Object.assign({modalidade:MODALIDADES[0], tipologia:TIPOLOGIAS[0], metaPPC:80, diasEscalar:7, tolerAvanco:5, criadoEm:new Date().toISOString()}, rec); }
  await Store.set('obras', oid, rec);
  var cl=Object.assign({}, r.cliente); delete cl.nome;
  var c=G('cadastros',oid)||{obraId:oid}, nv=Object.assign({}, c, {obraId:oid}); delete nv.id;
  nv.obra=Object.assign({}, c.obra||{}, r.extra); nv.cliente=Object.assign({}, c.cliente||{}, cl); nv.equipe=Object.assign({}, c.equipe||{}, r.equipe);
  if(r.contrato) nv.contrato=Object.assign({}, c.contrato||{}, r.contrato);
  nv.hist=(c.hist||[]).concat([{em:new Date().toISOString(), origem:r.origem, arquivo:nomeArquivo||'', por:Store.uid||null}]).slice(-20);
  await Store.set('cadastros', oid, nv);
  for(var i=0;i<r.arquivos.length;i++){ var a=r.arquivos[i]; await Store.set('arquivosObra', nid(), {obraId:oid, nome:a.nome, origem:r.origem, categoria:a.categoria, anexos:[], link:a.link, obs:a.obs, importado:true, data:new Date().toISOString(), por:Store.uid||null}); }
}
function cadPrevia(oid,r,nomeArquivo){
  var novaObra=!oid, o=novaObra?null:G('obras',oid), c=novaObra?cadDoc(''):cadDoc(oid), df=cadDiffs(o,c,novaObra?{obra:r.obra,extra:r.extra,cliente:r.cliente,equipe:r.equipe,contrato:r.contrato}:r);
  var tab=df.length?'<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Seção</th><th>Campo</th><th>Hoje</th><th>Vai ficar</th></tr></thead><tbody>'+df.map(function(d){ return '<tr><td>'+esc(d.sec)+'</td><td>'+esc(CAD_ROT[d.k]||d.k)+'</td><td class="muted">'+(d.de?esc(d.de):'—')+'</td><td><strong>'+esc(d.para)+'</strong></td></tr>'; }).join('')+'</tbody></table></div>':'<p class="muted small">Nenhum dado novo: tudo o que o arquivo traz já está cadastrado.</p>';
  var ig=r.ignorados.length?'<div class="callout" style="margin-top:12px"><strong>Ignorado</strong><ul>'+r.ignorados.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul></div>':'';
  var ar=r.arquivos.length?'<p class="small" style="margin-top:10px"><strong>'+plural(r.arquivos.length,'documento será registrado','documentos serão registrados')+'</strong> em Arquivos recebidos: '+r.arquivos.slice(0,5).map(function(a){ return esc(a.nome); }).join('; ')+(r.arquivos.length>5?'…':'')+'</p>':'';
  var d=openDlg('<div class="dlg-h"><h2>'+(novaObra?'Criar obra a partir do arquivo':'Importar dados do arquivo')+'</h2><button type="button" class="btn ghost ico" data-close aria-label="Fechar">✕</button></div><div class="dlg-b"><p class="muted small" style="margin-bottom:10px">Arquivo <strong>'+esc(nomeArquivo||'')+'</strong> · origem: '+esc(CAD_ORIGEM[r.origem])+'. Nada foi gravado ainda; confira e confirme.</p>'+tab+ig+ar+'<div class="err-msg hide" id="ci_err" role="alert"></div></div><div class="dlg-f"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ci_ok"'+((df.length||r.arquivos.length)?'':' disabled')+'>'+(novaObra?'Criar obra':'Aplicar dados')+'</button></div>', true);
  d.querySelector('#ci_ok').addEventListener('click', async function(){
    try{ var id=novaObra?nid():oid; if(novaObra&&!(r.obra.nome||'').trim()){ var er=d.querySelector('#ci_err'); er.textContent='O arquivo não traz o nome da obra.'; er.classList.remove('hide'); return; }
      await cadAplicar(id,r,nomeArquivo,novaObra); closeDlg(); toast(novaObra?'Obra criada.':'Dados importados.'); if(novaObra) location.hash='#/obra/'+id+'/cadastro';
    }catch(e){ var er2=d.querySelector('#ci_err'); er2.textContent='Não foi possível gravar: '+((e&&e.message)||'erro'); er2.classList.remove('hide'); }
  });
}
function cadLerArquivo(file,oid){
  if(!file) return;
  if(file.size>1048576){ toast('O arquivo passa de 1 MB.', true); return; }
  file.text().then(function(t){
    var j; try{ j=JSON.parse(t); }catch(e){ toast('Arquivo inválido: não é um JSON.', true); return; }
    var r=cadNormalizar(j); if(r.erro){ blockDlg('Não foi possível importar',[r.erro],'Arquivo recusado'); return; }
    cadPrevia(oid,r,file.name);
  }, function(){ toast('Não consegui ler o arquivo.', true); });
}
document.addEventListener('change', function(e){
  var el=e.target.closest&&e.target.closest('[data-chg="cad-importar"]'); if(!el) return;
  var f=el.files&&el.files[0]; el.value=''; cadLerArquivo(f,el.dataset.oid||'');
});
Object.assign(AG,{
  'cad-escolher-cliente':function(d){
    var cs=cdSoAtivos(L('clientes')).sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); });
    if(!cs.length){ blockDlg('Nenhum cliente cadastrado',['Cadastre o cliente em Cadastros › Clientes e volte aqui.'],'Sem clientes'); return; }
    openForm({title:'Escolher cliente', fields:[{name:'id',label:'Cliente',type:'select',required:true,options:selOpts(cs.map(function(c){ return [c.id,c.nome+(c.doc?' — '+c.doc:'')]; }),'Selecione…')}], submit:'Vincular',
      onSubmit:async function(v){ var c=G('clientes',v.id); if(!c) return 'Escolha o cliente.'; var cur=G('obras',d.oid), rec=Object.assign({}, cur, {cliente:c.nome, clienteId:c.id}); delete rec.id; await Store.set('obras',d.oid,rec);
        await cadSalvar(d.oid,'cliente',{doc:c.doc||'', telefone:c.telefone||'', email:c.email||'', endereco:'', logradouro:c.endereco||'', cidade:c.cidade||'', uf:c.uf||'', cep:c.cep||'', contato:c.contatoPref||'', obs:c.obs||''}); toast('Cliente vinculado.'); }});
  },
  'cad-cliente':function(d){ cadFormCliente(d.oid); }, 'cad-obra':function(d){ cadFormObra(d.oid); },
  'cad-equipe':function(d){ cadFormEquipe(d.oid); }, 'cad-escopo':function(d){ cadFormEscopo(d.oid); }, 'cad-conta':function(d){ cadFormConta(d.oid); }, 'cad-contrato':function(d){ cadFormContrato(d.oid); },
  'cad-arq-novo':function(d){ cadFormArquivo(d.oid,null); },
  'cad-arq-editar':function(d){ var a=G('arquivosObra',d.id); if(a) cadFormArquivo(a.obraId,a); },
  'cad-arq-excluir':async function(d){ var a=G('arquivosObra',d.id); if(!a) return; var ok=await confirmDlg('Excluir “'+(a.nome||'arquivo')+'”?','<p>O registro sai da lista. Não dá para desfazer.</p>','Excluir',true); if(ok) await Store.del('arquivosObra',d.id); },
  'cad-modelo':function(){ baixar('modelo-cariati-obra.json', JSON.stringify(CAD_MODELO,null,2), 'application/json').then(function(ok){ if(ok) toast('Modelo baixado.'); }); }
});
COBX.cadCompletude=cadCompletude; COBX.cadNormalizar=cadNormalizar; COBX.cadDoc=cadDoc; COBX.cadModelo=CAD_MODELO; COBX.gestPadrao=gestPadrao;
