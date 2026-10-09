'use strict';
/* Obra fictícia de R$ 1.000.000 (Administração de Obra), ~30% de evolução física, com cliente, prestadores, fornecedores,
   cronograma de 22 etapas, orçamento, compras em todas as etapas do fluxo, medições, contas, aportes e cadastro completo.
   Serve para testar o aplicativo de ponta a ponta e para a prévia. Datas relativas a hoje. */
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const dia = (n) => { const x = new Date(); x.setDate(x.getDate() + (n || 0)); return iso(x); };
const agora = (n) => new Date(Date.now() + (n || 0) * 864e5).toISOString();

const NOMES = { 1: 'Pré-obra', 2: 'Mobilização e canteiro', 3: 'Terraplanagem e locação', 4: 'Contenções e drenagem do terreno', 5: 'Fundação', 6: 'Estrutura', 7: 'Alvenaria e vedações', 8: 'Cobertura', 9: 'Instalações embutidas', 10: 'Reservatórios, fossa e águas pluviais', 11: 'SPDA e aterramento', 12: 'Impermeabilização', 13: 'Isolamento térmico e acústico', 14: 'Revestimentos, contrapisos e forros', 15: 'Fachada e revestimentos externos', 16: 'Esquadrias, marcenaria e serralheria', 17: 'Pintura', 18: 'Energia solar e aquecimento de água', 19: 'Acabamentos finais', 20: 'Áreas externas', 21: 'Limpeza, vistoria e entrega' };
const PESO = { 1: 2, 2: 1, 3: 2, 4: 2, 5: 3, 6: 5, 7: 4, 8: 3, 9: 3, 10: 2, 11: 1, 12: 2, 13: 2, 14: 4, 15: 3, 16: 3, 17: 3, 18: 2, 19: 2, 20: 3, 21: 1 };
const CUSTO = { 1: 15000, 2: 25000, 3: 40000, 4: 30000, 5: 110000, 6: 170000, 7: 90000, 8: 70000, 9: 80000, 10: 30000, 11: 15000, 12: 25000, 13: 20000, 14: 70000, 15: 40000, 16: 55000, 17: 25000, 18: 30000, 19: 25000, 20: 20000, 21: 15000 };

