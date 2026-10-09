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
  await e.click('[data-act="sol-mover"][data-to="concluida"]'); await e.click('#dlg [data-close]'); assert.equal(L('solicitacoes')[0].status, 'aprovada');
  await e.go('#/obra/o1/orcamento'); await e.click('[data-act="adt-enviar"]'); await e.click('[data-x="1"]'); await e.click('[data-act="adt-assinar"]'); await e.submit({ data: '2026-10-10', ref: 'Assinado' });
  await e.tick(100);
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

const { dia } = require('./helpers');
async function aprovada(e, extra) {
  await e.click('[data-act="sol-nova"]');
  await e.submit(Object.assign({ tipo: 'mudanca_projeto', origem: 'cliente', data: dia(0), etapa: '6', titulo: 'Ampliar varanda', descricao: 'Ampliar 18 m²', impactoDesc: 'Laje nova', impactoPrazoDias: '12', custo: '35340' }, extra));
  await e.click('[data-act="sol-mover"][data-to="em_analise"]'); await e.click('[data-act="sol-mover"][data-to="aguardando_decisao"]');
  await e.click('[data-act="sol-decidir"]'); await e.submit({ resultado: 'aprovada', data: dia(0), quem: 'Cliente', ref: 'WhatsApp' });
}

test('solicitações · integrada ao aditivo, ao cronograma e às compras: nada diverge', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/solicitacoes' });
  const x = e.x, L = (c) => e.linhas(c), ativ = () => Object.fromEntries(L('atividades').map((a) => [a.etapa, a]));
  await aprovada(e);
  const s = L('solicitacoes')[0], antes = ativ(), fimAntes = L('atividades').reduce((m, a) => (a.fim > m ? a.fim : m), '');
  // aditivo com valor diferente da solicitação: aparece a divergência
  await e.click('[data-act="sol-aditivo"]'); await e.submit({ descricao: 'Varanda', tipo: 'acrescimo', impactoPrazoDias: '10', itens: 'Laje; m²; 1; 30000' });
  assert.equal(L('aditivos')[0].impactoPrazoDias, 10); assert.equal(x.solDivergencias(s).length, 2);
  assert.ok(x.alertasSol(x.G('obras', 'o1')).some((a) => /diferente/.test(a.t)));
  await e.go('#/obra/o1/orcamento'); await e.click('[data-act="adt-editar"]'); await e.submit({ impactoPrazoDias: '12', itens: 'Laje; m²; 1; 35340' });
  assert.equal(x.solDivergencias(s).length, 0);
  // concluir bloqueado até o aditivo ser assinado
  await e.go('#/obra/o1/solicitacoes'); await e.click('[data-act="sol-mover"][data-to="concluida"]'); assert.match(e.dlg(), /Só conclui depois de assinado/); assert.equal(L('solicitacoes')[0].status, 'aprovada'); await e.click('#dlg [data-close]');
  // compra fora do escopo mostra o protocolo e segue travada até a assinatura
  const ad = L('aditivos')[0]; assert.match(x.origemAdt(ad), /SOL001/);
  await e.go('#/obra/o1/orcamento'); await e.click('[data-act="adt-enviar"]'); await e.click('[data-x="1"]');
  await e.click('[data-act="adt-assinar"]'); await e.submit({ data: dia(0), ref: 'Assinado' });
  assert.equal(L('solicitacoes')[0].hist.slice(-1)[0].acao, 'aditivo_assinado');
  // ao assinar, o prazo entra sozinho no cronograma e no término previsto, sem contar duas vezes
  await e.tick(100);
  const dep = ativ(), fimDepois = L('atividades').reduce((m, a) => (a.fim > m ? a.fim : m), '');
  assert.equal(x.prazoPendenteObra('o1'), 0);
  assert.equal(x.diffDays(antes[6].fim, dep[6].fim), 12); assert.equal(x.diffDays(antes[7].inicio, dep[7].inicio), 12); assert.equal(x.diffDays(antes[5].fim, dep[5].fim), 0);
  assert.ok(L('aditivos')[0].prazoAplicadoEm);
  assert.equal(x.pnProjecao('o1', 30, 45).fim, fimDepois); assert.equal(x.diffDays(fimAntes, fimDepois), 12);
  await e.go('#/obra/o1/solicitacoes'); await e.click('[data-act="sol-mover"][data-to="concluida"]'); assert.equal(L('solicitacoes')[0].status, 'concluida');
  assert.equal(e.erros.length, 0);
});

