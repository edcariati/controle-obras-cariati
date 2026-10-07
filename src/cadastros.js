/* ================= CADASTROS (menu "Cadastros") =================
   Um lugar só para controlar quem entra e quem sai do sistema: clientes, obras, prestadores, fornecedores, parceiros e usuários.
   Em cada lista: adicionar, editar, cancelar (deixa de aparecer nas escolhas, mas o histórico fica), reativar e excluir.
   Excluir só é permitido quando nada depende do cadastro; senão, o app orienta a cancelar. */
var CD_ABAS=[['clientes','Clientes'],['obras','Obras'],['prestadores','Prestadores'],['fornecedores','Fornecedores'],['parceiros','Parceiros'],['servicos','Lista de serviços'],['usuarios','Usuários e acessos']];
var CD_PARC={arquiteto:'Arquiteto(a)', engenheiro:'Engenheiro(a)', projetista:'Projetista', imobiliaria:'Imobiliária', corretor:'Corretor(a)', escritorio:'Escritório parceiro', outro:'Outro'};
var CD_PESSOA={pf:'Pessoa física', pj:'Pessoa jurídica'};
var CD_PAPEIS={dono:['Administrador','Diretoria: vê e altera tudo, inclusive usuários e valores.'], gestor:['Gestão','Engenharia e compras: edita obras, compras, estoque, contratos e medições; só lê o financeiro.'], financeiro:['Financeiro','Pagamentos, contas, medições e dados de clientes; só lê as obras.'], campo:['Campo','Mestre e encarregado: diário, fichas, ocorrências e recebimento. Nunca vê valores nem dados de clientes.'], cliente:['Cliente','Acompanha só a própria obra: relatórios, garantias e satisfação.'], leitura:['Somente leitura','Consulta tudo que não é restrito, sem editar.']};
var CD_SIT={ativo:['ok','Ativo'], suspenso:['crit','Suspenso'], convidado:['warn','Convidado'], sem_acesso:['','Sem acesso']};
function cdAba(){ var p=(location.hash||'').replace(/^#\/?/,'').split('/'); return CD_ABAS.some(function(a){ return a[0]===p[1]; })?p[1]:'clientes'; }
function cdPodeUsuarios(){ return Store.papel==='dono'||!Store.cli; }
function cdAtivo(x){ return x.ativo!==false&&!x.inativo; }
function cdFiltro(){ return ui.cdFiltro||'ativos'; }
function cdFiltrar(l){ var f=cdFiltro(); return l.filter(function(x){ return f==='todos'||(f==='ativos'?cdAtivo(x):!cdAtivo(x)); }); }
function cdBarra(total,nAtivos,novoAct,extra){
  var f=cdFiltro(), b=function(k,t,n){ return '<button class="btn sm'+(f===k?' primary':'')+'" data-act="cd-filtro" data-f="'+k+'">'+t+' <span class="num">'+n+'</span></button>'; };
  return '<div class="row spread no-print" style="gap:8px;margin:12px 0;flex-wrap:wrap"><div class="row" style="gap:6px;flex-wrap:wrap">'+b('ativos','Ativos',nAtivos)+b('inativos','Cancelados',total-nAtivos)+b('todos','Todos',total)
    +'<input type="search" class="cd-busca" placeholder="Buscar por nome, documento ou contato" aria-label="Buscar" style="padding:7px 10px;border:1px solid var(--line);border-radius:6px;min-width:240px"></div><div class="row" style="gap:6px">'+(extra||'')+(novoAct?'<button class="btn primary" data-act="'+novoAct[0]+'" data-write>'+novoAct[1]+'</button>':'')+'</div></div>';
}
document.addEventListener('input', function(e){
  var el=e.target.closest&&e.target.closest('.cd-busca'); if(!el) return;
  var q=semAcento(el.value).toLowerCase().trim(), rows=document.querySelectorAll('.cd-tbl tbody tr[data-q]'), n=0;
  Array.prototype.forEach.call(rows, function(r){ var ok=!q||r.dataset.q.indexOf(q)>=0; r.style.display=ok?'':'none'; if(ok) n++; });
  var v=document.querySelector('.cd-vazio'); if(v) v.style.display=(q&&!n)?'':'none';
});
function cdLinha(x,celulas,acoes){
  var q=semAcento([x.nome,x.doc,x.telefone,x.email,x.contato,x.cliente,x.codigo,x.especialidade,x.categoria].filter(Boolean).join(' ')).toLowerCase();
  return '<tr data-q="'+esc(q)+'"'+(cdAtivo(x)?'':' style="opacity:.7"')+'>'+celulas.map(function(c){ return '<td>'+c+'</td>'; }).join('')+'<td style="white-space:nowrap">'+acoes+'</td></tr>';
}
function cdAcoes(col,x,extraEdit){
  var a='<button class="btn sm" data-act="'+(extraEdit||'cd-editar')+'" data-col="'+col+'" data-id="'+x.id+'" data-write>Editar</button> ';
  a+=cdAtivo(x)?'<button class="btn sm" data-act="cd-cancelar" data-col="'+col+'" data-id="'+x.id+'" data-write>Cancelar</button> ':'<button class="btn sm" data-act="cd-reativar" data-col="'+col+'" data-id="'+x.id+'" data-write>Reativar</button> ';
  return a+'<button class="btn sm danger" data-act="cd-excluir" data-col="'+col+'" data-id="'+x.id+'" data-write>Excluir</button>';
}
function cdTabela(cab,linhas,vazio){
  return linhas.length?'<div class="card tbl-scroll"><table class="tbl cd-tbl"><thead><tr>'+cab.map(function(c){ return '<th>'+c+'</th>'; }).join('')+'<th></th></tr></thead><tbody>'+linhas.join('')+'</tbody></table></div><p class="muted small cd-vazio" style="display:none;padding:10px">Nada encontrado para essa busca.</p>':'<div class="card empty"><h3>'+vazio[0]+'</h3><p>'+vazio[1]+'</p></div>';
}
function cdSitChip(x,rot){ return cdAtivo(x)?'<span class="chip ok">Ativo</span>':'<span class="chip crit" title="'+esc(x.motivoInativo||'')+'">'+(rot||'Cancelado')+(x.inativoEm?' em '+fmt(x.inativoEm.slice(0,10)):'')+'</span>'; }
function cdContato(x){ return esc([x.telefone||x.contato,x.email].filter(Boolean).join(' · '))||'<span class="muted">—</span>'; }

/* ---------- clientes e parceiros (cadastro genérico) ---------- */
function cdObrasDoCliente(id){ return L('obras').filter(function(o){ return o.clienteId===id; }); }
function cdListaClientes(){
  var todos=L('clientes').sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); }), l=cdFiltrar(todos);
  var lin=l.map(function(c){ var os=cdObrasDoCliente(c.id); return cdLinha(c,['<strong>'+esc(c.nome)+'</strong><div class="tiny muted">'+esc([CD_PESSOA[c.tipoPessoa],c.doc].filter(Boolean).join(' · '))+'</div>',cdContato(c),esc([c.cidade,c.uf].filter(Boolean).join(' / '))||'—',os.length?os.map(function(o){ return '<a href="#/obra/'+o.id+'/cadastro">'+esc(o.nome)+'</a>'; }).join(', '):'<span class="muted">nenhuma</span>',cdSitChip(c)],cdAcoes('clientes',c)); });
  return cdBarra(todos.length,todos.filter(cdAtivo).length,['cd-novo-clientes','+ Novo cliente'])+cdTabela(['Cliente','Contato','Cidade','Obras','Situação'],lin,['Nenhum cliente neste filtro','Cadastre o cliente uma vez e use em todas as obras dele.']);
}
function cdListaParceiros(){
  var todos=L('parceiros').sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); }), l=cdFiltrar(todos);
  var lin=l.map(function(p){ return cdLinha(p,['<strong>'+esc(p.nome)+'</strong><div class="tiny muted">'+esc([CD_PARC[p.tipo],p.doc].filter(Boolean).join(' · '))+'</div>',cdContato(p),esc([p.cidade,p.uf].filter(Boolean).join(' / '))||'—',p.comissao!=null&&p.comissao!==''?esc(String(p.comissao).replace('.',','))+'%':'—',cdSitChip(p)],cdAcoes('parceiros',p)); });
  return cdBarra(todos.length,todos.filter(cdAtivo).length,['cd-novo-parceiros','+ Novo parceiro'])+cdTabela(['Parceiro','Contato','Cidade','Comissão','Situação'],lin,['Nenhum parceiro neste filtro','Arquitetos, engenheiros, projetistas, imobiliárias e corretores que indicam ou atuam com a Cariati.']);
}
var SV_LINHAS=['Gestão de Obras','Administração · ','Engenharia · '];
function cdListaServicos(){
  gestSemear();
  var todos=gestItens(true), grupos={}, ord=[];
  todos.forEach(function(i){ var g=i.grupo||'Outros'; if(!grupos[g]){ grupos[g]=[]; ord.push(g); } grupos[g].push(i); });
  var f=cdFiltro(), visiveis=function(i){ return f==='todos'||(f==='ativos'?i.ativo!==false:i.ativo===false); };
  var lin=[]; ord.forEach(function(g){
    var l=grupos[g].filter(visiveis); if(!l.length) return;
    lin.push('<tr class="sv-g"><td colspan="6"><strong>'+esc(g)+'</strong> <span class="muted small">'+l.length+'</span></td></tr>');
    l.forEach(function(i){
      var x=Object.assign({}, i, {ativo:i.ativo!==false}), n=gestUsos(i.id);
      lin.push(cdLinha(x,['<strong>'+esc(i.nome)+'</strong>',esc(NAV_ROTULO[i.tela]||'—'),esc((i.mods||[]).map(function(m){ return CAD_MOD_NOME[m]||m; }).join(', ')||'—'),n?plural(n,'obra','obras'):'<span class="muted">nenhuma</span>',cdSitChip(x)],cdAcoes('catalogoServicos',x,'sv-editar')));
    });
  });
  var nAt=todos.filter(function(i){ return i.ativo!==false; }).length;
  return cdBarra(todos.length,nAt,['sv-novo','+ Novo serviço'],'<button class="btn sm" data-act="sv-padrao" data-write>Restaurar serviços de fábrica</button>')
    +cdTabela(['Serviço','Onde acontece no app','Já vem marcado em','Usado em','Situação'],lin,['Nenhum serviço neste filtro','Cadastre os serviços que a Cariati entrega e marque em cada obra o que foi contratado.']);
}
function svForm(x){
  var novo=!x, grupos=[]; gestItens(true).forEach(function(i){ if(i.grupo&&grupos.indexOf(i.grupo)<0) grupos.push(i.grupo); });
  openForm({title:novo?'Novo serviço':'Editar serviço', wide:true, intro:'O serviço aparece no cadastro de cada obra, onde você marca o que foi contratado.', fields:[
    {name:'nome',label:'Nome do serviço',required:true,value:x&&x.nome,ph:'Ex.: Gestão de resíduos da obra'},
    [{name:'grupo',label:'Grupo (aparece como título da lista)',required:true,value:x&&x.grupo,ph:'Ex.: Engenharia · Segurança'},{name:'tela',label:'Onde acontece no app',type:'select',options:[['','— sem atalho —']].concat(Object.keys(NAV_ROTULO).filter(function(k){ return ['resumo','cadastro','garantias','chamados','visitas','satisfacao','avaliacoes','agenda','reunioes','documentos','dre'].indexOf(k)<0; }).map(function(k){ return [k,NAV_ROTULO[k]]; })),value:(x&&x.tela)||''}],
    {name:'mods',label:'Já vem marcado nos contratos do tipo',type:'checks',options:MODALIDADES.map(function(m){ return [m,CAD_MOD_NOME[m]||m]; }),value:(x&&x.mods)||[]},
    {name:'ordem',label:'Posição na lista',type:'number',min:1,step:'1',value:(x&&x.ordem)||(gestItens(true).length+1)}],
    semPassos:true,
    onSubmit:async function(v){
      if(!(v.nome||'').trim()) return 'Informe o nome do serviço.';
      if(!(v.grupo||'').trim()) return 'Informe o grupo.';
      var dup=gestItens(true).filter(function(i){ return (!x||i.id!==x.id)&&semAcento(i.nome).toLowerCase()===semAcento(v.nome.trim()).toLowerCase(); })[0];
      if(dup) return 'Já existe um serviço com este nome.';
      var rec=Object.assign({ativo:true, criadoEm:new Date().toISOString()}, x||{}); delete rec.id;
      Object.assign(rec,{nome:v.nome.trim(), grupo:v.grupo.trim(), tela:v.tela||'', mods:v.mods||[], ordem:v.ordem||999});
      await Store.set('catalogoServicos', x?x.id:nid(), rec);
    }});
}
function cdForm(col,x){
  var novo=!x, cli=col==='clientes', uf=function(v){ return {name:'uf',label:'UF',value:v,ph:'SP'}; };
  var campos=cli?[
    [{name:'nome',label:'Nome ou razão social',required:true,value:x&&x.nome},{name:'tipoPessoa',label:'Tipo',type:'select',options:Object.keys(CD_PESSOA).map(function(k){ return [k,CD_PESSOA[k]]; }),value:(x&&x.tipoPessoa)||'pf'}],
    [{name:'doc',label:'CPF ou CNPJ',value:x&&x.doc},{name:'telefone',label:'Telefone ou WhatsApp',value:x&&x.telefone}],
    [{name:'email',label:'E-mail',type:'email',value:x&&x.email},{name:'contatoPref',label:'Contato preferido',type:'select',options:selOpts(Object.keys(CAD_CONTATO).map(function(k){ return [k,CAD_CONTATO[k]]; }),'—'),value:(x&&x.contatoPref)||''}],
    {name:'endereco',label:'Endereço',value:x&&x.endereco},[{name:'cidade',label:'Cidade',value:x&&x.cidade},uf(x&&x.uf)],
    {name:'origem',label:'Como conheceu a Cariati',value:x&&x.origem,ph:'Indicação, Instagram, parceiro…'},{name:'obs',label:'Observações',type:'textarea',rows:2,value:x&&x.obs}]
  :[
    [{name:'nome',label:'Nome ou razão social',required:true,value:x&&x.nome},{name:'tipo',label:'Tipo de parceiro',type:'select',options:Object.keys(CD_PARC).map(function(k){ return [k,CD_PARC[k]]; }),value:(x&&x.tipo)||'arquiteto'}],
    [{name:'doc',label:'CPF ou CNPJ',value:x&&x.doc},{name:'contato',label:'Pessoa de contato',value:x&&x.contato}],
    [{name:'telefone',label:'Telefone ou WhatsApp',value:x&&x.telefone},{name:'email',label:'E-mail',type:'email',value:x&&x.email}],
    [{name:'cidade',label:'Cidade',value:x&&x.cidade},uf(x&&x.uf)],
    {name:'comissao',label:'Comissão combinada (%)',type:'number',min:0,max:100,step:'0.01',value:x&&x.comissao},{name:'obs',label:'Observações',type:'textarea',rows:2,value:x&&x.obs}];
  openForm({title:novo?(cli?'Novo cliente':'Novo parceiro'):(cli?'Editar cliente':'Editar parceiro'), wide:true, fields:campos,
    onSubmit:async function(v){
      if(!(v.nome||'').trim()) return 'Informe o nome.';
      if(v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return 'E-mail inválido.';
      if(v.uf&&!/^[A-Za-z]{2}$/.test(v.uf.trim())) return 'UF deve ter 2 letras.';
      var dup=L(col).filter(function(o){ return (!x||o.id!==x.id)&&cdAtivo(o)&&v.doc&&o.doc&&semAcento(o.doc).replace(/\D/g,'')===semAcento(v.doc).replace(/\D/g,''); })[0];
      if(dup) return 'Já existe cadastro com este CPF ou CNPJ: '+dup.nome+'.';
      var rec=Object.assign({ativo:true, criadoEm:new Date().toISOString(), por:Store.uid||null}, x||{}); delete rec.id;
      Object.keys(v).forEach(function(k){ rec[k]=typeof v[k]==='string'?v[k].trim():v[k]; }); if(rec.uf) rec.uf=String(rec.uf).toUpperCase();
      await Store.set(col, x?x.id:nid(), rec);
    }});
}

/* ---------- cancelar, reativar e excluir (serve a todas as listas) ---------- */
function cdMotivo(col,id,titulo,patchFn){
  openForm({title:titulo, intro:'O cadastro deixa de aparecer nas escolhas, mas o histórico e os vínculos continuam. Dá para reativar depois.', fields:[{name:'motivo',label:'Motivo',type:'textarea',rows:2,required:true}], submit:'Cancelar cadastro',
    onSubmit:async function(v){ if(!(v.motivo||'').trim()) return 'Informe o motivo.'; var x=G(col,id); var rec=Object.assign({}, x, patchFn(v.motivo.trim())); delete rec.id; await Store.set(col,id,rec); toast('Cadastro cancelado.'); }});
}
function cdVinculos(col,x){
  if(col==='clientes') return cdObrasDoCliente(x.id).length?['Cliente com '+plural(cdObrasDoCliente(x.id).length,'obra','obras')+'.']:[];
  if(col==='prestadores'){ var n=L('contratosPrest').filter(function(c){ return c.prestadorId===x.id; }).length+L('atividades').filter(function(a){ return a.prestadorId===x.id; }).length; return n?['Prestador com contratos ou atividades ('+n+').']:[]; }
  if(col==='fornecedores'){ var m=L('compras').filter(function(c){ return (c.pedido&&c.pedido.fornecedorId===x.id)||(c.cotacoes||[]).some(function(q){ return q.fornecedorId===x.id; }); }).length+L('locacoes').filter(function(l){ return l.fornecedorId===x.id; }).length; return m?['Fornecedor com compras ou locações ('+m+').']:[]; }
  if(col==='catalogoServicos'){ var u=gestUsos(x.id); return u?['Este serviço está marcado em '+plural(u,'obra','obras')+'.']:[]; }
  if(col==='obras'){ var k=['etapas','atividades','diarios','compras','contasPagar','medicoes','ocorrencias'].reduce(function(s,c){ return s+byObra(c,x.id).length; },0); return k>0?['A obra já tem '+k+' registros (cronograma, diário, compras, financeiro…).']:[]; }
  return [];
}
Object.assign(AG,{
  'cd-filtro':function(d){ ui.cdFiltro=d.f; render(); },
  'cd-novo-clientes':function(){ cdForm('clientes',null); }, 'cd-novo-parceiros':function(){ cdForm('parceiros',null); },
  'sv-novo':function(){ svForm(null); }, 'sv-editar':function(d){ var x=G('catalogoServicos',d.id)||gestItens(true).filter(function(i){ return i.id===d.id; })[0]; if(x) svForm(x); },
  'sv-padrao':async function(){
    var ok=await confirmDlg('Restaurar serviços de fábrica?','<p>Os serviços de fábrica que foram excluídos voltam para a lista. Nada do que você criou ou editou é alterado.</p>','Restaurar'); if(!ok) return;
    var tem={}; L('catalogoServicos').forEach(function(i){ tem[i.id]=1; }); var n=0;
    for(var i0=0;i0<gestItensBase().length;i0++){ var b=gestItensBase()[i0]; if(tem[b.id]) continue; var id=b.id, r=Object.assign({},b,{criadoEm:new Date().toISOString()}); delete r.id; await Store.set('catalogoServicos',id,r); n++; }
    toast(n?plural(n,'serviço restaurado.','serviços restaurados.'):'Nenhum serviço de fábrica estava faltando.'); },
  'cd-editar':function(d){ var x=G(d.col,d.id); if(x) cdForm(d.col,x); },
  'cd-cancelar':function(d){ var x=G(d.col,d.id); if(!x) return; cdMotivo(d.col,d.id,'Cancelar “'+(x.nome||'cadastro')+'”',function(m){ return d.col==='obras'?{situacao:'cancelada', canceladaEm:hoje(), motivoCancelamento:m}:{ativo:false, inativo:true, inativoEm:new Date().toISOString(), motivoInativo:m}; }); },
  'cd-reativar':async function(d){ var x=G(d.col,d.id); if(!x) return; var rec=Object.assign({}, x); delete rec.id;
    if(d.col==='obras'){ rec.situacao=''; delete rec.canceladaEm; delete rec.motivoCancelamento; } else { rec.ativo=true; rec.inativo=false; delete rec.inativoEm; delete rec.motivoInativo; }
    await Store.set(d.col,d.id,rec); toast('Cadastro reativado.'); },
  'cd-excluir':async function(d){
    var x=G(d.col,d.id); if(!x) return; var v=cdVinculos(d.col,x);
    if(v.length){ blockDlg('Não dá para excluir',v.concat(['Cancele o cadastro: ele sai das escolhas e o histórico fica preservado.']),'Há vínculos:'); return; }
    var ok=await confirmDlg('Excluir “'+(x.nome||'cadastro')+'”?','<p>O cadastro sai da lista e não dá para desfazer pelo app.</p>','Excluir',true); if(!ok) return;
    if(d.col==='obras'){ await excluirObra(d.id); return; } await Store.del(d.col,d.id); toast('Cadastro excluído.'); }
});

/* ---------- obras, prestadores e fornecedores (usam os cadastros e formulários que já existem) ---------- */
function cdSitObra(o){ return o.situacao==='cancelada'?'<span class="chip crit" title="'+esc(o.motivoCancelamento||'')+'">Cancelada'+(o.canceladaEm?' em '+fmt(o.canceladaEm):'')+'</span>':(o.situacao==='encerrada'?'<span class="chip">Encerrada'+(o.encerradaEm?' em '+fmt(o.encerradaEm):'')+'</span>':'<span class="chip ok">Em andamento</span>'); }
function cdListaObras(){
  var todos=L('obras').sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); }), ativo=function(o){ return o.situacao!=='cancelada'; }, f=cdFiltro();
  var l=todos.filter(function(o){ return f==='todos'||(f==='ativos'?ativo(o):!ativo(o)); });
  var lin=l.map(function(o){ var c=G('clientes',o.clienteId);
    return cdLinha({nome:o.nome,codigo:o.codigo,cliente:o.cliente,ativo:ativo(o)},['<a href="#/obra/'+o.id+'/cadastro"><strong>'+esc(o.nome)+'</strong></a><div class="tiny muted">'+esc([o.codigo,o.tipologia].filter(Boolean).join(' · '))+'</div>',(c?'<a href="#/cadastros/clientes">'+esc(c.nome)+'</a>':esc(o.cliente||'—')),esc(o.modalidade||'—'),o.inicio?fmt(o.inicio):'—',cdSitObra(o)],
      '<a class="btn sm" href="#/obra/'+o.id+'/cadastro">Abrir</a> <button class="btn sm" data-act="obra-editar" data-oid="'+o.id+'" data-write>Editar</button> '+(ativo(o)?'<button class="btn sm" data-act="cd-cancelar" data-col="obras" data-id="'+o.id+'" data-write>Cancelar</button> ':'<button class="btn sm" data-act="cd-reativar" data-col="obras" data-id="'+o.id+'" data-write>Reativar</button> ')+'<button class="btn sm danger" data-act="cd-excluir" data-col="obras" data-id="'+o.id+'" data-write>Excluir</button>'); });
  var imp='<label class="btn" data-write>Importar obra de arquivo<input type="file" accept="application/json,.json" data-chg="cad-importar" data-oid="" hidden></label>';
  return cdBarra(todos.length,todos.filter(ativo).length,['obra-nova','+ Nova obra'],imp)+cdTabela(['Obra','Cliente','Modalidade','Início','Situação'],lin,['Nenhuma obra neste filtro','Cadastre a obra, o cliente e a equipe, e receba os arquivos dos outros aplicativos.']);
}
function cdListaPrest(){
  var todos=L('prestadores').sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); }), l=cdFiltrar(todos);
  var lin=l.map(function(p){ var s=validade(p.seguro), t=validade(p.treinamento); return cdLinha(p,['<strong>'+esc(p.nome)+'</strong><div class="tiny muted">'+esc(p.doc||'')+'</div>',esc(p.especialidade||'—'),cdContato(p),'<span class="chip '+s.k+'">Seguro: '+esc(s.t)+'</span> <span class="chip '+t.k+'">Treinamento: '+esc(t.t)+'</span>',cdSitChip(p)],cdAcoes('prestadores',p,'prest-editar').replace('data-act="cd-excluir"','data-act="cd-excluir"')); });
  return cdBarra(todos.length,todos.filter(cdAtivo).length,['prest-novo','+ Novo prestador'])+cdTabela(['Prestador','Especialidade','Contato','Validades','Situação'],lin,['Nenhum prestador neste filtro','Cadastre os prestadores com as validades de seguro e treinamento.']);
}
function cdListaForn(){
  var todos=L('fornecedores').sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); }), l=cdFiltrar(todos);
  var lin=l.map(function(f){ return cdLinha(f,['<strong>'+esc(f.nome)+'</strong><div class="tiny muted">'+esc(f.doc||'')+'</div>',esc(f.categoria||'—'),cdContato(f),f.prazoMedio!=null&&f.prazoMedio!==''?plural(Number(f.prazoMedio),'dia','dias'):'—',cdSitChip(f)],cdAcoes('fornecedores',f,'forn-editar')); });
  return cdBarra(todos.length,todos.filter(cdAtivo).length,['forn-novo','+ Novo fornecedor'])+cdTabela(['Fornecedor','Categoria','Contato','Prazo médio','Situação'],lin,['Nenhum fornecedor neste filtro','Fornecedores de material e equipamento usados em cotações, pedidos e locações.']);
}
/* nas escolhas (cotação, contrato, locação) não aparece quem foi cancelado */
function cdSoAtivos(l){ return l.filter(cdAtivo); }

