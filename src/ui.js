/* ================= CAMADA DE EXPERIÊNCIA (aparência e navegação; nenhuma regra de negócio) =================
   · busca global (Ctrl/Cmd+K ou "/"), "Mais" no celular, menu lateral recolhível, favoritas
   · medidor circular luminoso, orbes, sparklines e contadores animados
   · tabelas viram cartões no celular, ação principal ao alcance do polegar
   · efeitos leves em aparelho fraco, parallax suave, tema escuro como padrão */
var UI_SEARCH_ICO={pag:'⌂', obra:'▣', etapa:'◆', cad:'☺', acao:'+'};
function uiFavs(){ try{ var l=JSON.parse(localStorage.getItem('cob.fav')||'[]'); return Array.isArray(l)?l:[]; }catch(e){ return []; } }
function uiSetFavs(l){ try{ localStorage.setItem('cob.fav', JSON.stringify(l.slice(0,12))); }catch(e){} }
function uiEhFav(id){ return uiFavs().indexOf(id)>=0; }
function sideFav(){
  if(Store.papel==='cliente') return '';
  var ids=uiFavs().filter(function(id){ return !!G('obras',id); }); if(!ids.length) return '';
  return '<div class="side-fav"><h4>Favoritas</h4>'+ids.map(function(id){ var o=G('obras',id); return '<a href="#/obra/'+esc(id)+'/resumo" title="'+esc(o.nome)+'">'+esc(o.nome)+'</a>'; }).join('')+'</div>';
}
function favBtn(oid){ var on=uiEhFav(oid); return '<button type="button" class="fav" data-act="obra-fav" data-oid="'+esc(oid)+'" aria-pressed="'+on+'" aria-label="'+(on?'Tirar das favoritas':'Marcar como favorita')+'" data-tip="'+(on?'Tirar das favoritas':'Favoritar')+'"></button>'; }
function crumbs(itens){
  return '<nav class="crumbs" aria-label="Você está em">'+itens.map(function(x,i){ var ult=i===itens.length-1; return (i?'<span aria-hidden="true">›</span>':'')+(ult||!x[1]?'<span'+(ult?' aria-current="page"':'')+'>'+esc(x[0])+'</span>':'<a href="'+x[1]+'">'+esc(x[0])+'</a>'); }).join('')+'</nav>';
}

