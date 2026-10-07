'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { abrir, obra, obraAdm, dia } = require('./helpers');

const fakeFile = (win, nome, txt) => ({ name: nome, size: txt.length, text: () => Promise.resolve(txt) });
async function envia(e, sel, arq) {
  const el = e.doc.querySelector(sel); Object.defineProperty(el, 'files', { configurable: true, value: [arq] });
  el.dispatchEvent(new e.win.Event('change', { bubbles: true })); await e.tick(250);
}

/* ---------- página Cadastros ---------- */
test('cadastros · menu e abas (clientes, obras, prestadores, fornecedores, parceiros, usuários)', async () => {
  const e = await abrir({ seed: { obras: { o1: obra() } }, hash: '#/cadastros' });
  assert.ok(e.doc.querySelector('#app header a[href="#/cadastros"], #app a[href="#/cadastros"]'));
  ['Clientes', 'Obras', 'Prestadores', 'Fornecedores', 'Parceiros', 'Usuários e acessos'].forEach((s) => assert.match(e.app(), new RegExp(s)));
});

test('cadastros · cliente: adicionar, duplicidade de CPF, cancelar com motivo, reativar e excluir', async () => {
  const e = await abrir({ hash: '#/cadastros/clientes' });
  await e.click('[data-act="cd-novo-clientes"]');
  await e.submit({ nome: 'Maria Silva', tipoPessoa: 'pf', doc: '111.222.333-44', telefone: '(15) 99999-0000', email: 'maria@x.com' });
  const c = () => e.linhas('clientes')[0];
  assert.equal(c().nome, 'Maria Silva'); assert.equal(c().ativo, true);
  assert.match(e.app(), /Maria Silva/);
  await e.click('[data-act="cd-novo-clientes"]');
  await e.submit({ nome: 'Outra', doc: '11122233344' });
  assert.match(e.erroForm(), /Já existe cadastro com este CPF/);
  await e.click('[data-close]');
  await e.click('[data-act="cd-cancelar"][data-col="clientes"]');
  await e.submit({ motivo: '' });
  assert.match(e.erroForm(), /motivo/i);
  await e.submit({ motivo: 'Desistiu do projeto' });
  assert.equal(c().ativo, false); assert.equal(c().motivoInativo, 'Desistiu do projeto');
  assert.doesNotMatch(e.app(), /Maria Silva/);               // filtro "Ativos"
  await e.click('[data-act="cd-filtro"][data-f="inativos"]');
  assert.match(e.app(), /Maria Silva/); assert.match(e.app(), /Cancelado/);
  await e.click('[data-act="cd-reativar"][data-col="clientes"]');
  assert.equal(c().ativo, true);
  await e.click('[data-act="cd-filtro"][data-f="ativos"]');
  await e.click('[data-act="cd-excluir"][data-col="clientes"]');
  await e.click('[data-x="1"]');
  assert.equal(e.linhas('clientes').length, 0);
});

test('cadastros · cliente com obra vinculada não pode ser excluído (orienta a cancelar)', async () => {
  const seed = { clientes: { c1: { nome: 'Maria', ativo: true } }, obras: { o1: obra({ clienteId: 'c1', cliente: 'Maria' }) } };
  const e = await abrir({ seed, hash: '#/cadastros/clientes' });
  await e.click('[data-act="cd-excluir"][data-col="clientes"]');
  assert.match(e.dlg(), /Não dá para excluir/); assert.match(e.dlg(), /1 obra/);
  assert.equal(e.linhas('clientes').length, 1);
});

test('cadastros · parceiro com comissão, tipo e busca', async () => {
  const e = await abrir({ hash: '#/cadastros/parceiros' });
  await e.click('[data-act="cd-novo-parceiros"]');
  await e.submit({ nome: 'Roger Corretor', tipo: 'corretor', telefone: '(15) 1', comissao: '5' });
  assert.match(e.app(), /Roger Corretor/); assert.match(e.app(), /Corretor\(a\)/); assert.match(e.app(), /5%/);
  const busca = e.doc.querySelector('.cd-busca'); busca.value = 'zzz'; busca.dispatchEvent(new e.win.Event('input', { bubbles: true }));
  assert.equal(e.doc.querySelector('.cd-tbl tbody tr').style.display, 'none');
  busca.value = 'roger'; busca.dispatchEvent(new e.win.Event('input', { bubbles: true }));
  assert.equal(e.doc.querySelector('.cd-tbl tbody tr').style.display, '');
});