/* ---------- usuários e acessos ---------- */
var LOCAL_USR='cob.usuariosLocais';
function usrLocalLer(){ try{ var j=JSON.parse(localStorage.getItem(LOCAL_USR)||'null'); if(j&&j.length) return j; }catch(e){}
  return [{id:'u1',email:'cariati@cariati.com.br',nome:'Administrador Cariati',papel:'dono',ativo:true,situacao:'ativo',ultimo:new Date().toISOString(),obras:[]},
    {id:'u2',email:'ruan@cariati.com.br',nome:'Ruan (Engenharia)',papel:'gestor',ativo:true,situacao:'ativo',ultimo:new Date().toISOString(),obras:[]},
    {id:'u3',email:'leticiaoliveira@cariati.com.br',nome:'Letícia Oliveira (Compras)',papel:'gestor',ativo:true,situacao:'ativo',ultimo:'',obras:[]},
    {id:'u4',email:'financeiro@cariati.com.br',nome:'Financeiro',papel:'financeiro',ativo:true,situacao:'ativo',ultimo:'',obras:[]}]; }
function usrLocalGravar(l){ try{ localStorage.setItem(LOCAL_USR, JSON.stringify(l)); }catch(e){} }
var Usuarios={
  remoto:function(){ return !!(Store.cli&&Store.v2&&Store.v2()); },
  listar:async function(){
    if(this.remoto()){ var r=await Store.cli.rpc('listar_usuarios'); if(r.error) throw new Error(r.error.message); return (r.data||[]).map(function(u){ return {id:u.user_id, email:u.email, nome:u.nome, papel:u.papel, ativo:!!u.ativo, situacao:u.situacao, ultimo:u.ultimo_acesso, obras:u.obras||[]}; }); }
    return usrLocalLer();
  },
  convidar:async function(email,nome,papel,obras){
    if(this.remoto()){ var r=await Store.cli.rpc('convidar_usuario',{p_email:email,p_nome:nome,p_papel:papel,p_obras:obras}); if(r.error) throw new Error(r.error.message); return r.data; }
    var l=usrLocalLer(), em=email.toLowerCase(), x=l.filter(function(u){ return u.email===em; })[0];
    if(x){ x.nome=nome; x.papel=papel; x.obras=obras; x.ativo=true; x.situacao='ativo'; usrLocalGravar(l); return 'existente'; }
    l.push({id:'u'+Date.now().toString(36),email:em,nome:nome,papel:papel,ativo:false,situacao:'convidado',ultimo:'',obras:obras}); usrLocalGravar(l); return 'convidado';
  },
  definir:async function(id,nome,papel,ativo){
    if(this.remoto()){ var r=await Store.cli.rpc('definir_acesso',{uid:id,p_nome:nome,p_papel:papel,p_ativo:ativo}); if(r.error) throw new Error(r.error.message); return; }
    var l=usrLocalLer(), x=l.filter(function(u){ return u.id===id; })[0]; if(!x) return;
    var donos=l.filter(function(u){ return u.papel==='dono'&&u.ativo&&u.id!==id; }).length;
    if(x.papel==='dono'&&x.ativo&&(papel!=='dono'||!ativo)&&donos===0) throw new Error('Deve existir ao menos um dono ativo');
    x.nome=nome; x.papel=papel; x.ativo=ativo; x.situacao=ativo?'ativo':'suspenso'; usrLocalGravar(l);
  },
  obras:async function(id,obras){
    if(this.remoto()){ var r=await Store.cli.rpc('definir_obras_usuario',{uid:id,p_obras:obras}); if(r.error) throw new Error(r.error.message); return; }
    var l=usrLocalLer(), x=l.filter(function(u){ return u.id===id; })[0]; if(x){ x.obras=obras; usrLocalGravar(l); }
  },
  remover:async function(u){
    if(this.remoto()){ var r=u.situacao==='convidado'?await Store.cli.rpc('cancelar_convite',{p_email:u.email}):await Store.cli.rpc('remover_acesso',{uid:u.id}); if(r.error) throw new Error(r.error.message); return; }
    var l=usrLocalLer(); if(u.papel==='dono'&&u.ativo&&l.filter(function(x){ return x.papel==='dono'&&x.ativo&&x.id!==u.id; }).length===0) throw new Error('Deve existir ao menos um dono ativo');
    usrLocalGravar(l.filter(function(x){ return x.id!==u.id; }));
  }
};
function usrCarregar(forca){
  if(!cdPodeUsuarios()) return;
  if(ui.cdUsr&&!forca) return; ui.cdUsr={carregando:true, lista:[], erro:''};
  Usuarios.listar().then(function(l){ ui.cdUsr={carregando:false, lista:l, erro:''}; render(); }, function(e){ ui.cdUsr={carregando:false, lista:[], erro:(e&&e.message)||'erro'}; render(); });
}
function cdListaUsuarios(){
  if(!cdPodeUsuarios()) return '<div class="card empty"><h3>Somente o administrador gerencia usuários</h3><p>Peça à diretoria para liberar, suspender ou remover acessos.</p></div>';
  usrCarregar(false); var s=ui.cdUsr||{lista:[],carregando:true};
  var demo=Usuarios.remoto()?'':'<div class="callout" style="margin:12px 0"><strong>Modo demonstração.</strong> Esta lista fica só neste aparelho. Com o app conectado ao Supabase, ela mostra as contas reais e libera, suspende e remove acessos de verdade.</div>';
  var lista=(s.lista||[]).slice(), f=cdFiltro();
  var ativos=lista.filter(function(u){ return u.situacao==='ativo'; }).length;
  var vis=lista.filter(function(u){ return f==='todos'||(f==='ativos'?(u.situacao==='ativo'||u.situacao==='convidado'):(u.situacao==='suspenso'||u.situacao==='sem_acesso')); });
  var lin=vis.map(function(u){
    var sit=CD_SIT[u.situacao]||['',u.situacao], p=CD_PAPEIS[u.papel];
    var acoes='<button class="btn sm" data-act="usr-editar" data-id="'+esc(u.id)+'" data-email="'+esc(u.email)+'" data-write>Editar</button> <button class="btn sm" data-act="usr-obras" data-id="'+esc(u.id)+'" data-write>Obras</button> '
      +(u.situacao==='ativo'?'<button class="btn sm" data-act="usr-suspender" data-id="'+esc(u.id)+'" data-write>Suspender</button> ':(u.situacao==='suspenso'||u.situacao==='sem_acesso'?'<button class="btn sm" data-act="usr-reativar" data-id="'+esc(u.id)+'" data-write>'+(u.situacao==='sem_acesso'?'Liberar':'Reativar')+'</button> ':''))
      +'<button class="btn sm danger" data-act="usr-remover" data-id="'+esc(u.id)+'" data-email="'+esc(u.email)+'" data-write>'+(u.situacao==='convidado'?'Cancelar convite':'Remover')+'</button>';
    return cdLinha({nome:u.nome,email:u.email,ativo:true},['<strong>'+esc(u.nome||'—')+'</strong><div class="tiny muted">'+esc(u.email)+'</div>',p?'<span class="chip steel" title="'+esc(p[1])+'">'+esc(p[0])+'</span>':'<span class="muted">sem papel</span>',u.papel==='dono'?'Todas':(u.obras.length?plural(u.obras.length,'obra','obras'):'<span class="muted">nenhuma</span>'),u.ultimo?fmt(String(u.ultimo).slice(0,10)):'<span class="muted">nunca</span>','<span class="chip '+sit[0]+'">'+sit[1]+'</span>'],acoes);
  });
  var barra=cdBarra(lista.length,ativos+lista.filter(function(u){ return u.situacao==='convidado'; }).length,['usr-novo','+ Adicionar usuário']);
  var leg='<section class="card sec"><div class="card-h"><h2>O que cada papel pode</h2></div><div class="grid cols3 pad">'+Object.keys(CD_PAPEIS).map(function(k){ return '<div><span class="chip steel">'+esc(CD_PAPEIS[k][0])+'</span><p class="small muted" style="margin-top:6px">'+esc(CD_PAPEIS[k][1])+'</p></div>'; }).join('')+'</div></section>';
  var corpo=s.carregando?'<div class="card empty"><p>Carregando usuários…</p></div>':(s.erro?'<div class="callout crit"><strong>Não consegui listar os usuários.</strong><p class="small">'+esc(s.erro)+'</p></div>':cdTabela(['Pessoa','Papel','Obras','Último acesso','Situação'],lin,['Nenhum usuário neste filtro','Adicione quem vai usar o app e escolha o papel e as obras.']));
  return demo+barra+corpo+leg;
}
function usrAcha(id,email){ var l=(ui.cdUsr&&ui.cdUsr.lista)||[]; return l.filter(function(u){ return (id&&u.id===id)||(!u.id&&u.email===email); })[0]||l.filter(function(u){ return u.email===email; })[0]; }
function usrErro(e){ return (e&&e.message)||'Não foi possível concluir.'; }
function usrObrasDlg(titulo,sel,aoSalvar){
  var obras=L('obras').filter(function(o){ return o.situacao!=='cancelada'; }).sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); });
  var d=openDlg('<div class="dlg-h"><h2>'+esc(titulo)+'</h2><button type="button" class="btn ghost ico" data-close aria-label="Fechar">✕</button></div><div class="dlg-b"><p class="muted small" style="margin-bottom:10px">A pessoa só enxerga as obras marcadas. Administrador vê todas.</p>'
    +(obras.length?obras.map(function(o){ return '<label class="seg-opts" style="display:block;margin-bottom:6px"><span style="display:inline-flex;gap:8px;align-items:center;border:1px solid var(--line);border-radius:5px;padding:7px 12px;width:100%"><input type="checkbox" value="'+esc(o.id)+'"'+(sel.indexOf(o.id)>=0?' checked':'')+' style="width:auto;min-height:0"> '+esc(o.nome)+'</span></label>'; }).join(''):'<p class="muted">Nenhuma obra cadastrada.</p>')
    +'<div class="err-msg hide" id="uo_err" role="alert"></div></div><div class="dlg-f"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="uo_ok">Salvar</button></div>');
  d.querySelector('#uo_ok').addEventListener('click', async function(){
    var ids=Array.prototype.map.call(d.querySelectorAll('input[type=checkbox]:checked'),function(i){ return i.value; });
    try{ await aoSalvar(ids); closeDlg(); }catch(e){ var er=d.querySelector('#uo_err'); er.textContent=usrErro(e); er.classList.remove('hide'); }
  });
}
function usrForm(u){
  var novo=!u;
  openForm({title:novo?'Adicionar usuário':'Editar usuário', wide:true, intro:novo?'A pessoa entra assim que criar a conta com este e-mail. Antes disso ela aparece como “Convidado”.':'', fields:[
    [{name:'nome',label:'Nome',required:true,value:u&&u.nome},{name:'email',label:'E-mail de acesso',type:'email',required:true,value:u&&u.email}],
    {name:'papel',label:'Papel',type:'select',options:Object.keys(CD_PAPEIS).map(function(k){ return [k,CD_PAPEIS[k][0]+' — '+CD_PAPEIS[k][1]]; }),value:(u&&u.papel)||'gestor'}],
    submit:novo?'Adicionar':'Salvar',
    onSubmit:async function(v){
      if(!(v.nome||'').trim()) return 'Informe o nome.'; if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email||'')) return 'E-mail inválido.';
      try{
        if(novo){ var r=await Usuarios.convidar(v.email.trim(), v.nome.trim(), v.papel, []); toast(r==='existente'?'Usuário já tinha conta: acesso liberado.':'Convite registrado.'); usrCarregar(true); closeDlg(); usrObrasDlgDepois(v.email.trim().toLowerCase()); return false; }
        await Usuarios.definir(u.id, v.nome.trim(), v.papel, u.ativo!==false&&u.situacao!=='suspenso'); toast('Usuário atualizado.'); usrCarregar(true);
      }catch(e){ return usrErro(e); }
    }});
}
function usrObrasDlgDepois(email){
  setTimeout(function(){ Usuarios.listar().then(function(l){ var u=l.filter(function(x){ return x.email===email; })[0]; if(!u) return; if(u.papel==='dono') return;
    usrObrasDlg('Obras de '+(u.nome||email),u.obras||[],async function(ids){ if(u.situacao==='convidado'&&Usuarios.remoto()){ await Usuarios.convidar(u.email,u.nome,u.papel,ids); } else await Usuarios.obras(u.id,ids); usrCarregar(true); toast('Obras salvas.'); }); }); },60);
}
Object.assign(AG,{
  'usr-novo':function(){ usrForm(null); },
  'usr-editar':function(d){ var u=usrAcha(d.id,d.email); if(u) usrForm(u); },
  'usr-obras':function(d){ var u=usrAcha(d.id,d.email); if(!u) return; if(u.papel==='dono'){ toast('Administrador vê todas as obras.'); return; }
    usrObrasDlg('Obras de '+(u.nome||u.email),u.obras||[],async function(ids){ if(u.situacao==='convidado'&&Usuarios.remoto()) await Usuarios.convidar(u.email,u.nome,u.papel,ids); else await Usuarios.obras(u.id,ids); usrCarregar(true); toast('Obras salvas.'); }); },
  'usr-suspender':async function(d){ var u=usrAcha(d.id,d.email); if(!u) return; var ok=await confirmDlg('Suspender o acesso de '+(u.nome||u.email)+'?','<p>A pessoa não consegue mais entrar até você reativar. Nada do que ela fez é apagado.</p>','Suspender',true); if(!ok) return;
    try{ await Usuarios.definir(u.id,u.nome,u.papel,false); toast('Acesso suspenso.'); }catch(e){ blockDlg('Não foi possível suspender',[usrErro(e)],'Bloqueado:'); } usrCarregar(true); },
  'usr-reativar':async function(d){ var u=usrAcha(d.id,d.email); if(!u) return; try{ await Usuarios.definir(u.id,u.nome,u.papel||'leitura',true); toast('Acesso liberado.'); }catch(e){ blockDlg('Não foi possível reativar',[usrErro(e)],'Bloqueado:'); } usrCarregar(true); },
  'usr-remover':async function(d){ var u=usrAcha(d.id,d.email); if(!u) return; var conv=u.situacao==='convidado';
    var ok=await confirmDlg((conv?'Cancelar o convite de ':'Remover o acesso de ')+(u.nome||u.email)+'?','<p>'+(conv?'O convite deixa de valer.':'A pessoa perde o acesso e os vínculos com as obras. A conta de login em si continua existindo, mas sem acesso a nada.')+'</p>',conv?'Cancelar convite':'Remover',true); if(!ok) return;
    try{ await Usuarios.remover(u); toast(conv?'Convite cancelado.':'Acesso removido.'); }catch(e){ blockDlg('Não foi possível remover',[usrErro(e)],'Bloqueado:'); } usrCarregar(true); }
});