test('solicitações · aditivo recusado pelo cliente recusa a solicitação', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/solicitacoes' });
  await aprovada(e, { impactoPrazoDias: '0' });
  await e.click('[data-act="sol-aditivo"]'); await e.submit({ descricao: 'Varanda', tipo: 'acrescimo', impactoPrazoDias: '0', itens: 'Laje; m²; 1; 35340' });
  await e.go('#/obra/o1/orcamento'); await e.click('[data-act="adt-enviar"]'); await e.click('[data-x="1"]');
  await e.click('[data-act="adt-recusar"]'); await e.submit({ motivo: 'Achou caro' });
  const s = e.linhas('solicitacoes')[0]; assert.equal(s.status, 'recusada'); assert.match(s.decisao.ref, /Achou caro/);
  assert.equal(e.erros.length, 0);
});

test('diário · dia de chuva e equipe faltante atualizam o prazo sozinhos (e desfazem ao corrigir)', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/diario' });
  const x = e.x, L = (c) => e.linhas(c), ativ = () => Object.fromEntries(L('atividades').map((a) => [a.etapa, a]));
  const antes = ativ(), o = x.G('obras', 'o1');
  const ult = (m) => L('atividades').reduce((r, a) => (a.fim > r ? a.fim : r), ''), fim0 = ult();
  // chuva forte: dia perdido automático
  await e.click('[data-act="dia-novo"]'); await e.submit({ data: dia(0), clima: 'Chuva forte', atividades: 'Parado pela chuva' });
  let d = L('diarios').find((r) => r.atividades === 'Parado pela chuva'); assert.equal(d.prazoAplicado, 1);
  let dep = ativ(); assert.equal(x.diffDays(antes[7].inicio, dep[7].inicio), 1); assert.equal(x.diffDays(antes[5].fim, dep[5].fim), 0); assert.equal(x.diffDays(fim0, ult()), 1);
  assert.equal(x.diarioPrazo('o1').chuvaDias, 1); assert.match(e.app(), /Chuva impediu: dia perdido/); assert.match(e.app(), /Dias de chuva/);
  // chuva fraca que não impediu: não mexe no prazo
  await e.click('[data-act="dia-novo"]'); await e.submit({ data: dia(-1), clima: 'Chuva fraca', atividades: 'Garoa, seguiu normal' });
  assert.equal(x.diffDays(fim0, ult()), 1); assert.equal(x.diarioPrazo('o1').chuvaDias, 2);
  // equipe faltante: conta como atraso e alerta, sem estender o prazo
  await e.click('[data-act="dia-novo"]'); await e.submit({ data: dia(-2), clima: 'Sol', equipe: 'faltou', atividades: 'Equipe não veio' });
  await e.click('[data-act="dia-novo"]'); await e.submit({ data: dia(-3), clima: 'Sol', equipe: 'faltou', atividades: 'Equipe reduzida' });
  assert.equal(x.diffDays(fim0, ult()), 1); assert.equal(x.diarioPrazo('o1').equipeDias, 2);
  assert.ok(x.alertasSol(o).some((a) => /equipe faltante/.test(a.t)));
  const mes = dia(0).slice(0, 7); assert.ok(x.relDados(o, mes).diarioPrazo.chuvaDias >= 1);
  // corrigir o registro desfaz o ajuste
  await e.click('[data-act="dia-editar"][data-id="' + d.id + '"]'); await e.submit({ chuvaImpediu: 'nao' });
  assert.equal(L('diarios').find((r) => r.id === d.id).prazoAplicado, 0); assert.equal(x.diffDays(fim0, ult()), 0); assert.equal(x.prazoPendenteObra('o1'), 0);
  // marcar de novo e apagar o registro também desfaz
  await e.click('[data-act="dia-editar"][data-id="' + d.id + '"]'); await e.submit({ chuvaImpediu: 'sim' }); assert.equal(x.diffDays(fim0, ult()), 1);
  await e.click('[data-act="dia-excluir"][data-id="' + d.id + '"]'); await e.click('[data-x="1"]'); await e.tick(100);
  assert.equal(x.diffDays(fim0, ult()), 0); assert.equal(e.erros.length, 0);
});

