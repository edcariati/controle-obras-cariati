'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { abrir, obra, obraAdm, dia } = require('./helpers');

const seed = (extra) => Object.assign({ obras: { o1: obra({ nome: 'Casa Alfa', inicio: dia(-60) }) },
  etapas: { o1_1: { obraId: 'o1', n: 1, status: 'liberada', hist: [], condicoesOk: true, liberadaEm: dia(-40) }, o1_2: { obraId: 'o1', n: 2, status: 'em_execucao', hist: [], condicoesOk: false } },
  atividades: { a1: { obraId: 'o1', nome: 'Limpeza do terreno', etapa: 2, prestadorId: 'p1', inicio: dia(-10), fim: dia(5), avanco: 40 }, a2: { obraId: 'o1', nome: 'Tapume', etapa: 2, inicio: dia(-20), fim: dia(-3), avanco: 60 }, a3: { obraId: 'o1', nome: 'Placa', etapa: 1, inicio: dia(-50), fim: dia(-45), avanco: 100 }, a4: { obraId: 'o1', nome: 'Ligação de água', etapa: 2, inicio: dia(8), fim: dia(12), avanco: 0 } },
  prestadores: { p1: { nome: 'Fulano' } } }, extra || {});

test('apontamentos · registrar, editar, resolver pendência e excluir na página da etapa', async () => {
  const e = await abrir({ seed: seed(), hash: '#/obra/o1/etapa/2' });
  assert.match(e.app(), /Apontamentos da etapa/); assert.match(e.app(), /Conclusão da etapa/);
  await e.click('[data-act="apont-novo"]');
  await e.submit({ tipo: 'pendencia', texto: 'Falta liberar o ponto de água com a concessionária.', atividadeId: 'a1' });
  const l = () => e.linhas('etapas').filter((x) => x.id === 'o1_2')[0].apontamentos;
  assert.equal(l().length, 1); assert.equal(l()[0].tipo, 'pendencia'); assert.equal(l()[0].atividadeId, 'a1');
  assert.match(e.app(), /Falta liberar o ponto de água/); assert.match(e.app(), /Aberta/); assert.match(e.app(), /1 pendência aberta/);
  await e.click('[data-act="apont-novo"]');
  await e.submit({ tipo: 'decisao', texto: 'Cliente aprovou o muro de arrimo em bloco.' });
  assert.equal(l().length, 2);
  await e.click('[data-act="apont-resolver"]');
  assert.ok(l().filter((a) => a.tipo === 'pendencia')[0].resolvidoEm); assert.match(e.app(), /Resolvida em/);
  await e.click('[data-act="apont-editar"]');
  await e.submit({ texto: 'Texto corrigido do apontamento.' });
  assert.ok(l().some((a) => /Texto corrigido/.test(a.texto)));
  await e.click('[data-act="apont-excluir"]'); await e.click('[data-x="1"]');
  assert.equal(l().length, 1);
});

test('apontamentos · texto obrigatório e escape de HTML', async () => {
  const e = await abrir({ seed: seed(), hash: '#/obra/o1/etapa/2' });
  await e.click('[data-act="apont-novo"]'); await e.submit({ tipo: 'observacao', texto: '   ' });
  assert.match(e.erroForm(), /Escreva o apontamento/);
  await e.submit({ tipo: 'risco', texto: '<img src=x onerror=alert(1)>' });
  assert.equal(e.doc.querySelector('#app img[src="x"]'), null);
  assert.match(e.app(), /<img src=x/);
});

test('conclusão · resultado e resumo obrigatórios; pendências obrigatórias quando concluída com pendências', async () => {
  const e = await abrir({ seed: seed(), hash: '#/obra/o1/etapa/1' });
  assert.match(e.app(), /liberada e ainda não tem conclusão/);
  await e.click('[data-act="concl-editar"]');
  await e.submit({ resumo: 'Limpeza concluída' });
  assert.match(e.erroForm(), /resultado/i);
  await e.submit({ resultado: 'pendente', resumo: 'Limpeza concluída' });
  assert.match(e.erroForm(), /pendências/i);
  await e.submit({ resultado: 'ressalvas', resumo: 'Limpeza e locação concluídas', aprendizados: 'Pedir sondagem antes', pendencias: '' });
  const c = e.linhas('etapas').filter((x) => x.id === 'o1_1')[0].conclusao;
  assert.equal(c.resultado, 'ressalvas'); assert.match(c.resumo, /Limpeza e locação/); assert.ok(c.data);
  assert.match(e.app(), /Concluída com ressalvas/); assert.match(e.app(), /Pedir sondagem antes/);
});