/* ---------- a página ---------- */
function vCadastros(){
  if(ehCliente()||Store.papel==='campo') return notFound();
  var aba=cdAba(), abas=CD_ABAS.filter(function(a){ return a[0]!=='usuarios'||cdPodeUsuarios(); });
  var tabs='<nav class="tabs" aria-label="Cadastros">'+abas.map(function(a){ return '<a href="#/cadastros/'+a[0]+'"'+(a[0]===aba?' aria-current="page"':'')+'>'+a[1]+'</a>'; }).join('')+'</nav>';
  var info={servicos:'O que a Cariati entrega em Gestão de Obras, Administração e Gestão de Engenharia. Edite, acrescente ou exclua; em cada obra você marca o que foi contratado.', clientes:'Quem contrata a Cariati. Cadastre uma vez e use em todas as obras do cliente.', obras:'Todas as obras, em andamento, encerradas e canceladas. Cada obra tem o seu cadastro completo.', prestadores:'Quem executa os serviços nas obras, com seguro e treinamento.', fornecedores:'Quem vende material e aluga equipamento.', parceiros:'Arquitetos, engenheiros, projetistas, imobiliárias e corretores.', usuarios:'Quem pode usar o aplicativo: entrada, saída, papel e obras de cada pessoa.'}[aba];
  var corpo=aba==='clientes'?cdListaClientes():(aba==='obras'?cdListaObras():(aba==='prestadores'?cdListaPrest():(aba==='fornecedores'?cdListaForn():(aba==='parceiros'?cdListaParceiros():(aba==='servicos'?cdListaServicos():cdListaUsuarios())))));
  return '<div class="wrap"><div class="sec-h"><div><h1>Cadastros</h1><p class="muted" style="margin-top:4px">'+info+'</p></div></div>'+tabs+corpo+'</div>';
}
COBX.vCadastros=vCadastros; COBX.cdAtivo=cdAtivo;