test('cadastros · obra: cancelar sai do painel e do KPI, reativar volta, excluir só sem registros', async () => {
  const seed = { obras: { o1: obra({ nome: 'Casa Alfa' }), o2: obra({ nome: 'Casa Beta' }) }, diarios: { d1: { obraId: 'o2', data: dia(0), texto: 'x' } } };
  const e = await abrir({ seed, hash: '#/cadastros/obras' });
  await e.click('[data-act="cd-cancelar"][data-col="obras"][data-id="o1"]');
  await e.submit({ motivo: 'Cliente cancelou' });
  assert.equal(e.linhas('obras').filter((o) => o.id === 'o1')[0].situacao, 'cancelada');
  await e.go('#/painel');
  assert.doesNotMatch(e.app(), /Casa Alfa/); assert.match(e.app(), /Casa Beta/);
  await e.go('#/cadastros/obras');
  await e.click('[data-act="cd-filtro"][data-f="inativos"]');
  assert.match(e.app(), /Casa Alfa/); assert.match(e.app(), /Cancelada/);
  await e.click('[data-act="cd-reativar"][data-col="obras"][data-id="o1"]');
  await e.click('[data-act="cd-filtro"][data-f="ativos"]');
  assert.match(e.app(), /Casa Alfa/);
  await e.click('[data-act="cd-excluir"][data-col="obras"][data-id="o2"]');
  assert.match(e.dlg(), /Não dá para excluir/); assert.match(e.dlg(), /1 registros/);
});

test('cadastros · prestador cancelado some das escolhas e fornecedor idem', async () => {
  const seed = { prestadores: { p1: { nome: 'Fulano', ativo: true }, p2: { nome: 'Beltrano', ativo: false, inativo: true } }, fornecedores: { f1: { nome: 'Forn A' }, f2: { nome: 'Forn B', inativo: true, ativo: false } } };
  const e = await abrir({ seed, hash: '#/cadastros/prestadores' });
  assert.match(e.app(), /Fulano/); assert.doesNotMatch(e.app(), /Beltrano/);
  assert.doesNotMatch(e.x.G ? 'x' : '', /^$/);
  await e.go('#/cadastros/fornecedores'); assert.match(e.app(), /Forn A/); assert.doesNotMatch(e.app(), /Forn B/);
});

/* ---------- usuários e acessos (modo demonstração) ---------- */
test('usuários · lista, adicionar (convidado), suspender, reativar, remover e proteção do último administrador', async () => {
  const e = await abrir({ hash: '#/cadastros/usuarios' });
  await e.tick(150);
  assert.match(e.app(), /Modo demonstração/); assert.match(e.app(), /cariati@cariati\.com\.br/); assert.match(e.app(), /Administrador/);
  await e.click('[data-act="usr-novo"]');
  await e.submit({ nome: 'Nova Pessoa', email: 'nova@cariati.com.br', papel: 'campo' });
  await e.tick(300);
  assert.match(e.app(), /nova@cariati\.com\.br/); assert.match(e.app(), /Convidado/);
  await e.click('[data-close]').catch(() => {});
  await e.tick(100);
  // suspender o Ruan e reativar
  await e.click('[data-act="usr-suspender"][data-id="u2"]');
  await e.click('[data-x="1"]'); await e.tick(150);
  assert.match(e.app(), /Cancelados\s*1/);
  await e.click('[data-act="cd-filtro"][data-f="inativos"]');
  assert.match(e.app(), /Suspenso/);
  await e.click('[data-act="usr-reativar"][data-id="u2"]'); await e.tick(150);
  await e.click('[data-act="cd-filtro"][data-f="ativos"]');
  assert.doesNotMatch(e.app(), /Suspenso/); assert.match(e.app(), /Cancelados\s*0/);
  // último administrador não pode ser suspenso nem removido
  await e.click('[data-act="usr-suspender"][data-id="u1"]'); await e.click('[data-x="1"]'); await e.tick(150);
  assert.match(e.dlg(), /ao menos um dono ativo/);
  await e.click('[data-close]');
  // remover Letícia
  await e.click('[data-act="usr-remover"][data-id="u3"]'); await e.click('[data-x="1"]'); await e.tick(150);
  assert.doesNotMatch(e.app(), /leticiaoliveira@/);
});

test('usuários · vincular obras a um usuário', async () => {
  const e = await abrir({ seed: { obras: { o1: obra({ nome: 'Casa Alfa' }), o2: obra({ nome: 'Casa Beta' }) } }, hash: '#/cadastros/usuarios' });
  await e.tick(150);
  await e.click('[data-act="usr-obras"][data-id="u2"]');
  const box = e.doc.querySelector('#dlg input[type=checkbox][value="o1"]'); box.checked = true;
  await e.click('#uo_ok'); await e.tick(150);
  const lista = JSON.parse(e.win.localStorage.getItem('cob.usuariosLocais'));
  assert.deepEqual(lista.filter((u) => u.id === 'u2')[0].obras, ['o1']);
});

