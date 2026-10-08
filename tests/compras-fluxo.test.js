'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { abrir, obraAdm, dia } = require('./helpers');
const forn = { f1: { nome: 'Concreteira Boa Massa', ativo: true } };
const compra = (x) => Object.assign({ obraId: 'o1', item: 'Cimento CP-II', un: 'saco', qtd: 100, status: 'pedido', cotacoes: [], criadoEm: new Date().toISOString(), pedido: { data: dia(-1), fornecedorId: 'f1', total: 3000, entregaPrevista: dia(5) } }, x || {});

test('fluxo de compras · etapa de cada compra nas 11 etapas', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm() }, fornecedores: forn, compras: { c1: compra({ status: 'necessidade' }), c2: compra({ status: 'cotacao', cotacoes: [{ id: 'q1', fornecedorId: 'f1', preco: 10 }] }), c3: compra({}), c4: compra({ pagto: { solicitadoEm: dia(0) } }), c5: compra({ pagto: { solicitadoEm: dia(0), confirmadoEm: dia(0), comprovanteEm: dia(0) } }), c6: compra({ status: 'entregue' }), c7: compra({ status: 'aprovacao', aprov: { nivel: 2 } }) } }, hash: '#/obra/o1/compras' });
  const o = e.x.G('obras', 'o1'), et = (id) => e.x.compraEtapaFluxo(o, e.x.G('compras', id));
  assert.deepEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].map(et), [2, 5, 8, 9, 10, 11, 7]);
  assert.equal(e.x.FLX_COMPRAS.length, 11);
});

test('fluxo de compras · pagamento do cliente: pedir, cobrar depois de 2 dias, confirmar e enviar comprovante', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm({ pagCompras: 'cliente' }) }, fornecedores: forn, compras: { c1: compra({}) } }, hash: '#/obra/o1/compras' });
  await e.click('[data-act="compra-abrir"][data-id="c1"]');
  assert.match(e.dlg(), /Pagamento \(etapas 8 e 9\)/); assert.match(e.dlg(), /Cliente paga/);
  await e.click('[data-act="pg-pedir"]'); await e.submit({ data: dia(-3), quem: 'cliente', pdf: 'sim' });
  assert.equal(e.linhas('compras')[0].pagto.solicitadoEm, dia(-3));
  assert.ok(e.x.cfPagCobrar(e.x.G('compras', 'c1'))); assert.ok(e.x.alertasCF(e.x.G('obras', 'o1')).some((a) => /Cobrar o cliente/.test(a.t)));
  await e.click('[data-act="pg-confirmar"]'); await e.submit({ data: dia(0) });
  assert.ok(!e.x.cfPagCobrar(e.x.G('compras', 'c1')));
  await e.click('[data-act="pg-comprovante"]');
  assert.equal(e.linhas('compras')[0].pagto.comprovanteEm, dia(0));
  assert.equal(e.x.compraEtapaFluxo(e.x.G('obras', 'o1'), e.x.G('compras', 'c1')), 10);
});

test('fluxo de compras · quando a Cariati paga não há cobrança do cliente', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm({ pagCompras: 'cariati' }) }, fornecedores: forn, compras: { c1: compra({ pagto: { solicitadoEm: dia(-9), quem: 'cariati' } }) } }, hash: '#/obra/o1/compras' });
  assert.ok(!e.x.cfPagCobrar(e.x.G('compras', 'c1')));
});

test('fluxo de compras · atraso exige aviso ao fornecedor e divergência fica aberta até concluir', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm() }, fornecedores: forn, compras: { c1: compra({ pedido: { data: dia(-9), fornecedorId: 'f1', total: 3000, entregaPrevista: dia(-2) } }), c2: compra({ item: 'Areia', diverg: { tipo: 'falta', desc: 'Veio 8 de 10', avisadoEm: dia(-3), abertaEm: dia(-3) } }) } }, hash: '#/obra/o1/compras' });
  const al = () => e.x.alertasCF(e.x.G('obras', 'o1')).map((a) => a.t).join(' | ');
  assert.match(al(), /sem aviso ao fornecedor/); assert.match(al(), /divergência de entrega não concluída/);
  await e.click('[data-act="compra-abrir"][data-id="c1"]'); await e.click('[data-act="av-atraso"]'); await e.submit({ data: dia(0), obs: 'Nova data em 3 dias' });
  assert.ok(e.x.G('compras', 'c1').avisoAtraso); assert.doesNotMatch(al(), /sem aviso ao fornecedor/);
  await e.click('[data-close]'); await e.click('[data-act="compra-abrir"][data-id="c2"]'); await e.click('[data-act="dv-resolver"]'); await e.submit({ data: dia(0), solucao: 'Fornecedor repôs o saldo' });
  assert.doesNotMatch(al(), /divergência/); assert.equal(e.x.G('compras', 'c2').diverg.solucao, 'Fornecedor repôs o saldo');
});

test('quantificação · fórmulas dos documentos, margem de 5% e criação das necessidades', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm() } }, hash: '#/obra/o1/compras' });
  const q = (t, c, m) => Object.fromEntries(e.x.quantCalcular(t, c, m).map((r) => [r.item, r.qtd]));
  const c0 = q('cerquite', 30, 0); assert.equal(c0['Caibro 5x5 cm'], 22); assert.equal(c0['Enforca-gato (abraçadeira)'], 22 * 6 + 50); assert.equal(c0['Área de cerquite'], 36);
  const m0 = q('madeirite', 30, 0); assert.equal(m0['Madeirite (placa 1,10 × 2,20 m)'], 27); assert.equal(m0['Caibro de apoio'], 29); assert.equal(m0['Prego 19x21'], 5);
  const d = q('drenagem', 70.43, 5); assert.equal(d['Tubo de drenagem'], 75); assert.equal(d['Manta geotêxtil (Bidim)'], 180); assert.equal(d['Pedra brita'], 27);
  await e.click('[data-act="quant-calc"]');
  await e.submit({ tipo: 'cerquite', total: '30', margem: '5', dataUso: dia(10), criar: 'sim' }); await e.tick(300);
  const cs = e.linhas('compras'); assert.equal(cs.length, 4); assert.ok(cs.every((c) => c.status === 'necessidade'));
});

test('fluxo de compras · página Fluxo mostra as 11 etapas e as regras; obra define quem paga', async () => {
  const e = await abrir({ seed: { obras: { o1: obraAdm({ pagCompras: 'cariati' }) }, fornecedores: forn, compras: { c1: compra({}) } }, hash: '#/fluxo/o1' });
  assert.match(e.app(), /Fluxo de compras/); assert.match(e.app(), /Finalização e pedido de pagamento/); assert.match(e.app(), /cobrar/); assert.match(e.app(), /validar com a engenharia/);
  e.win.location.hash = '#/obra/o1/cadastro'; await e.tick(250); assert.match(e.app(), /Cariati paga/);
});