test('conclusão · liberar a etapa pede a conclusão logo em seguida', async () => {
  const fichas = {}; [0, 1, 2, 3, 4].forEach((i) => { fichas['o1_1_' + i] = { obraId: 'o1', n: 1, i, resultado: 'aprovado' }; });
  const sd = seed({ fichas, etapas: { o1_1: { obraId: 'o1', n: 1, status: 'aguardando_vistoria', hist: [], condicoesOk: true } }, atividades: {} });
  const e = await abrir({ seed: sd, hash: '#/obra/o1/etapa/1' });
  await e.click('[data-act="etapa-mover"][data-to="liberada"]');
  await e.tick(400);
  assert.equal(e.linhas('etapas').filter((x) => x.id === 'o1_1')[0].status, 'liberada');
  assert.match(e.dlg(), /A etapa foi liberada/); assert.match(e.dlg(), /Conclusão da etapa 1/);
});

test('quadro de evolução · KPIs, gráfico por fase, cartões com avanço e conclusão', async () => {
  const e = await abrir({ seed: seed({ etapas: { o1_1: { obraId: 'o1', n: 1, status: 'liberada', hist: [], condicoesOk: true, liberadaEm: dia(-40), apontamentos: [{ id: 'x', tipo: 'pendencia', texto: 'p', data: new Date().toISOString() }], conclusao: { resultado: 'conforme', resumo: 'ok', data: dia(-39) } }, o1_2: { obraId: 'o1', n: 2, status: 'em_execucao', hist: [], condicoesOk: false }, o1_3: { obraId: 'o1', n: 3, status: 'liberada', hist: [], condicoesOk: true, liberadaEm: dia(-5) } }, atividades: {} }), hash: '#/obra/o1/etapas' });
  const t = e.app();
  assert.match(t, /Evolução da obra/); assert.match(t, /Etapas liberadas\s*2\/22/); assert.match(t, /Conclusões registradas\s*1\/2/); assert.match(t, /1 etapa liberada sem conclusão/);
  assert.match(t, /Meta do cronograma/); assert.match(t, /F1 Planejamento e legalização/); assert.match(t, /1 pendência/);
  assert.match(t, /Sem conclusão/); assert.ok(e.doc.querySelector('.evo-seg'));
});

test('quadro de evolução · visão por atividades (serviços) em colunas por situação', async () => {
  const e = await abrir({ seed: seed(), hash: '#/obra/o1/etapas' });
  await e.click('[data-act="qv-vista"][data-v="atividades"]');
  const cols = Array.from(e.doc.querySelectorAll('#app .board .col')).map((c) => c.querySelector('header').textContent.replace(/\s+/g, ' ').trim());
  assert.deepEqual(cols, ['A iniciar 1', 'Em execução 1', 'Atrasadas 1', 'Concluídas 1']);
  assert.match(e.app(), /Limpeza do terreno/); assert.match(e.app(), /dias de atraso/);
  await e.click('[data-act="qv-vista"][data-v="etapas"]');
  assert.ok(e.doc.querySelector('#app .kcard a.t[href*="/etapa/"]'));
});

test('fluxo geral · mostra apontamentos e conclusão da etapa da obra escolhida', async () => {
  const sd = seed({ etapas: { o1_1: { obraId: 'o1', n: 1, status: 'liberada', hist: [], condicoesOk: true, liberadaEm: dia(-40), apontamentos: [{ id: 'x', tipo: 'decisao', texto: 'Cliente aprovou o projeto', data: new Date().toISOString() }], conclusao: { resultado: 'conforme', resumo: 'Pré-obra fechada com alvará emitido', data: dia(-39) } } } });
  const e = await abrir({ seed: sd, hash: '#/fluxo/o1/1' });
  assert.match(e.app(), /1 registro/); assert.match(e.app(), /Cliente aprovou o projeto/); assert.match(e.app(), /Concluída conforme/); assert.match(e.app(), /Pré-obra fechada com alvará emitido/);
});

test('relatório quinzenal · etapa liberada no período leva a conclusão', async () => {
  const sd = seed({ etapas: { o1_2: { obraId: 'o1', n: 2, status: 'liberada', hist: [], condicoesOk: true, liberadaEm: dia(0), conclusao: { resultado: 'conforme', resumo: 'Canteiro montado e vistoriado', pendencias: 'Placa da obra', data: dia(0) } } } });
  const e = await abrir({ seed: sd, hash: '#/painel' });
  const o = e.x.G('obras', 'o1'), d = e.x.quinzDados(o, { k: 'x', ini: dia(-3), fim: dia(3) });
  assert.equal(d.avanco.liberadas.filter((x) => x.n === 2)[0].concl.resumo, 'Canteiro montado e vistoriado');
});