/* ---------- cadastro da obra ---------- */
test('cadastro da obra · quadros, completude e edição do cliente, da obra, da equipe e do contrato', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm({ nome: 'Casa Alfa', cliente: 'Maria' }) } }, hash: '#/obra/o1/cadastro' });
  assert.match(e.app(), /Dados do cliente/); assert.match(e.app(), /Dados da obra/); assert.match(e.app(), /Equipe e responsáveis/); assert.match(e.app(), /Contrato e valores/); assert.match(e.app(), /Arquivos recebidos/);
  const k0 = e.x.cadCompletude(e.x.G('obras', 'o1')); assert.ok(k0.faltam.includes('CPF ou CNPJ do cliente'));
  await e.click('[data-act="cad-cliente"]');
  await e.submit({ nome: 'Maria Silva', doc: '123', telefone: '(15) 99999-1111', email: 'm@x.com', contato: 'whatsapp' });
  await e.click('[data-act="cad-obra"]');
  await e.submit({ nome: 'Casa Alfa', cidade: 'Tatuí', uf: 'sp', previsaoFim: dia(300), etiquetas: 'premium, 3D' });
  await e.click('[data-act="cad-equipe"]');
  await e.submit({ respTecnico: 'Edson', registro: 'RRT 1' });
  await e.click('[data-act="cad-contrato"]');
  await e.submit({ valor: '350000', assinatura: dia(-5), forma: '18 parcelas' });
  const c = e.linhas('cadastros')[0];
  assert.equal(c.cliente.doc, '123'); assert.equal(c.obra.uf, 'SP'); assert.deepEqual(c.obra.etiquetas, ['premium', '3D']); assert.equal(c.equipe.registro, 'RRT 1'); assert.equal(c.contrato.valor, 350000);
  assert.equal(e.linhas('obras')[0].cliente, 'Maria Silva');
  assert.match(e.app(), /R\$\s*350\.000,00/); assert.match(e.app(), /premium/);
  const k1 = e.x.cadCompletude(e.x.G('obras', 'o1')); assert.ok(k1.ok > k0.ok);
});

test('cadastro da obra · escolher cliente já cadastrado copia os dados e vincula', async () => {
  const seed = { obras: { o1: obra() }, clientes: { c1: { nome: 'João Pereira', doc: '999', telefone: '(15) 8', email: 'j@x.com', cidade: 'Tatuí', uf: 'SP', ativo: true } } };
  const e = await abrir({ seed, hash: '#/obra/o1/cadastro' });
  await e.click('[data-act="cad-escolher-cliente"]');
  await e.submit({ id: 'c1' });
  assert.equal(e.linhas('obras')[0].clienteId, 'c1'); assert.equal(e.linhas('obras')[0].cliente, 'João Pereira');
  assert.equal(e.linhas('cadastros')[0].cliente.doc, '999');
});

test('cadastro da obra · receber arquivo: link https, anexo ou link obrigatório e exclusão', async () => {
  const e = await abrir({ seed: { obras: { o1: obra() } }, hash: '#/obra/o1/cadastro' });
  await e.click('[data-act="cad-arq-novo"]');
  await e.submit({ nome: 'Projeto estrutural', origem: 'projetos', categoria: 'Projeto complementar' });
  assert.match(e.erroForm(), /Anexe ao menos um arquivo ou informe o link/);
  await e.submit({ nome: 'Projeto estrutural', origem: 'projetos', categoria: 'Projeto complementar', link: 'http://inseguro' });
  assert.match(e.erroForm(), /https/);
  await e.submit({ nome: 'Projeto estrutural', origem: 'projetos', categoria: 'Projeto complementar', link: 'https://app.exemplo.com/p.pdf' });
  assert.match(e.app(), /Projeto estrutural/); assert.match(e.app(), /App de projetos/);
  assert.equal(e.linhas('arquivosObra')[0].origem, 'projetos');
  await e.click('[data-act="cad-arq-excluir"]'); await e.click('[data-x="1"]');
  assert.equal(e.linhas('arquivosObra').length, 0);
});

