'use strict';
/* Solicitações e mudanças: protocolo de pedido (projeto, obra, aditivo, material, escopo) ligado ao diário, ao aditivo e ao relatório. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { abrir } = require('./helpers');
const { semente } = require('./dados-obra-milhao');

test('solicitações · registrar, analisar, decidir, gerar aditivo e concluir', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/solicitacoes' });
  const x = e.x, L = (c) => e.linhas(c);
  assert.match(e.app(), /Solicitações e mudanças/);
  await e.click('[data-act="sol-nova"]');
  await e.submit({ tipo: 'mudanca_projeto', origem: 'cliente', solicitante: 'Sra. Almeida', data: '2026-10-09', etapa: '6', local: 'Varanda', titulo: 'Ampliar varanda', descricao: 'Ampliar 18 m²', impactoDesc: '', impactoPrazoDias: '12', custo: '35340' });
  assert.equal(L('solicitacoes').length, 1); const s = L('solicitacoes')[0];
  assert.equal(s.numero, 1); assert.equal(s.status, 'registrada'); assert.match(x.solProtocolo(x.G('obras', 'o1'), s), /-SOL001$/);
  assert.equal(L('solicitacoesImpacto').find((i) => i.id === s.id).custo, 35340);
  assert.ok(!JSON.stringify(s).includes('35340'), 'o valor em R$ não fica na solicitação');
  // exige o impacto descrito antes de enviar para decisão
  await e.click('[data-act="sol-mover"][data-to="em_analise"]'); assert.equal(L('solicitacoes')[0].status, 'em_analise');
  await e.click('[data-act="sol-mover"][data-to="aguardando_decisao"]'); assert.match(e.dlg(), /Falta descrever o impacto/);
  await e.click('#dlg [data-close]'); await e.click('[data-act="sol-editar"]'); await e.submit({ impactoDesc: 'Laje nova, +12 dias, projeto estrutural revisado.' });
  await e.click('[data-act="sol-mover"][data-to="aguardando_decisao"]'); assert.equal(L('solicitacoes')[0].status, 'aguardando_decisao');
  await e.click('[data-act="sol-decidir"]'); await e.submit({ resultado: 'aprovada', data: '2026-10-10', quem: 'Sra. Almeida', ref: '' }); assert.match(e.erroForm(), /como foi decidido/i);
  await e.submit({ resultado: 'aprovada', data: '2026-10-10', quem: 'Sra. Almeida', ref: 'WhatsApp, print anexado' });
  assert.equal(L('solicitacoes')[0].status, 'aprovada');
  // concluir exige o aditivo quando há variação de custo
  await e.click('[data-act="sol-mover"][data-to="concluida"]'); assert.equal(L('solicitacoes')[0].status, 'aprovada'); await e.click('#dlg [data-close]');
  await e.click('[data-act="sol-aditivo"]'); await e.submit({ descricao: 'Ampliar varanda', tipo: 'acrescimo', impactoPrazoDias: '12', itens: 'Laje; m²; 18; 1963,33' });
  const ad = L('aditivos')[0]; assert.equal(ad.origem.col, 'solicitacoes'); assert.equal(ad.origem.id, s.id); assert.equal(ad.impactoPrazoDias, 12);
  await e.go('#/obra/o1/solicitacoes'); await e.click('[data-act="sol-mover"][data-to="concluida"]'); assert.equal(L('solicitacoes')[0].status, 'concluida');
  const r = x.solResumo('o1'); assert.equal(r.aprovadas, 1); assert.equal(r.custoAprovado, 35340); assert.equal(r.prazoAprovado, 12);
  assert.equal(e.erros.length, 0);
});

test('solicitações · aparecem no diário do dia, no relatório e no protocolo para imprimir', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/diario' });
  const x = e.x, o = x.G('obras', 'o1'), d = e.linhas('diarios')[0];
  assert.ok(d, 'a obra de teste tem diário');
  await e.click('[data-act="sol-nova"][data-dia="' + d.id + '"]');
  await e.submit({ tipo: 'mudanca_material', origem: 'tecnica', data: d.data, titulo: 'Trocar porcelanato', descricao: 'Lote com variação de tom', impactoDesc: 'Sem custo; 3 dias', impactoPrazoDias: '3' });
  const s = e.linhas('solicitacoes')[0]; assert.equal(s.diarioId, d.id);
  await e.go('#/obra/o1/diario'); assert.match(e.app(), /Solicitações do dia/); assert.match(e.app(), /Trocar porcelanato/);
  const mes = d.data.slice(0, 7), dados = x.relDados(o, mes); assert.equal(dados.solicitacoes.noMes.length, 1); assert.match(dados.solicitacoes.noMes[0].protocolo, /SOL001/);
  assert.match(x.relHtmlDocumento(o, { mes, dados }), /Solicitações e mudanças/);
  assert.match(x.solProtocoloHtml(o, s), /Protocolo de solicitação de mudança/);
  assert.equal(e.erros.length, 0);
});