function semente() {
  const obraId = 'o1', ini = dia(-120), TOTAL = 360, pesoTot = Object.values(PESO).reduce((a, b) => a + b, 0);
  const add = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
  /* orçamento de 1.000.000 em 2 itens por etapa */
  const soma = Object.values(CUSTO).reduce((a, b) => a + b, 0); CUSTO[6] += 1000000 - soma;
  const itens = [], porEtapa = {}, porTipo = { material: 0, mao_de_obra: 0 };
  Object.keys(CUSTO).forEach((k) => { const n = Number(k), mat = Math.round(CUSTO[n] * 0.6), mo = CUSTO[n] - mat;
    [['material', mat, '01'], ['mao_de_obra', mo, '02']].forEach(([tp, v, s]) => { itens.push({ codigo: n + '.' + s, etapa: n, descricao: NOMES[n] + (tp === 'material' ? ': materiais' : ': mão de obra'), unidade: 'vb', quantidade: 1, precoUnitario: v, tipo: tp, total: v }); porTipo[tp] += v; });
    porEtapa[n] = CUSTO[n]; });
  /* cronograma: uma atividade por etapa, sequencial; 30% de evolução em valor orçado = etapas 1 a 5 liberadas e a 6 em 47% */
  const atividades = {}, etapas = {}; let cur = ini, ant = '';
  Object.keys(NOMES).forEach((k) => { const n = Number(k), d = Math.max(2, Math.round(TOTAL * PESO[n] / pesoTot)), fim = add(cur, d - 1), id = 'a' + n;
    const av = n <= 5 ? 100 : (n === 6 ? 47 : 0);
    atividades[id] = { obraId, nome: NOMES[n], etapa: n, prestadorId: n === 5 || n === 6 ? 'p2' : (n === 7 ? 'p1' : ''), inicio: cur, fim, pred: ant, avanco: av };
    const st = n <= 5 ? 'liberada' : (n === 6 ? 'em_execucao' : 'nao_iniciada');
    etapas['o1_' + n] = { obraId, n, status: st, hist: [], ...(st === 'liberada' ? { liberadaEm: fim > dia(0) ? dia(-1) : fim } : {}) };
    ant = id; cur = add(fim, 1); });
  const base = { obraId, un: 'un', qtd: 10, cotacoes: [], criadoEm: agora(-30), prioridade: 'media' };
  const ped = (data, total, prev) => ({ data, fornecedorId: 'f2', total, entregaPrevista: prev });
  const compras = {
    c1: { ...base, codigo: 'SC-0001', item: 'Concreto usinado fck 30 (fundação)', etapa: 5, un: 'm³', qtd: 80, status: 'pago', pagoEm: dia(-70), pedido: { ...ped(dia(-85), 46000, dia(-78)), fornecedorId: 'f1' }, pagto: { solicitadoEm: dia(-84), confirmadoEm: dia(-82), comprovanteEm: dia(-82), quem: 'cliente', pdf: true }, entrega: { data: dia(-78), nf: '1201', qtd: 80 }, conf: { data: dia(-78), resultado: 'conferido', por: 'u1' }, aprov: { nivel: 2, por: 'cariati', data: dia(-86) }, escolhida: 'q1', cotacoes: [{ id: 'q1', fornecedorId: 'f1', preco: 46000, prazo: 7, cond: '28 dias' }, { id: 'q2', fornecedorId: 'f2', preco: 49000, prazo: 7 }] },
    c2: { ...base, codigo: 'SC-0002', item: 'Aço CA-50 (armação)', etapa: 6, un: 'kg', qtd: 9000, status: 'pago', pagoEm: dia(-50), pedido: { ...ped(dia(-62), 82000, dia(-55)), fornecedorId: 'f3' }, pagto: { solicitadoEm: dia(-61), confirmadoEm: dia(-58), comprovanteEm: dia(-58), quem: 'cliente', pdf: true }, entrega: { data: dia(-55), nf: '88', qtd: 9000 }, conf: { data: dia(-55), resultado: 'conferido', por: 'u1' }, aprov: { nivel: 3, por: 'cliente', data: dia(-63), ref: 'WhatsApp de 12/ago, print anexado' }, escolhida: 'q1', cotacoes: [{ id: 'q1', fornecedorId: 'f3', preco: 82000, prazo: 7 }] },
    c3: { ...base, codigo: 'SC-0003', item: 'Blocos cerâmicos 14x19x39', etapa: 7, un: 'un', qtd: 12000, status: 'pedido', pedido: { ...ped(dia(-4), 18000, dia(3)), fornecedorId: 'f2' }, pagto: { solicitadoEm: dia(-4), quem: 'cliente', pdf: true }, aprov: { nivel: 2, por: 'cariati', data: dia(-5) }, escolhida: 'q1', cotacoes: [{ id: 'q1', fornecedorId: 'f2', preco: 18000, prazo: 7 }] },
    c4: { ...base, codigo: 'SC-0004', item: 'Cimento CP-II', etapa: 7, un: 'saco', qtd: 400, status: 'pedido', pedido: ped(dia(-2), 14000, dia(5)), aprov: { nivel: 2, por: 'cariati', data: dia(-3) }, escolhida: 'q1', cotacoes: [{ id: 'q1', fornecedorId: 'f2', preco: 14000, prazo: 5 }] },
    c5: { ...base, codigo: 'SC-0005', item: 'Areia média', etapa: 7, un: 'm³', qtd: 30, status: 'cotacao', dataUso: dia(12), prazoEntrega: 4, cotacoes: [{ id: 'q1', fornecedorId: 'f2', preco: 3600, prazo: 3 }, { id: 'q2', fornecedorId: 'f1', preco: 3300, prazo: 6 }] },
    c6: { ...base, codigo: 'SC-0006', item: 'Tubo de drenagem corrugado', etapa: 4, un: 'm', qtd: 75, status: 'necessidade', dataUso: dia(9), prazoEntrega: 12 },
    c7: { ...base, codigo: 'SC-0007', item: 'Manta de impermeabilização (laje)', etapa: 12, un: 'm²', qtd: 220, status: 'aprovacao', dataUso: dia(45), prazoEntrega: 10, escolhida: 'q1', cotacoes: [{ id: 'q1', fornecedorId: 'f2', preco: 28000, prazo: 10 }], orcado: 24000 },
    c8: { ...base, codigo: 'SC-0008', item: 'Brita 1', etapa: 6, un: 'm³', qtd: 40, status: 'pedido', pedido: ped(dia(-12), 6000, dia(-6)), pagto: { solicitadoEm: dia(-12), confirmadoEm: dia(-10), comprovanteEm: dia(-10), quem: 'cliente' }, diverg: { tipo: 'falta', desc: 'Chegaram 32 m³ de 40', avisadoEm: dia(-5), abertaEm: dia(-5) }, aprov: { nivel: 2, por: 'cariati', data: dia(-13) }, escolhida: 'q1', cotacoes: [{ id: 'q1', fornecedorId: 'f2', preco: 6000, prazo: 5 }] },
    c9: { ...base, codigo: 'SC-0009', item: 'Vergalhão CA-60 (lajes)', etapa: 6, un: 'kg', qtd: 1500, status: 'entregue', pedido: { ...ped(dia(-8), 16000, dia(-2)), fornecedorId: 'f3' }, pagto: { solicitadoEm: dia(-8), confirmadoEm: dia(-6), comprovanteEm: dia(-6), quem: 'cliente' }, entrega: { data: dia(-1), nf: '91', qtd: 1500 }, aprov: { nivel: 2, por: 'cariati', data: dia(-9) }, escolhida: 'q1', cotacoes: [{ id: 'q1', fornecedorId: 'f3', preco: 16000, prazo: 5 }] }
  };
  Object.values(compras).forEach((c) => { c.hist = [{ de: 'necessidade', para: c.status, data: agora(-3), nota: 'Registrado na carga de dados de teste' }]; });
  const conta = (id, orig, oid, desc, forn, valor, venc, pago) => ({ obraId, origem: orig, origemId: oid, descricao: desc, credorTipo: 'fornecedor', credorId: forn, valor, retencao: 0, desconto: 0, vencimento: venc, status: pago ? 'paga' : 'aberta', pagoEm: pago || '', forma: pago ? 'Pix' : '', obs: '' });
  const contasPagar = {
    cp_compra_c1: conta('', 'compra', 'c1', 'Compra: Concreto usinado', 'f1', 46000, dia(-60), dia(-70)),
    cp_compra_c2: conta('', 'compra', 'c2', 'Compra: Aço CA-50', 'f3', 82000, dia(-48), dia(-50)),
    cp_compra_c3: conta('', 'compra', 'c3', 'Compra: Blocos cerâmicos', 'f2', 18000, dia(2)),
    cp_compra_c4: conta('', 'compra', 'c4', 'Compra: Cimento CP-II', 'f2', 14000, dia(-1)),
    cp_compra_c8: conta('', 'compra', 'c8', 'Compra: Brita 1', 'f2', 6000, dia(-2)),
    cp_compra_c9: conta('', 'compra', 'c9', 'Compra: Vergalhão CA-60', 'f3', 16000, dia(4))
  };
  Object.values(contasPagar).forEach((c) => { c.empresaId = 'emp_cons'; });
  const med = (n, ct, pr, st, v, extra) => ({ obraId, contratoId: ct, prestadorId: pr, numero: n, periodoIni: dia(-n * 30), periodoFim: dia(-n * 30 + 29), status: st, retencaoPct: 5, descontos: [], justificativas: [], hist: [], analiseDesde: agora(-5), itens: [{ codigo: '5.02', descricao: NOMES[5] + ': mão de obra', unidade: 'vb', precoUnitario: v, qtdOrcada: 1, qtdAnterior: 0, qtdMedida: 1, etapa: 5, valor: v }], ...(extra || {}) });
  const medicoes = {
    m1: med(3, 'ct1', 'p2', 'paga', 40000, { valorBruto: 40000, retencao: 2000, descontosValor: 0, valorRetidoApontamento: 0, valorLiquido: 38000, aprovadaEm: agora(-80), pagaEm: dia(-75) }),
    m2: med(2, 'ct1', 'p2', 'paga', 40000, { valorBruto: 40000, retencao: 2000, descontosValor: 0, valorRetidoApontamento: 0, valorLiquido: 38000, aprovadaEm: agora(-50), pagaEm: dia(-45) }),
    m3: med(1, 'ct2', 'p1', 'em_analise', 12000, { itens: [{ codigo: '7.02', descricao: NOMES[7] + ': mão de obra', unidade: 'vb', precoUnitario: 12000, qtdOrcada: 1, qtdAnterior: 0, qtdMedida: 1, etapa: 7, valor: 12000 }] })
  };
  const doc = (p, dn) => dn;
  return {
    clientes: { cl1: { nome: 'Família Almeida Prado', tipoPessoa: 'pf', doc: '123.456.789-09', telefone: '(15) 99888-1234', email: 'familia.almeidaprado@exemplo.com', cidade: 'Tatuí', uf: 'SP', ativo: true, pagComprasPadrao: 'cliente', criadoEm: agora(-130) } },
    obras: { o1: { nome: 'Residência Almeida Prado', codigo: 'CA260999', cliente: 'Família Almeida Prado', clienteId: 'cl1', endereco: 'Rua das Figueiras, 450', tipologia: 'Casa térrea', tipoObra: 'Obra nova', modalidade: 'Administração de Obra', pagCompras: 'cliente', area: 320, inicio: ini, metaPPC: 80, diasEscalar: 7, margemPreco: 5, alcada: 20000, tolerAvanco: 5, empresaId: 'emp_cons', criadoEm: agora(-125) } },
    empresas: { emp_cons: { nome: 'Cariati Construtora Ltda', cnpj: '', aliquotaImpostos: 6, ativa: true, criterioRateio: 'receita', rateioManual: {} }, emp_arq: { nome: 'Cariati Arquitetura Ltda', cnpj: '', aliquotaImpostos: null, ativa: true, criterioRateio: 'receita', rateioManual: {} } },
    contratosCliente: { cc_o1: { obraId, tipoRemuneracao: 'percentual_custo', percentual: 10, valorMensal: null, parcelas: [], inicio: ini, fim: add(ini, TOTAL), obs: '', anexos: [] } },
    cadastros: { o1: { obraId, cliente: { tipo: 'pf', doc: '123.456.789-09', rg: '12.345.678-9', profissao: 'Médica', telefone: '(15) 99888-1234', email: 'familia.almeidaprado@exemplo.com', contato: 'whatsapp', cep: '18270-000', logradouro: 'Av. Brasil', numero: '1200', bairro: 'Centro', cidade: 'Tatuí', uf: 'SP', endereco: '', obs: 'Prefere contato à tarde.' },
      obra: { fase: 'obra', bairro: 'Jardim das Figueiras', cep: '18275-100', cidade: 'Tatuí', uf: 'SP', previsaoFim: add(ini, TOTAL), origem: 'Indicação', matricula: '45.678', inscricao: '01.02.003.0004', etiquetas: ['teste', 'R$ 1 milhão'] },
      equipe: { respTecnico: 'Edson Cariati', registro: 'RRT 12345678', engenheiro: 'Ruan Oliveira', mestre: 'Seu Joaquim', compras: 'Letícia Oliveira', financeiro: 'Setor financeiro' },
      contrato: { valor: 100000, estimado: 1000000, assinatura: dia(-125), forma: '10% sobre o custo, medido mensalmente' },
      escopo: { servicos: null, extras: 'Acompanhamento de vistoria do condomínio', fora: 'Paisagismo e mobiliário solto' }, conta: { titular: 'Cariati Construtora Ltda', doc: '00.000.000/0001-00', banco: 'Banco Inter', tipo: 'Corrente', agencia: '0001', conta: '123456-7', pix: 'financeiro@cariati.com.br', obs: 'Conta para aportes do cliente' }, hist: [] } },
    prestadores: { p1: { nome: 'Alvenaria e Reboco Souza Ltda', doc: '11.222.333/0001-44', especialidade: 'Alvenaria', seguro: dia(200), treinamento: dia(200), contato: '(15) 99777-0001', ativo: true }, p2: { nome: 'Fundações Terra Firme Ltda', doc: '22.333.444/0001-55', especialidade: 'Fundações e estrutura', seguro: dia(150), treinamento: dia(150), contato: '(15) 99777-0002', ativo: true } },
    fornecedores: { f1: { nome: 'Concreteira Boa Massa', doc: '33.444.555/0001-66', categoria: 'Concreto', ativo: true }, f2: { nome: 'Casa de Material Central', doc: '44.555.666/0001-77', categoria: 'Materiais básicos', ativo: true }, f3: { nome: 'Aço Forte Distribuidora', doc: '55.666.777/0001-88', categoria: 'Aço', ativo: true } },
    orcamentos: { b1: { obraId, versao: 1, data: dia(-125), motivo: 'Orçamento base aprovado', origem: 'Planilha própria', total: 1000000, nItens: itens.length, lotes: 1, porEtapa, porTipo } },
    orcItens: { b1_0: { obraId, orcId: 'b1', lote: 0, itens } },
    atividades, etapas, compras, contasPagar, medicoes,
    contratosPrest: { ct1: { obraId, prestadorId: 'p2', escopo: 'Fundação e estrutura (mão de obra)', valor: 160000, retencao: 5, inicio: dia(-100), fim: dia(10), status: 'ativo' }, ct2: { obraId, prestadorId: 'p1', escopo: 'Alvenaria e reboco', valor: 120000, retencao: 5, inicio: dia(-15), fim: dia(120), status: 'ativo' } },
    aportes: { a1: { obraId, descricao: '1º aporte: mobilização e fundação', valorPrevisto: 250000, dataPrevista: dia(-115), valorRecebido: 250000, dataRecebida: dia(-115) }, a2: { obraId, descricao: '2º aporte: estrutura', valorPrevisto: 200000, dataPrevista: dia(-60), valorRecebido: 200000, dataRecebida: dia(-58) }, a3: { obraId, descricao: '3º aporte: alvenaria', valorPrevisto: 150000, dataPrevista: dia(-3), valorRecebido: null, dataRecebida: '' }, a4: { obraId, descricao: '4º aporte: instalações', valorPrevisto: 200000, dataPrevista: dia(40), valorRecebido: null, dataRecebida: '' } },
    ocorrencias: { oc1: { obraId, etapa: 6, tipo: 'apontamento', gravidade: 'importante', descricao: 'Cobrimento da armadura abaixo do projeto na viga V7', status: 'aberta', prazo: dia(-2), interacoes: [], criadoEm: agora(-9) }, oc2: { obraId, etapa: 7, tipo: 'apontamento', gravidade: 'simples', descricao: 'Prumo da alvenaria do eixo B', status: 'aberta', prazo: dia(4), interacoes: [], criadoEm: agora(-2) } },
    diarios: { d1: { obraId, data: dia(-1), atividades: 'Elevação de alvenaria do térreo, eixos A e B.', fotos: [], efetivo: [{ p: 'p1', q: 6 }], clima: 'sol' }, d2: { obraId, data: dia(-2), atividades: 'Chegada de blocos; conferência.', fotos: [], efetivo: [{ p: 'p1', q: 5 }] } }
  };
}
module.exports = { semente, dia };
