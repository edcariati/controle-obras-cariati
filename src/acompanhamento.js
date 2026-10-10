/* ================= MOTIVOS DE ATRASO (diário → cronograma) E ACESSO DO CLIENTE =================
   Impedimento: o que travou uma etapa (material que não chegou, equipe faltante, projeto pendente…) é registrado no
   diário e aparece no cronograma, com o motivo, para o setor de obras decidir se ajusta as datas.
   Acesso do cliente: o cliente só visualiza; a Cariati escolhe, por obra, quais áreas ele enxerga. Ele não aprova nada. */
var IMP_MOTIVOS=[['material','Material não chegou'],['equipe','Equipe faltante'],['projeto','Projeto ou definição pendente'],['cliente','Decisão ou pagamento do cliente'],['clima','Chuva ou clima'],['licenca','Licença ou documento'],['outro','Outro']];
function impMotivoNome(k){ return (IMP_MOTIVOS.filter(function(m){ return m[0]===k; })[0]||[k,k||'—'])[1]; }
function diaImpedimento(e){
  if(e.impedMotivo||(e.impedDesc||'').trim()) return {etapa:Number(e.impedEtapa)||0, motivo:e.impedMotivo||'outro', desc:(e.impedDesc||'').trim(), dias:Number(e.impedDias)||0, auto:false};
  if(diaEquipePerda(e)) return {etapa:0, motivo:'equipe', desc:'Equipe faltante', dias:0, auto:true};
  if(diaChuvaPerda(e)) return {etapa:0, motivo:'clima', desc:e.clima||'Chuva', dias:0, auto:true};
  return null;
}
function impedimentosObra(oid){
  return byObra('diarios',oid).map(function(e){ return {e:e, i:diaImpedimento(e)}; }).filter(function(x){ return x.i; }).sort(function(a,b){ return a.e.data<b.e.data?1:-1; });
}
function impNoCronograma(x){ return x.i.motivo==='clima'||!!x.e.impedAplicado||!(x.i.dias>0); }
/* mesmo deslocamento do aditivo: a etapa afetada termina mais tarde e as seguintes começam depois */
function cronoDeslocarEtapa(oid,et,dias){
  var ats=byObra('atividades',oid); if(!ats.length) return Promise.resolve(false);
  var alvo=et?ats.filter(function(a){ return a.etapa===et; }):[], depois=et?ats.filter(function(a){ return a.etapa>et; }):[];
  if(!alvo.length&&!depois.length) alvo=[ats.slice().sort(function(a,b){ return a.fim<b.fim?1:-1; })[0]];
  var t=[]; libSistema(function(){ alvo.forEach(function(a){ t.push(Store.set('atividades',a.id,Object.assign({},a,{fim:addDays(a.fim,dias)}))); });
  depois.forEach(function(a){ t.push(Store.set('atividades',a.id,Object.assign({},a,{inicio:addDays(a.inicio,dias),fim:addDays(a.fim,dias)}))); }); });
  return Promise.all(t).then(function(){ return true; });
}
async function impAplicar(id){
  var e=G('diarios',id), i=e&&diaImpedimento(e); if(!i||!(i.dias>0)||e.impedAplicado||i.motivo==='clima') return;
  var ok=await cronoDeslocarEtapa(e.obraId,i.etapa,i.dias);
  if(!ok){ blockDlg('Obra sem cronograma',['Monte o cronograma da obra para ajustar as datas.'],'Ajuste bloqueado'); return; }
  await Store.set('diarios',id,Object.assign({},e,{impedAplicado:hoje()}));
  toast('Cronograma ajustado: +'+i.dias+' dias'+(i.etapa?' a partir da etapa '+i.etapa:'')+'.');
}
function impPorEtapa(oid){ var m={}; impedimentosObra(oid).forEach(function(x){ var k=x.i.etapa||0; (m[k]=m[k]||[]).push(x); }); return m; }
function impedimentosCron(o){
  if(Store.papel==='cliente') return '';
  var l=impedimentosObra(o.id).slice(0,40), ve=true;
  var linhas=l.length?l.map(function(x){
    var i=x.i, n=impNoCronograma(x), pode=!n&&i.dias>0;
    return '<tr><td class="num">'+fmt(x.e.data)+'</td><td>'+(i.etapa?i.etapa+'. '+esc(etapaInfo(i.etapa).nome):'Geral')+'</td><td><span class="chip '+(i.motivo==='material'||i.motivo==='equipe'?'warn':'steel')+'">'+esc(impMotivoNome(i.motivo))+'</span></td><td>'+esc(i.desc||'—')+'</td><td class="num">'+(i.dias>0?'+'+i.dias+' d':'—')+'</td>'
      +'<td>'+(i.motivo==='clima'?'<span class="chip ok">Ajustado automático (chuva)</span>':(x.e.impedAplicado?'<span class="chip ok">Ajustado em '+fmtC(x.e.impedAplicado)+'</span>':(i.dias>0?'<span class="chip warn">Aguardando o setor de obras</span>':'<span class="chip">Só registro</span>')))+'</td>'
      +'<td>'+(pode?'<button class="btn sm primary" data-act="imp-aplicar" data-id="'+x.e.id+'" data-write>Ajustar +'+i.dias+' d</button>':'')+'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="muted" style="padding:16px">Nenhum empecilho registrado. No diário, informe o impedimento do dia (material, equipe, projeto…) e a etapa que ele atrasa.</td></tr>';
  return '<section class="card sec"><div class="card-h"><div><h2>Motivos de atraso por etapa</h2><p class="muted small">Vêm do diário de obra. O setor de obras decide se ajusta as datas: “Ajustar” empurra a etapa e as seguintes.</p></div></div><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Data</th><th>Etapa</th><th>Motivo</th><th>O que aconteceu</th><th class="num">Atraso previsto</th><th>Situação</th><th></th></tr></thead><tbody>'+linhas+'</tbody></table></div></section>';
}
function impDiarioHtml(e){
  var i=diaImpedimento(e); if(!i) return '';
  return '<p class="small" style="margin-top:6px"><span class="chip '+(i.motivo==='material'||i.motivo==='equipe'?'warn':'steel')+'">Impedimento: '+esc(impMotivoNome(i.motivo))+'</span> '+(i.etapa?'etapa '+i.etapa+' · ':'')+esc(i.desc)+(i.dias>0?' · atraso previsto de '+i.dias+' dias':'')+'</p>';
}
function impRelDados(oid,mes){ return impedimentosObra(oid).filter(function(x){ return String(x.e.data).slice(0,7)===mes; }).map(function(x){ return {data:x.e.data, etapa:x.i.etapa, motivo:impMotivoNome(x.i.motivo), desc:x.i.desc, dias:x.i.dias}; }); }

/* ---- acesso do cliente: só visualiza, e só o que a Cariati liberar ---- */
var CLI_AREAS=[['painel','Painel de evolução'],['cronograma','Cronograma'],['etapas','Etapas e evolução'],['diario','Diário de obra'],['solicitacoes','Solicitações e mudanças'],['relatorio','Relatório mensal'],['quinzenal','Relatório quinzenal'],['pos','Garantias e pós-obra']];
var CLI_PADRAO=['relatorio','quinzenal','pos'];
function clienteLiberado(o){ return o&&Array.isArray(o.clienteVe)?o.clienteVe:CLI_PADRAO; }
function clienteAbas(o){ var t=[]; clienteLiberado(o).forEach(function(k){ if(k==='pos') t.push('garantias','chamados','visitas','satisfacao'); else t.push(k); }); return t; }
function cadAcessoCard(o,ed){
  var l=clienteLiberado(o);
  var itens=CLI_AREAS.map(function(a){ var on=l.indexOf(a[0])>=0; return '<li class="'+(on?'on':'off')+'"><span aria-hidden="true">'+(on?'✓':'—')+'</span> '+esc(a[1])+(on?'':' <span class="visually-hidden">(não liberado)</span>')+'</li>'; }).join('')
    +'<li class="off"><span aria-hidden="true">—</span> Financeiro <span class="tiny muted">(em ajuste: o cliente ainda não vê valores)</span></li>';
  return cadCard('O que o cliente pode ver','O cliente só visualiza, não aprova nada no aplicativo. '+(Array.isArray(o.clienteVe)?'':'<span class="chip steel">padrão, ainda não revisado</span>'),'<ul class="esc-l">'+itens+'</ul>',ed('cad-acesso'));
}
function cadFormAcesso(oid){
  var o=G('obras',oid); if(!o) return;
  openForm({title:'O que o cliente pode ver', wide:true, intro:'O cliente só visualiza. Marque as áreas desta obra que ficam liberadas para ele. O financeiro ainda não pode ser liberado.',
    fields:[{name:'areas',label:'Áreas liberadas',type:'checks',options:CLI_AREAS,value:clienteLiberado(o)}],
    onSubmit:async function(v){ var cur=G('obras',oid), rec=Object.assign({}, cur, {clienteVe:v.areas||[]}); delete rec.id; await Store.set('obras', oid, rec); toast('Acesso do cliente atualizado.'); }});
}
Object.assign(AG,{ 'imp-aplicar':function(d){ impAplicar(d.id); }, 'cad-acesso':function(d){ cadFormAcesso(d.oid); } });
COBX.diaImpedimento=diaImpedimento; COBX.impedimentosObra=impedimentosObra; COBX.clienteAbas=clienteAbas; COBX.impAplicar=impAplicar; COBX.impRelDados=impRelDados; COBX.cadAcessoCard=cadAcessoCard;