/* ---------- medidor circular, orbes e sparklines ---------- */
var _uiId=0;
function gaugeHtml(pct,rotulo,sub){
  var p=pct==null||isNaN(pct)?0:Math.max(0,Math.min(100,pct)), id='gg'+(++_uiId), R=82, C=2*Math.PI*R, d=C*p/100, t='';
  for(var i=0;i<60;i++){ var a=i/60*2*Math.PI, maj=i%5===0, r1=maj?91:94.5, r2=100; t+='<line x1="'+(100+r1*Math.sin(a)).toFixed(2)+'" y1="'+(100-r1*Math.cos(a)).toFixed(2)+'" x2="'+(100+r2*Math.sin(a)).toFixed(2)+'" y2="'+(100-r2*Math.cos(a)).toFixed(2)+'" stroke="var(--ink3)" stroke-width="'+(maj?1.6:.8)+'" opacity="'+(maj?.8:.4)+'"/>'; }
  var ang=-Math.PI/2+2*Math.PI*p/100, ex=(100+R*Math.cos(ang)).toFixed(2), ey=(100+R*Math.sin(ang)).toFixed(2);
  var svg='<svg viewBox="-6 -6 212 212" role="img" aria-label="'+esc(rotulo)+': '+Math.round(p)+'%"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD08A"/><stop offset=".45" stop-color="#FF9F1C"/><stop offset="1" stop-color="#FF6B35"/></linearGradient><linearGradient id="'+id+'v" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#C084FC"/></linearGradient><filter id="'+id+'f" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
    +t+'<circle cx="100" cy="100" r="'+R+'" fill="none" stroke="var(--line)" stroke-width="12"/>'
        +'<circle cx="100" cy="100" r="56" fill="none" stroke="var(--line2)" stroke-width="1"/>'
    +'<circle class="g-arco" cx="100" cy="100" r="'+R+'" fill="none" stroke="url(#'+id+')" stroke-width="12" stroke-linecap="round" transform="rotate(-90 100 100)" filter="url(#'+id+'f)" style="--c:'+C.toFixed(2)+';--to:'+(C-d).toFixed(2)+'"/>'
    +(p>0?'<circle cx="'+ex+'" cy="'+ey+'" r="6.5" fill="#fff" stroke="#FF9F1C" stroke-width="3" filter="url(#'+id+'f)"/>':'')+'</svg>';
  return '<div class="gauge">'+'<div class="g-halo"></div>'+svg+'<div class="g-val"><b>'+Math.round(p)+'%</b><small>'+esc(rotulo)+'</small>'+(sub?'<small style="margin-top:2px;letter-spacing:.04em;text-transform:none;font-weight:500">'+esc(sub)+'</small>':'')+'</div></div>';
}
function orbHtml(pct,rotulo,txt,cor){
  var p=pct==null||isNaN(pct)?0:Math.max(0,Math.min(100,pct)), id='go'+(++_uiId), R=26, C=2*Math.PI*R, d=C*p/100;
  var c1=cor==='cy'?'#22D3EE':'#8B5CF6', c2=cor==='cy'?'#67E8F9':'#C084FC';
  return '<div class="orb"><svg viewBox="-4 -4 72 72" role="img" aria-label="'+esc(rotulo)+': '+Math.round(p)+'%"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></linearGradient></defs><circle cx="32" cy="32" r="'+R+'" fill="none" stroke="var(--line)" stroke-width="6"/><circle class="g-arco" cx="32" cy="32" r="'+R+'" fill="none" stroke="url(#'+id+')" stroke-width="6" stroke-linecap="round" transform="rotate(-90 32 32)" style="--c:'+C.toFixed(2)+';--to:'+(C-d).toFixed(2)+';filter:drop-shadow(0 0 6px '+c1+')"/><circle cx="32" cy="32" r="14" fill="'+c1+'" opacity=".16"/></svg><div><b>'+(txt!=null?esc(txt):Math.round(p)+'%')+'</b><span>'+esc(rotulo)+'</span></div></div>';
}
function sparkHtml(vals){
  vals=(vals||[]).filter(function(v){ return v!=null&&!isNaN(v); }); if(vals.length<2) return '';
  var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), W=120, H=30, rg=mx-mn||1;
  var pts=vals.map(function(v,i){ return [(i/(vals.length-1)*W).toFixed(1), (H-3-(v-mn)/rg*(H-6)).toFixed(1)]; });
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true"><path d="M'+pts.map(function(p){ return p.join(','); }).join(' L')+'"/></svg>';
}
function heroHtml(o){
  return '<section class="card hero"><i class="br tl"></i><i class="br tr"></i><i class="br bl"></i><i class="br brr"></i><div>'+gaugeHtml(o.pct,o.rotulo,o.sub)+'</div><div><div class="hero-t">'+esc(o.eyebrow||'')+'</div><h2>'+esc(o.titulo)+'</h2>'+(o.texto?'<p>'+esc(o.texto)+'</p>':'')+'<div class="hero-rings">'+(o.orbes||[]).join('')+'</div>'+(o.extra||'')+'</div></section>';
}

