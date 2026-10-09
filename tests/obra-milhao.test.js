'use strict';
/* Obra fictícia de R$ 1.000.000 (Administração, ~30% de evolução): percorre todas as telas e os fluxos de trabalho
   de ponta a ponta e confere se os números fecham entre os módulos. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { abrir, dia } = require('./helpers');
const { semente } = require('./dados-obra-milhao');

const ABAS = ['painel', 'resumo', 'cadastro', 'etapas', 'cronograma', 'balanco', 'semana', 'diario', 'ocorrencias', 'entrega', 'projeto', 'compras', 'estoque', 'locacoes', 'contratos', 'avaliacoes', 'orcamento', 'medicao', 'pedidos', 'financeiro', 'pagprazos', 'metaevo', 'fisfin', 'dre', 'agenda', 'reunioes', 'documentos', 'quinzenal', 'relatorio', 'encerramento'];
const GLOBAIS = ['#/painel', '#/visao', '#/visao/etapas', '#/visao/compras', '#/visao/financas', '#/visao/prazos', '#/compras', '#/fluxo/o1', '#/dre', '#/cadastros/clientes', '#/cadastros/obras', '#/cadastros/prestadores', '#/cadastros/fornecedores', '#/cadastros/servicos', '#/agenda', '#/prestadores', '#/fornecedores'];

test('obra de R$ 1 milhão · todas as telas abrem sem erro, NaN ou undefined', async () => {
  const e = await abrir({ seed: semente(), hash: '#/painel' });
  const rotas = GLOBAIS.concat(ABAS.map((a) => '#/obra/o1/' + a), ['#/obra/o1/etapa/5', '#/obra/o1/etapa/6']);
  const ruins = [];
  for (const r of rotas) { const n0 = e.erros.length; await e.go(r); await e.tick(50); const t = e.app(); if (e.erros.length > n0 || /NaN|undefined|\[object|Infinity/.test(t)) ruins.push(r); }
  assert.deepEqual(ruins, []); assert.equal(e.erros.length, 0);
});

test('obra de R$ 1 milhão · os números fecham entre painel, físico-financeiro e Visão geral', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/painel' });
  const x = e.x, o = x.G('obras', 'o1'), v = x.evm(o);
  assert.equal(v.bac, 1000000); assert.ok(Math.abs(v.fisPct - 0.30) < 0.005, 'avanço físico ~30%: ' + v.fisPct);
  assert.ok(Math.abs(x.pnFisico('o1') - v.fisPct * 100) < 0.01);
  assert.ok(Math.abs(x.pnPlanejado('o1') - v.pv / v.bac * 100) < 0.01);
  assert.match(e.app(), /30%/); assert.match(e.app(), /Curva S: pretendido × executado/);
  const d = x.dashDados(); assert.ok(Math.abs(d.fis - 30) < 0.5); assert.equal(Math.round(d.bac), 1000000);
});

test('obra de R$ 1 milhão · compra completa: cotação, justificativa, aprovação, pedido, pagamento, entrega, conferência', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/compras' });
  const L = (c) => e.linhas(c), x = e.x, C = (id) => L('compras').find((c) => c.id === id), et = (id) => x.compraEtapaFluxo(x.G('obras', 'o1'), x.G('compras', id));
  const fecha = async () => { for (let i = 0; i < 6 && e.dlgAberto(); i++) { const b = e.doc.querySelector('#dlg [data-close], #dlg [data-x="0"]'); if (!b) break; b.click(); await e.tick(60); } };
  const board = async (id) => { await fecha(); await e.go('#/obra/o1/compras'); await e.click('.board [data-act="compra-avancar"][data-id="' + id + '"]'); };
  assert.equal(et('c6'), 2);
  await board('c6'); assert.equal(C('c6').status, 'cotacao');
  await e.click('.board [data-act="compra-abrir"][data-id="c6"]'); await e.click('#dlg [data-act="cot-nova"]'); await e.submit({ fornecedorId: 'f2', preco: '5200', prazo: '5', cond: '28 dias' });
  await e.click('#dlg [data-act="cot-nova"]'); await e.submit({ fornecedorId: 'f1', preco: '4800', prazo: '9' }); assert.equal(et('c6'), 5);
  const caro = C('c6').cotacoes.find((q) => q.preco === 5200);
  await e.click('#dlg [data-act="cot-escolher"][data-cid="' + caro.id + '"]'); await e.submit({ j: '' }); assert.match(e.erroForm(), /justificativa/i);
  await e.submit({ j: 'Prazo atende a obra' }); assert.equal(C('c6').escolhida, caro.id);
  await board('c6'); assert.equal(C('c6').status, 'aprovacao');
  await board('c6'); await e.click('#dlg [data-x="1"]'); await e.tick(100); assert.ok(C('c6').aprov); assert.equal(et('c6'), 7);
  await board('c6'); await e.submit({ data: dia(0), entregaPrevista: dia(6), total: '5200' }); assert.equal(et('c6'), 8);
  assert.equal(L('contasPagar').filter((c) => c.origemId === 'c6').length, 1);
  await fecha(); await e.click('.board [data-act="compra-abrir"][data-id="c6"]'); await e.click('#dlg [data-act="pg-pedir"]'); await e.submit({ data: dia(0), quem: 'cliente', pdf: 'sim' }); assert.equal(et('c6'), 9);
  await e.click('#dlg [data-act="pg-confirmar"]'); await e.submit({ data: dia(0) }); await e.click('#dlg [data-act="pg-comprovante"]'); assert.equal(et('c6'), 10);
  assert.equal(L('contasPagar').find((c) => c.origemId === 'c6').status, 'paga', 'comprovante enviado baixa a conta a pagar');
  await board('c6'); await e.submit({ data: dia(5), nf: '777', qtd: '75' }); assert.equal(et('c6'), 11);
  await board('c6'); await e.submit({ resultado: 'conferido', criterio: 'ok' });
  assert.equal(C('c6').status, 'pago', 'conferida e já paga: encerra como paga'); assert.equal(et('c6'), 0);
  assert.ok(L('movEstoque').some((m) => m.compraId === 'c6')); assert.equal(e.erros.length, 0);
  assert.ok(x.repasseObra('o1', '0000-01', '9999-12').compras >= 133200);
});

test('obra de R$ 1 milhão · divergência exige aviso ao fornecedor e alerta até concluir; atraso exige aviso', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/compras' });
  const L = (c) => e.linhas(c), x = e.x, C = (id) => L('compras').find((c) => c.id === id);
  const al = () => x.alertasCF(x.G('obras', 'o1')).map((a) => a.t).join(' | ');
  assert.match(al(), /Cobrar o cliente/); assert.match(al(), /divergência de entrega não concluída/);
  assert.doesNotMatch(al(), /sem aviso ao fornecedor/, 'brita atrasada tem divergência avisada: não conta como atraso sem aviso');
  await e.recarrega('compras', 'c4', Object.assign({}, C('c4'), { id: undefined, pedido: Object.assign({}, C('c4').pedido, { entregaPrevista: dia(-3) }) }));
  assert.match(al(), /sem aviso ao fornecedor: Cimento/); await e.click('.board [data-act="compra-abrir"][data-id="c4"]'); await e.click('#dlg [data-act="av-atraso"]'); await e.submit({ data: dia(0), obs: 'Chega amanhã' });
  assert.doesNotMatch(al(), /sem aviso ao fornecedor/); await e.click('#dlg [data-close]');
  await e.click('.board [data-act="compra-avancar"][data-id="c9"]'); await e.submit({ resultado: 'recusado', obs: 'Bitola errada' });
  assert.match(e.erroForm(), /tipo da divergência/); await e.submit({ resultado: 'recusado', obs: 'Bitola errada', divTipo: 'errado', avisoForn: dia(0) });
  assert.ok(C('c9').diverg && !C('c9').diverg.resolvidoEm);
  await e.go('#/obra/o1/compras'); await e.click('.board [data-act="compra-abrir"][data-id="c8"]'); await e.click('#dlg [data-act="dv-resolver"]'); await e.submit({ data: dia(0), solucao: 'Reposição' });
  assert.ok(C('c8').diverg.resolvidoEm); assert.equal(e.erros.length, 0);
});

test('obra de R$ 1 milhão · portas do protocolo: medição sem documentos e etapa sem fichas não passam', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/medicao' });
  await e.click('[data-act="med-abrir"][data-id="m3"]'); await e.click('#dlg [data-act="med-aprovar"]'); assert.match(e.dlg(), /Não é possível aprovar a medição/); assert.match(e.dlg(), /ainda não conferidos/);
  await e.go('#/obra/o1/etapa/6'); const b = e.doc.querySelector('#app [data-act="etapa-mover"][data-to="aguardando_vistoria"]'); b.click(); await e.tick(150);
  e.doc.querySelector('#app [data-act="etapa-mover"][data-to="liberada"]').click(); await e.tick(200); assert.match(e.dlg(), /Não é possível liberar a etapa 6/); assert.match(e.dlg(), /Ficha sem inspeção/);
});

test('obra de R$ 1 milhão · DRE: repasse só do que o cliente pagou, quadro de compras e entregas', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/dre' });
  assert.match(e.app(), /Compras e entregas/); assert.match(e.app(), /Pagas pelo cliente/);
  const r = e.x.repasseObra('o1', '0000-01', '9999-12'); assert.equal(r.compras, 128000); assert.equal(r.medicoes, 76000); assert.equal(r.comprasCariati, 0);
});