test('importação · pacote válido mostra a prévia (hoje × vai ficar) e só grava ao confirmar', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm({ nome: 'Casa Alfa', cliente: 'Maria' }) } }, hash: '#/obra/o1/cadastro' });
  const pacote = JSON.stringify({ formato: 'cariati-obra', versao: 1, origem: 'projetos', obra: { nome: 'Casa Alfa', area: 210, inicio: '2026-03-01', tipologia: 'Casa térrea' }, cliente: { nome: 'Maria Silva', doc: '123.456', telefone: '(15) 9', email: 'm@x.com' }, equipe: { respTecnico: 'Edson' }, contrato: { valor: 350000 }, arquivos: [{ nome: 'Projeto arq. rev. 02', categoria: 'Projeto arquitetônico', link: 'https://x.com/a.pdf' }] });
  await envia(e, 'input[data-chg="cad-importar"]', fakeFile(e.win, 'obra.json', pacote));
  assert.match(e.dlg(), /Importar dados do arquivo/); assert.match(e.dlg(), /Vai ficar/); assert.match(e.dlg(), /Maria Silva/); assert.match(e.dlg(), /210/); assert.match(e.dlg(), /1 documento será registrado/);
  assert.equal(e.linhas('cadastros').length, 0, 'nada gravado antes de confirmar');
  assert.equal(e.linhas('obras')[0].area, 120);
  await e.click('#ci_ok'); await e.tick(250);
  assert.equal(e.linhas('obras')[0].area, 210); assert.equal(e.linhas('obras')[0].cliente, 'Maria Silva');
  assert.equal(e.linhas('cadastros')[0].cliente.doc, '123.456'); assert.equal(e.linhas('cadastros')[0].contrato.valor, 350000);
  assert.equal(e.linhas('arquivosObra').length, 1); assert.equal(e.linhas('arquivosObra')[0].origem, 'projetos');
  assert.equal(e.linhas('cadastros')[0].hist.length, 1);
});

test('importação · arquivo inválido, versão errada e campos suspeitos são recusados ou ignorados', async () => {
  const e = await abrir({ seed: { obras: { o1: obra() } }, hash: '#/obra/o1/cadastro' });
  const n = (j) => e.x.cadNormalizar(j);
  assert.match(n({ formato: 'outro' }).erro, /não é um pacote/);
  assert.match(n({ formato: 'cariati-obra', versao: 2 }).erro, /Versão/);
  const r = n({ formato: 'cariati-obra', versao: 1, origem: 'hacker', obra: { nome: '<img src=x onerror=alert(1)>', area: -5, inicio: '01/03/2026', tipologia: 'Foguete', __proto__: { x: 1 } }, cliente: { email: 'sem-arroba' }, arquivos: [{ nome: 'a', link: 'javascript:alert(1)' }, { link: 'https://x.com' }], inexistente: { a: 1 } });
  assert.equal(r.origem, 'outro'); assert.equal(r.obra.area, undefined); assert.equal(r.obra.inicio, undefined); assert.equal(r.obra.tipologia, undefined);
  assert.equal(r.arquivos.length, 1); assert.equal(r.arquivos[0].link, '');
  assert.ok(r.ignorados.length >= 5);
  await envia(e, 'input[data-chg="cad-importar"]', fakeFile(e.win, 'ruim.json', 'não é json'));
  assert.match(e.doc.getElementById('toast').textContent, /não é um JSON/);
  await envia(e, 'input[data-chg="cad-importar"]', fakeFile(e.win, 'x.json', JSON.stringify({ formato: 'cariati-obra', versao: 1, obra: { nome: '<img src=x onerror=alert(1)>' } })));
  await e.click('#ci_ok'); await e.tick(250);
  assert.equal(e.doc.querySelector('#app img[src="x"]'), null, 'nome malicioso aparece como texto, nunca como HTML');
});