/* ---------- faixas de destaque por tela (só percentuais e contagens, nunca valores em R$) ---------- */
function heroPainel(){
  if(Store.papel==='cliente') return '';
  var d=dashDados(); if(!d.n) return '';
  var meta=d.linhas[0]?d.linhas[0].meta:80;
  return heroHtml({pct:d.fis,rotulo:'Avanço físico',sub:'média das obras',eyebrow:'Visão do escritório',titulo:d.n+(d.n===1?' obra em andamento':' obras em andamento'),
    texto:d.criticos?plural(d.criticos,'alerta crítico pede atenção hoje.','alertas críticos pedem atenção hoje.'):'Nenhum alerta crítico agora.',
    orbes:[orbHtml(d.ppc,'PPC médio',d.ppc==null?'—':null),orbHtml(d.conf,'Conformidade',d.conf==null?'—':null,'cy'),orbHtml(Math.min(100,(d.spi||0)*100),'SPI',d.spi==null?'—':dashFmt1(d.spi))]});
}
function heroObra(o){
  var oid=o.id, lib=ETAPAS.filter(function(e){ return etapaDoc(oid,e.n).status==='liberada'; }).length, cron=avancoCron(oid), ppc=ppcAtual(oid), conf=conformidade(oid);
  var ab=byObra('ocorrencias',oid).filter(ocAberta);
  return heroHtml({pct:cron?cron:lib/22*100,rotulo:cron?'Cronograma':'Etapas liberadas',sub:lib+' de 22 etapas liberadas',eyebrow:'Andamento da obra',titulo:o.nome,
    texto:ab.length?plural(ab.length,'ocorrência aberta.','ocorrências abertas.'):'Nenhuma ocorrência aberta.',
    orbes:[orbHtml(ppc?ppc.ppc*100:null,'PPC',ppc?null:'—'),orbHtml(conf==null?null:conf*100,'Conformidade',conf==null?'—':null,'cy'),orbHtml(lib/22*100,'Protocolo',lib+'/22')]});
}
function heroVisao(){
  var d=dashDados(); if(!d.n) return '';
  return heroHtml({pct:d.fis,rotulo:'Avanço físico',sub:'média das obras',eyebrow:'Leitura rápida',titulo:'Como estão as obras hoje',
    texto:d.qzAtr?plural(d.qzAtr,'relatório quinzenal em atraso.','relatórios quinzenais em atraso.'):'Relatórios quinzenais em dia.',
    orbes:[orbHtml(d.ppc,'PPC médio',d.ppc==null?'—':null),orbHtml(Math.min(100,(d.spi||0)*100),'SPI',d.spi==null?'—':dashFmt1(d.spi)),orbHtml(d.conf,'Conformidade',d.conf==null?'—':null,'cy')]});
}