test('cronograma · empecilho do diário (material, equipe) aparece com o motivo e o setor de obras ajusta', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/diario' });
  const x = e.x, L = (c) => e.linhas(c), ativ = () => Object.fromEntries(L('atividades').map((a) => [a.etapa, a]));
  const antes = ativ();
  await e.click('[data-act="dia-novo"]');
  await e.submit({ data: dia(0), clima: 'Sol', atividades: 'Sem cimento', impedMotivo: 'material', impedEtapa: '', impedDesc: 'Cimento não veio', impedDias: '5' }); assert.match(e.erroForm(), /etapa que o empecilho atrasa/);
  await e.submit({ data: dia(0), clima: 'Sol', atividades: 'Sem cimento', impedMotivo: 'material', impedEtapa: '6', impedDesc: '', impedDias: '5' }); assert.match(e.erroForm(), /Descreva o que aconteceu/);
  await e.submit({ data: dia(0), clima: 'Sol', atividades: 'Sem cimento', impedMotivo: 'material', impedEtapa: '6', impedDesc: 'Cimento do pedido 3 não foi entregue', impedDias: '5' });
  await e.click('[data-act="dia-novo"]'); await e.submit({ data: dia(-1), clima: 'Sol', equipe: 'faltou', atividades: 'Equipe não veio' });
  await e.go('#/obra/o1/cronograma');
  assert.match(e.app(), /Motivos de atraso por etapa/); assert.match(e.app(), /Material não chegou/); assert.match(e.app(), /Cimento do pedido 3 não foi entregue/); assert.match(e.app(), /Equipe faltante/);
  assert.match(e.app(), /Aguardando o setor de obras/); assert.equal(e.doc.querySelectorAll('[data-act="imp-aplicar"]').length, 1);
  assert.equal(x.diffDays(antes[6].fim, ativ()[6].fim), 0, 'nada muda sozinho: o setor de obras decide');
  await e.click('[data-act="imp-aplicar"]'); await e.tick(100);
  const dep = ativ(); assert.equal(x.diffDays(antes[6].fim, dep[6].fim), 5); assert.equal(x.diffDays(antes[7].inicio, dep[7].inicio), 5); assert.equal(x.diffDays(antes[5].fim, dep[5].fim), 0);
  assert.equal(e.doc.querySelectorAll('[data-act="imp-aplicar"]').length, 0); assert.match(e.app(), /Ajustado em/);
  const mes = dia(0).slice(0, 7); assert.ok(x.relDados(x.G('obras', 'o1'), mes).impedimentos.length >= 1);
  assert.equal(e.erros.length, 0);
});

test('acesso do cliente · a equipe libera o que ele vê; ele só visualiza', async () => {
  const e = await abrir({ seed: semente(), hash: '#/obra/o1/cadastro' });
  const x = e.x;
  assert.match(e.app(), /O que o cliente pode ver/); assert.match(e.app(), /não aprova nada/); assert.match(e.app(), /Financeiro/);
  assert.equal(JSON.stringify(x.clienteAbas(x.G('obras', 'o1'))), JSON.stringify(['relatorio', 'quinzenal', 'garantias', 'chamados', 'visitas', 'satisfacao']));
  await e.click('[data-act="cad-acesso"]'); await e.submit({ areas: ['painel', 'cronograma', 'relatorio'] });
  assert.equal(JSON.stringify(e.linhas('obras')[0].clienteVe), JSON.stringify(['painel', 'cronograma', 'relatorio']));
  assert.equal(JSON.stringify(x.clienteAbas(x.G('obras', 'o1'))), JSON.stringify(['painel', 'cronograma', 'relatorio']));
  assert.equal(e.erros.length, 0);
});

test('acesso do cliente · no portal ele vê só as áreas liberadas', async () => {
  const mk = (extra) => abrir({ supa: { perfil: { papel: 'cliente', nome: 'Maria' }, seed: { obras: { o1: { obra_id: 'o1', dados: Object.assign({ nome: 'Casa da Maria', modalidade: 'Administração de Obra' }, extra) } } } }, hash: '#/obra/o1/cronograma' });
  let e = await mk({});
  assert.doesNotMatch(e.app(), /Nenhuma atividade no cronograma/, 'por padrão o cliente não vê o cronograma');
  e = await mk({ clienteVe: ['cronograma'] });
  assert.match(e.app(), /Cronograma/); assert.match(e.app(), /Nenhuma atividade no cronograma/); assert.doesNotMatch(e.app(), /Motivos de atraso por etapa/);
  await e.go('#/obra/o1/financeiro'); assert.doesNotMatch(e.app(), /Contas a pagar/);
  e = await mk({ clienteVe: [] }); assert.match(e.app(), /Nada liberado ainda/);
  assert.equal(e.erros.length, 0);
});