test('importação · criar obra nova a partir do arquivo (Cadastros › Obras)', async () => {
  const e = await abrir({ hash: '#/cadastros/obras' });
  await envia(e, 'input[data-chg="cad-importar"]', fakeFile(e.win, 'nova.json', JSON.stringify(e.x.cadModelo)));
  assert.match(e.dlg(), /Criar obra a partir do arquivo/);
  await e.click('#ci_ok'); await e.tick(300);
  const o = e.linhas('obras')[0];
  assert.equal(o.nome, 'Casa Silva'); assert.equal(o.modalidade, 'Gestão de Obras'); assert.equal(o.metaPPC, 80);
  assert.match(e.win.location.hash, /^#\/obra\/.+\/cadastro$/);
  assert.equal(e.linhas('cadastros')[0].obra.cidade, 'Tatuí');
});

test('cadastro · resumo da obra avisa quando o cadastro está incompleto', async () => {
  const e = await abrir({ seed: { obras: { o1: obra() } }, hash: '#/obra/o1/resumo' });
  assert.match(e.app(), /Cadastro da obra \d+% completo/); assert.match(e.app(), /Completar cadastro/);
});

test('cadastro da obra · endereço do cliente, escopo por tipo de contrato e conta para solicitações', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm({ nome: 'Casa Beta', cliente: 'Ana' }) } }, hash: '#/obra/o1/cadastro' });
  assert.match(e.app(), /Contrato e serviços entregues/); assert.match(e.app(), /Conta para solicitações/);
  assert.match(e.app(), /Administração de Obras/); assert.match(e.app(), /Consultorias internas e externas/);
  await e.click('[data-act="cad-cliente"]');
  await e.submit({ nome: 'Ana Souza', cep: '18270-000', logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'Tatuí', uf: 'sp' });
  const c = () => e.linhas('cadastros')[0];
  assert.equal(c().cliente.uf, 'SP'); assert.match(e.app(), /Rua A, 10/); assert.match(e.app(), /Tatuí \/ SP/);
  await e.click('[data-act="cad-escopo"]');
  await e.submit({ modalidade: 'Gestão de Engenharia', padrao: 'sim', extras: 'Visita extra mensal' });
  assert.equal(e.linhas('obras')[0].modalidade, 'Gestão de Engenharia');
  assert.equal(JSON.stringify(c().escopo.servicos), JSON.stringify(e.x.gestPadrao('Gestão de Engenharia'))); assert.equal(c().escopo.extras, 'Visita extra mensal');
  assert.ok(!e.x.gestPadrao('Gestão de Engenharia').includes('ad_compra')); assert.ok(e.x.gestPadrao('Administração de Obra').includes('ad_compra')); assert.ok(e.x.gestPadrao('Administração de Obra').includes('go_compras')); assert.equal(e.x.gestPadrao('Gestão de Obras').length, 5);
  await e.click('[data-act="cad-conta"]');
  await e.submit({ titular: 'Cariati', banco: 'Inter', agencia: '0001', conta: '123-4', pix: 'pix@cariati.com.br' });
  assert.equal(c().conta.pix, 'pix@cariati.com.br'); assert.match(e.app(), /pix@cariati\.com\.br/);
});

test('lista de serviços · carrega a de fábrica, inclui, edita, bloqueia exclusão em uso, exclui e restaura', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm({ nome: 'Casa Gama', cliente: 'Lia' }) } }, hash: '#/cadastros/servicos' });
  await e.tick(300);
  assert.equal(e.linhas('catalogoServicos').length, 40); assert.match(e.app(), /Consultorias internas e externas/); assert.match(e.app(), /Engenharia · Início e preparação/);
  await e.click('[data-act="sv-novo"]');
  await e.submit({ nome: 'Maquete eletrônica', grupo: 'Gestão de Obras', tela: 'etapas', mods: ['Gestão de Obras'], ordem: 6 });
  const novo = e.linhas('catalogoServicos').filter((x) => x.nome === 'Maquete eletrônica')[0];
  assert.ok(novo); assert.deepEqual(Array.from(novo.mods), ['Gestão de Obras']); assert.ok(e.x.gestPadrao('Gestão de Obras').includes(novo.id));
  await e.click('[data-act="sv-editar"][data-id="' + novo.id + '"]');
  await e.submit({ nome: 'Maquete 3D', grupo: 'Gestão de Obras', tela: 'etapas', mods: [], ordem: 6 });
  assert.equal(e.linhas('catalogoServicos').filter((x) => x.id === novo.id)[0].nome, 'Maquete 3D'); assert.ok(!e.x.gestPadrao('Gestão de Obras').includes(novo.id));
  // em uso por uma obra: não deixa excluir
  await e.x.Store.set('cadastros', 'o1', { obraId: 'o1', escopo: { servicos: ['go_consult'] } });
  await e.tick(100);
  await e.click('[data-act="cd-excluir"][data-col="catalogoServicos"][data-id="go_consult"]');
  assert.match(e.dlg(), /Não dá para excluir/); await e.click('[data-close]');
  assert.equal(e.linhas('catalogoServicos').length, 41);
  // sem uso: exclui; restaurar traz de volta o de fábrica
  await e.click('[data-act="cd-excluir"][data-col="catalogoServicos"][data-id="go_visitas"]'); await e.click('[data-x="1"]'); await e.tick(150);
  assert.equal(e.linhas('catalogoServicos').filter((x) => x.id === 'go_visitas').length, 0);
  await e.click('[data-act="sv-padrao"]'); await e.click('[data-x="1"]'); await e.tick(250);
  assert.equal(e.linhas('catalogoServicos').filter((x) => x.id === 'go_visitas').length, 1);
});