/* ---------- busca global ---------- */
var BUSCA={it:[], sel:0};
function buscaDados(){
  var it=[], add=function(g,t,s,ico,go,ac){ it.push({g:g,t:t,s:s||'',i:ico,go:go,ac:ac||''}); };
  var staff=Store.papel!=='cliente';
  [['Obras','#/painel'],['Visão geral','#/visao'],['Agenda','#/agenda'],['Prestadores','#/prestadores'],['Fornecedores','#/fornecedores'],['Fluxo geral','#/fluxo'],['DRE','#/dre'],['Cadastros','#/cadastros'],['Clientes','#/cadastros/clientes'],['Parceiros','#/cadastros/parceiros'],['Usuários e acessos','#/cadastros/usuarios'],['Nuvem','#/nuvem']].forEach(function(p){ if(staff||p[1]==='#/painel') add('Páginas',p[0],'',UI_SEARCH_ICO.pag,p[1]); });
  var abas=[['resumo','Resumo'],['cadastro','Cadastro'],['etapas','Etapas e evolução'],['cronograma','Cronograma'],['diario','Diário'],['ocorrencias','Ocorrências'],['compras','Compras'],['pedidos','Pedidos de pagamento'],['financeiro','Financeiro'],['pagprazos','Pagamentos e prazos'],['metaevo','Meta × evolução'],['quinzenal','Relatório quinzenal'],['relatorio','Relatório mensal'],['medicao','Medição'],['orcamento','Orçamento'],['contratos','Contratos'],['estoque','Estoque'],['encerramento','Encerramento']];
  L('obras').forEach(function(o){
    add('Obras',o.nome,[o.codigo,o.cliente].filter(Boolean).join(' · '),UI_SEARCH_ICO.obra,'#/obra/'+o.id+'/resumo');
    if(staff) abas.forEach(function(a){ add('Dentro das obras',o.nome+' › '+a[1],'',UI_SEARCH_ICO.obra,'#/obra/'+o.id+'/'+a[0]); });
    ETAPAS.forEach(function(e){ add('Etapas',o.nome+' › '+e.n+'. '+e.nome,'',UI_SEARCH_ICO.etapa,'#/obra/'+o.id+'/etapa/'+e.n); });
  });
  if(staff){
    L('clientes').forEach(function(c){ add('Cadastros',c.nome,'Cliente'+(c.doc?' · '+c.doc:''),UI_SEARCH_ICO.cad,'#/cadastros/clientes'); });
    L('parceiros').forEach(function(c){ add('Cadastros',c.nome,'Parceiro',UI_SEARCH_ICO.cad,'#/cadastros/parceiros'); });
    L('prestadores').forEach(function(c){ add('Cadastros',c.nome,'Prestador'+(c.especialidade?' · '+c.especialidade:''),UI_SEARCH_ICO.cad,'#/cadastros/prestadores'); });
    L('fornecedores').forEach(function(c){ add('Cadastros',c.nome,'Fornecedor'+(c.categoria?' · '+c.categoria:''),UI_SEARCH_ICO.cad,'#/cadastros/fornecedores'); });
    add('Ações','Nova obra','',UI_SEARCH_ICO.acao,'','obra-nova'); add('Ações','Novo cliente','',UI_SEARCH_ICO.acao,'','cd-novo-clientes'); add('Ações','Alternar tema claro e escuro','',UI_SEARCH_ICO.acao,'','tema');
  } else add('Ações','Alternar tema claro e escuro','',UI_SEARCH_ICO.acao,'','tema');
  return it;
}
function buscaFiltrar(q){
  var base=buscaDados(), t=semAcento(q||'').toLowerCase().split(/\s+/).filter(Boolean);
  if(!t.length) return base.filter(function(x){ return x.g==='Páginas'||x.g==='Ações'; }).slice(0,12).concat(base.filter(function(x){ return x.g==='Obras'; }).slice(0,5));
  var ok=base.filter(function(x){ var h=semAcento(x.t+' '+x.s).toLowerCase(); return t.every(function(k){ return h.indexOf(k)>=0; }); });
  var cont={}, out=[]; ok.forEach(function(x){ cont[x.g]=(cont[x.g]||0)+1; if(cont[x.g]<=8) out.push(x); }); return out;
}
function buscaDesenhar(){
  var box=document.getElementById('busca'); if(!box) return; var res=box.querySelector('.bs-res');
  if(!BUSCA.it.length){ res.innerHTML='<div class="bs-vazio">Nada encontrado. Tente o nome da obra, do cliente ou da etapa.</div>'; return; }
  var h='', g=''; BUSCA.it.forEach(function(x,i){ if(x.g!==g){ g=x.g; h+='<h4>'+esc(g)+'</h4>'; } h+='<div class="bs-it" role="option" id="bs'+i+'" data-i="'+i+'" aria-selected="'+(i===BUSCA.sel)+'"><i aria-hidden="true">'+x.i+'</i><span>'+esc(x.t)+'</span>'+(x.s?'<small>'+esc(x.s)+'</small>':'')+'</div>'; });
  res.innerHTML=h; var s=res.querySelector('[aria-selected="true"]'); if(s&&s.scrollIntoView) try{ s.scrollIntoView({block:'nearest'}); }catch(e){}
}
function buscaEscolher(i){
  var x=BUSCA.it[i]; if(!x) return; var box=document.getElementById('busca'); if(box&&box.open) box.close();
  if(x.ac==='tema'){ toggleTheme(); return; }
  if(x.ac){ var f=A[x.ac]||AG[x.ac]; if(f) f({}); return; }
  if(x.go) location.hash=x.go;
}
function buscaAbrir(){
  var box=document.getElementById('busca'); if(!box) return; if(box.open) return;
  var d=document.getElementById('dlg'); if(d&&d.open) return;
  box.querySelector('input').value=''; BUSCA.sel=0; BUSCA.it=buscaFiltrar(''); buscaDesenhar();
  box.showModal(); box.querySelector('input').focus();
}
function uiBuscaMontar(){
  if(document.getElementById('busca')) return;
  var d=document.createElement('dialog'); d.id='busca'; d.setAttribute('aria-label','Busca global');
  d.innerHTML='<div class="bs-box"><div class="bs-in"><input type="search" placeholder="Buscar obras, etapas, clientes, páginas…" aria-label="Buscar" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="bs-lista"></div><div class="bs-res" id="bs-lista" role="listbox"></div><div class="bs-dica"><span>↑ ↓ para navegar</span><span>Enter para abrir</span><span>Esc para fechar</span></div></div>';
  document.body.appendChild(d);
  var inp=d.querySelector('input');
  inp.addEventListener('input', function(){ BUSCA.it=buscaFiltrar(inp.value); BUSCA.sel=0; buscaDesenhar(); });
  inp.addEventListener('keydown', function(e){
    if(e.key==='ArrowDown'){ e.preventDefault(); BUSCA.sel=Math.min(BUSCA.it.length-1,BUSCA.sel+1); buscaDesenhar(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); BUSCA.sel=Math.max(0,BUSCA.sel-1); buscaDesenhar(); }
    else if(e.key==='Enter'){ e.preventDefault(); buscaEscolher(BUSCA.sel); }
  });
  d.addEventListener('click', function(e){ var it=e.target.closest('.bs-it'); if(it){ buscaEscolher(Number(it.dataset.i)); return; } if(!e.target.closest('.bs-box')) d.close(); });
}
document.addEventListener('keydown', function(e){
  var t=e.target, tag=t&&t.tagName, edit=tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable);
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){ e.preventDefault(); buscaAbrir(); }
  else if(e.key==='/'&&!edit&&!e.ctrlKey&&!e.metaKey&&!e.altKey){ e.preventDefault(); buscaAbrir(); }
});

/* ---------- ações da camada ---------- */
Object.assign(AG,{
  'busca-global':function(){ buscaAbrir(); },
  'tema':function(){ toggleTheme(); },
  'nav-recolher':function(){ var on=document.body.classList.toggle('nav-mini'); try{ localStorage.setItem('cob.navmini',on?'1':'0'); }catch(e){} },
  'obra-fav':function(d){ var l=uiFavs(), i=l.indexOf(d.oid); if(i>=0) l.splice(i,1); else l.unshift(d.oid); uiSetFavs(l); render(); toast(i>=0?'Removida das favoritas.':'Marcada como favorita.'); },
  'nav-mais':function(){
    var nav=document.querySelector('.top .nav'), tools=document.querySelector('.top .tools'); if(!nav) return;
    var links=Array.prototype.map.call(nav.querySelectorAll('a'),function(a){ return a.outerHTML; }).join('');
    var ferr=tools?Array.prototype.filter.call(tools.children,function(c){ return !c.classList.contains('nav-recolher'); }).map(function(c){ return c.outerHTML.replace(/class="btn ghost sm"/,'class="btn"'); }).join(''):'';
    openDlg('<div class="dlg-h"><h2>Todos os módulos</h2><button type="button" class="btn ghost ico" data-close aria-label="Fechar">✕</button></div><div class="dlg-b"><nav class="sheet-nav" aria-label="Módulos">'+links+'</nav><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">'+ferr+'</div></div>');
    var d=dlgEl(); if(d){ var fecha=function(e){ if(e.target.closest('.sheet-nav a')||e.target.closest('.dlg-b .row .btn')){ d.removeEventListener('click',fecha); closeDlg(); } }; d.addEventListener('click',fecha); }
  }
});

/* ---------- pós-renderização ---------- */
function uiMovimento(){ try{ return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: no-preference)').matches); }catch(e){ return false; } }
function uiContar(el){
  var txt=(el.textContent||'').trim(), m=/^(\d{1,3}(?:\.\d{3})*|\d+)([,.]\d+)?(%?)$/.exec(txt); if(!m||el.children.length||el.dataset.c) return; el.dataset.c='1';
  var dec=m[2]?m[2].length-1:0, alvo=parseFloat(m[1].replace(/\./g,'')+(m[2]?'.'+m[2].slice(1):'')); if(!isFinite(alvo)||alvo===0) return;
  var ini=performance.now(), dur=900, suf=m[3];
  var fmtN=function(v){ var s=v.toFixed(dec).replace('.',','); return s.replace(/\B(?=(\d{3})+(?!\d))/g,function(x,i,str){ return str.indexOf(',')>=0&&i>str.indexOf(',')?'':'.'; })+suf; };
  var passo=function(t){ var k=Math.min(1,(t-ini)/dur), e=1-Math.pow(1-k,3); el.textContent=fmtN(alvo*e); if(k<1) requestAnimationFrame(passo); else el.textContent=txt; };
  el.textContent=fmtN(0); requestAnimationFrame(passo);
}
function uiTabelas(){
  Array.prototype.forEach.call(document.querySelectorAll('#app .tbl'),function(t){
    var ths=Array.prototype.map.call(t.querySelectorAll('thead th'),function(h){ return (h.textContent||'').trim(); });
    if(!ths.length||ths.length>8||t.dataset.stk) return; t.dataset.stk='1'; t.classList.add('tbl-stack');
    Array.prototype.forEach.call(t.querySelectorAll('tbody tr'),function(tr){ Array.prototype.forEach.call(tr.children,function(td,i){ if(ths[i]) td.setAttribute('data-th',ths[i]); }); });
  });
}
function uiCta(){
  var w=document.querySelector('#app .wrap'); if(!w) return;
  Array.prototype.forEach.call(document.querySelectorAll('#app .cta-fixa'),function(b){ b.classList.remove('cta-fixa'); });
  var b=Array.prototype.filter.call(w.querySelectorAll('.btn.primary[data-act]'),function(x){ return !x.closest('.card,.kcard,.col,dialog,.board,form'); })[0]||Array.prototype.filter.call(w.querySelectorAll('.sec-h .btn.primary[data-act], .row.spread .btn.primary[data-act]'),function(x){ return !x.closest('dialog'); })[0];
  if(b) b.classList.add('cta-fixa');
}
function uiPos(){
  var temNav=!!document.querySelector('#app .top');
  document.body.classList.toggle('sem-nav',!temNav);
  var g=document.getElementById('gtop'); if(g) g.hidden=!temNav;
  uiTabelas(); uiCta();
  if(uiMovimento()) Array.prototype.forEach.call(document.querySelectorAll('#app .kpi-v, #app .kpi-v .num, #app .g-val b, #app .orb b'),uiContar);
}
function uiIniciar(){
  try{ if((navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=2)||(navigator.deviceMemory&&navigator.deviceMemory<=2)) document.documentElement.classList.add('fx-leve'); }catch(e){}
  try{ if(localStorage.getItem('cob.navmini')==='1') document.body.classList.add('nav-mini'); }catch(e){}
  if(!document.getElementById('gtop')){
    var g=document.createElement('div'); g.id='gtop';
    g.innerHTML='<button type="button" class="gsearch" data-act="busca-global" aria-label="Buscar (Ctrl K)">Buscar obras, etapas, clientes…<kbd>Ctrl K</kbd></button><button type="button" class="gtop-chip" data-act="tema" aria-label="Alternar tema claro e escuro" data-tip="Tema claro/escuro"></button>';
    document.body.insertBefore(g,document.getElementById('app')||null);
  }
  uiBuscaMontar();
  if(uiMovimento()&&window.matchMedia('(pointer:fine)').matches){ var raf=0; window.addEventListener('mousemove',function(e){ if(raf) return; raf=requestAnimationFrame(function(){ raf=0; document.documentElement.style.setProperty('--px',(e.clientX/innerWidth-.5).toFixed(3)); document.documentElement.style.setProperty('--py',(e.clientY/innerHeight-.5).toFixed(3)); }); },{passive:true}); }
}
COBX.gaugeHtml=gaugeHtml; COBX.orbHtml=orbHtml; COBX.buscaFiltrar=buscaFiltrar; COBX.uiFavs=uiFavs;
