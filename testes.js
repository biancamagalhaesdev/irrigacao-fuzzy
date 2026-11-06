/* =====================================================================
 * testes.js — Testes automáticos do motor fuzzy (seção 6 do enunciado)
 * ---------------------------------------------------------------------
 * Cada verificação compara um valor OBTIDO (calculado agora pelo
 * fuzzy.js) com o valor ESPERADO do enunciado, usando as tolerâncias
 * do PDF: 0,000001 para pertinências/ativações e 0,01 min para tempos.
 * Nada aqui é escrito "à mão": todo resultado vem de uma execução real.
 * ===================================================================== */

const TOL_GRAU = 0.000001;   // pertinências e ativações
const TOL_TEMPO = 0.01;      // tempos de referência (minutos)

/* Centroide contínuo do teste 6.3, calculado por integração exata:
 *   numerador   = ∫0^7,5 z·(z/15) dz + ∫7,5^30 z·0,5 dz = 9,375 + 210,9375 = 220,3125
 *   denominador = ∫0^7,5 (z/15) dz   + ∫7,5^30 0,5 dz   = 1,875 + 11,25   = 13,125
 *   z* = 220,3125 / 13,125 = 16,785714...                                   */
const CENTROIDE_CONTINUO = 220.3125 / 13.125;

const Testes = {
  grupos: [],
  atual: null,

  grupo: function (titulo, descricao) {
    Testes.atual = { titulo: titulo, descricao: descricao, casos: [] };
    Testes.grupos.push(Testes.atual);
  },

  /* Compara números com tolerância. */
  numero: function (descricao, obtido, esperado, tolerancia, casas) {
    const diferenca = Math.abs(obtido - esperado);
    const passou = Number.isFinite(obtido) && diferenca <= tolerancia;
    const c = casas === undefined ? 6 : casas;
    Testes.atual.casos.push({
      descricao: descricao,
      esperado: Fuzzy.formatar(esperado, 0, c),
      obtido: Number.isFinite(obtido) ? Fuzzy.formatar(obtido, 0, 9) : String(obtido),
      diferenca: !Number.isFinite(diferenca) ? "—" :
                 (diferenca === 0 ? "0" : diferenca.toExponential(2).replace(".", ",")),
      tolerancia: Fuzzy.formatar(tolerancia, 0, 6),
      passou: passou
    });
  },

  /* Verifica uma condição verdadeira/falsa. */
  condicao: function (descricao, passou, esperado, obtido) {
    Testes.atual.casos.push({
      descricao: descricao, esperado: esperado, obtido: obtido,
      diferenca: "—", tolerancia: "—", passou: Boolean(passou)
    });
  }
};

/* ---------- utilidades ---------- */
function regrasPadrao() { return Fuzzy.copiarRegrasPadrao(); }

function ativacoes(resultado) {
  const mapa = {};
  resultado.avaliacoes.forEach(function (a) { mapa[a.id] = a.h; });
  return mapa;
}

/* Maior diferença entre duas funções em uma grade fina de z. */
function maiorDiferenca(f, g) {
  let maior = 0;
  for (let i = 0; i <= 3000; i++) {
    const z = 30 * i / 3000;
    maior = Math.max(maior, Math.abs(f(z) - g(z)));
  }
  return maior;
}

/* =====================================================================
 * 6.1 Pertinências e extremos
 * ===================================================================== */
Testes.grupo("6.1 Pertinências e extremos", "Graus de pertinência para U = 35 %, T = 30 °C e para os extremos dos domínios.");

(function () {
  const f = Fuzzy.fuzzificar(35, 30);
  Testes.numero("U = 35 %: μseco", f.umidade.seco, 0.5, TOL_GRAU);
  Testes.numero("U = 35 %: μintermediário", f.umidade.intermediario, 0.5, TOL_GRAU);
  Testes.numero("U = 35 %: μúmido", f.umidade.umido, 0, TOL_GRAU);
  Testes.numero("T = 30 °C: μbaixa", f.temperatura.baixa, 0, TOL_GRAU);
  Testes.numero("T = 30 °C: μmédia", f.temperatura.media, 0.5, TOL_GRAU);
  Testes.numero("T = 30 °C: μalta", f.temperatura.alta, 0.5, TOL_GRAU);

  const extremos = [
    { rotulo: "U = 0 %", variavel: "umidade", graus: Fuzzy.fuzzificar(0, 25).umidade, esperado: [1, 0, 0] },
    { rotulo: "U = 100 %", variavel: "umidade", graus: Fuzzy.fuzzificar(100, 25).umidade, esperado: [0, 0, 1] },
    { rotulo: "T = 10 °C", variavel: "temperatura", graus: Fuzzy.fuzzificar(50, 10).temperatura, esperado: [1, 0, 0] },
    { rotulo: "T = 40 °C", variavel: "temperatura", graus: Fuzzy.fuzzificar(50, 40).temperatura, esperado: [0, 0, 1] }
  ];
  extremos.forEach(function (caso) {
    Fuzzy.CONJUNTOS[caso.variavel].forEach(function (conjunto, i) {
      Testes.numero(caso.rotulo + ": μ" + conjunto.nome, caso.graus[conjunto.id], caso.esperado[i], TOL_GRAU);
    });
  });

  Testes.numero("Saída: μcurto(0)", Fuzzy.pertinencia(0, Fuzzy.buscarConjunto("tempo", "curto").params), 1, TOL_GRAU);
  Testes.numero("Saída: μlongo(30)", Fuzzy.pertinencia(30, Fuzzy.buscarConjunto("tempo", "longo").params), 1, TOL_GRAU);

  // Nenhuma divisão por zero: todos os valores finitos e dentro de [0, 1].
  let todosValidos = true;
  ["umidade", "temperatura", "tempo"].forEach(function (variavel) {
    const dominio = Fuzzy.DOMINIOS[variavel];
    Fuzzy.CONJUNTOS[variavel].forEach(function (conjunto) {
      for (let i = 0; i <= 2000; i++) {
        const x = dominio.min + (dominio.max - dominio.min) * i / 2000;
        const mu = Fuzzy.pertinencia(x, conjunto.params);
        if (!Number.isFinite(mu) || mu < 0 || mu > 1) todosValidos = false;
      }
    });
  });
  Testes.condicao("Sem divisão por zero: 18.009 avaliações finitas e entre 0 e 1", todosValidos,
                  "todas válidas", todosValidos ? "todas válidas" : "há valor inválido");
})();

/* =====================================================================
 * 6.2 Ativação de uma única regra
 * ===================================================================== */
Testes.grupo("6.2 Ativação de uma única regra", "Base padrão, Δz = 0,1. A saída agregada deve ser o conjunto consequente completo.");

[
  { U: 20, T: 35, regra: "R3", conjunto: "longo", tempo: 25 },
  { U: 50, T: 25, regra: "R5", conjunto: "medio", tempo: 15 },
  { U: 80, T: 25, regra: "R8", conjunto: "curto", tempo: 5 }
].forEach(function (caso) {
  const r = Fuzzy.inferir(caso.U, caso.T, regrasPadrao(), 0.1);
  const h = ativacoes(r);
  const rotulo = "U = " + caso.U + " %, T = " + caso.T + " °C: ";
  Testes.numero(rotulo + "h(" + caso.regra + ")", h[caso.regra], 1, TOL_GRAU);

  const outras = Object.keys(h).filter(function (id) { return id !== caso.regra; })
    .reduce(function (m, id) { return Math.max(m, h[id]); }, 0);
  Testes.numero(rotulo + "maior ativação entre as outras 8 regras", outras, 0, TOL_GRAU);

  const params = Fuzzy.buscarConjunto("tempo", caso.conjunto).params;
  const dif = maiorDiferenca(
    function (z) { return Fuzzy.muAgregada(r.agregacao, z); },
    function (z) { return Fuzzy.pertinencia(z, params); });
  Testes.numero(rotulo + "diferença máxima entre a agregada e o conjunto " +
                Fuzzy.nomeConjunto("tempo", caso.conjunto) + " completo", dif, 0, TOL_GRAU);

  Testes.numero(rotulo + "tempo z* (min)", r.defuzzificacao.centroide, caso.tempo, TOL_TEMPO, 2);
});

/* =====================================================================
 * 6.3 Inferência completa com sobreposição
 * ===================================================================== */
Testes.grupo("6.3 Inferência com sobreposição", "U = 35 %, T = 30 °C, base padrão, Δz = 0,1.");

(function () {
  const r = Fuzzy.inferir(35, 30, regrasPadrao(), 0.1);
  const h = ativacoes(r);
  const esperadoH = { R1: 0, R2: 0.5, R3: 0.5, R4: 0, R5: 0.5, R6: 0.5, R7: 0, R8: 0, R9: 0 };
  Object.keys(esperadoH).forEach(function (id) {
    Testes.numero("h(" + id + ")", h[id], esperadoH[id], TOL_GRAU);
  });

  [[0, 0], [3, 0.2], [7.5, 0.5], [15, 0.5], [30, 0.5]].forEach(function (par) {
    Testes.numero("μagregada(" + Fuzzy.formatar(par[0], 0, 1) + ")",
                  Fuzzy.muAgregada(r.agregacao, par[0]), par[1], TOL_GRAU);
  });

  const difForma = maiorDiferenca(
    function (z) { return Fuzzy.muAgregada(r.agregacao, z); },
    function (z) { return z <= 7.5 ? z / 15 : 0.5; });
  Testes.numero("Forma: z/15 até 7,5 e 0,5 até 30 (diferença máxima)", difForma, 0, TOL_GRAU);

  let alturaMaxima = 0;
  for (let i = 0; i <= 3000; i++) alturaMaxima = Math.max(alturaMaxima, Fuzzy.muAgregada(r.agregacao, i / 100));
  Testes.numero("Altura máxima da agregada (R2, R3 e R6 não se somam)", alturaMaxima, 0.5, TOL_GRAU);

  Testes.numero("Centroide numérico z* (tolerância do PDF)", r.defuzzificacao.centroide, 16.785683, TOL_TEMPO);
  Testes.numero("Centroide numérico z* (conferência com 6 casas)", r.defuzzificacao.centroide, 16.785683, 0.000001);
  const exibido = Fuzzy.formatar(r.defuzzificacao.centroide, 2);
  Testes.condicao("Valor exibido na tela", exibido === "16,79", "16,79", exibido);
})();

/* =====================================================================
 * 6.4 Simetria, alteração de regras e precisão
 * ===================================================================== */
Testes.grupo("6.4 Simetria, alteração de regras e precisão", "Inclui a troca de todos os consequentes para curto e a variação de Δz.");

(function () {
  // Simetria
  const r = Fuzzy.inferir(35, 20, regrasPadrao(), 0.1);
  const h = ativacoes(r);
  ["R1", "R2", "R4", "R5"].forEach(function (id) {
    Testes.numero("U = 35 %, T = 20 °C: h(" + id + ")", h[id], 0.5, TOL_GRAU);
  });
  const outras = ["R3", "R6", "R7", "R8", "R9"].reduce(function (m, id) { return Math.max(m, h[id]); }, 0);
  Testes.numero("U = 35 %, T = 20 °C: maior ativação entre R3, R6, R7, R8 e R9", outras, 0, TOL_GRAU);
  const difConstante = maiorDiferenca(
    function (z) { return Fuzzy.muAgregada(r.agregacao, z); },
    function () { return 0.5; });
  Testes.numero("Agregada constante em 0,5 de 0 a 30 (diferença máxima)", difConstante, 0, TOL_GRAU);
  Testes.numero("U = 35 %, T = 20 °C: tempo z* (min)", r.defuzzificacao.centroide, 15, TOL_TEMPO, 2);

  // Todas as regras com consequente curto
  const todasCurto = regrasPadrao().map(function (regra) {
    regra.consequente = "curto";
    return regra;
  });
  const rCurto = Fuzzy.inferir(50, 25, todasCurto, 0.1);
  Testes.numero("Todas as regras = curto, U = 50 %, T = 25 °C: tempo z* (min)",
                rCurto.defuzzificacao.centroide, 5, TOL_TEMPO, 2);

  // Restaurar padrão: a cópia alterada não muda a base original
  const intacta = Fuzzy.REGRAS_PADRAO.every(function (regra, i) {
    return regra.consequente === ["medio", "longo", "longo", "curto", "medio", "longo", "curto", "curto", "curto"][i];
  });
  Testes.condicao("Base padrão intacta depois de alterar uma cópia", intacta, "R1 a R9 originais",
                  intacta ? "R1 a R9 originais" : "base modificada");
  const rRestaurado = Fuzzy.inferir(35, 30, Fuzzy.copiarRegrasPadrao(), 0.1);
  const exibido = Fuzzy.formatar(rRestaurado.defuzzificacao.centroide, 2);
  Testes.condicao("Depois de restaurar: U = 35 %, T = 30 °C", exibido === "16,79", "16,79 min", exibido + " min");

  // Precisão em função de Δz
  const referencias = [[0.1, 16.785683], [0.05, 16.785706], [0.01, 16.785714]];
  const erros = [];
  referencias.forEach(function (par) {
    const z = Fuzzy.inferir(35, 30, regrasPadrao(), par[0]).defuzzificacao.centroide;
    erros.push(Math.abs(z - CENTROIDE_CONTINUO));
    Testes.numero("Δz = " + Fuzzy.formatar(par[0], 0, 2) + ": z*", z, par[1], 0.000001);
    Testes.numero("Δz = " + Fuzzy.formatar(par[0], 0, 2) + ": erro em relação ao contínuo (16,785714)",
                  Math.abs(z - CENTROIDE_CONTINUO), 0, TOL_TEMPO, 9);
  });
  Testes.condicao("O erro diminui quando Δz diminui", erros[0] > erros[1] && erros[1] > erros[2],
                  "erro(0,1) > erro(0,05) > erro(0,01)",
                  erros.map(function (e) { return e.toExponential(2).replace(".", ","); }).join(" > "));
})();

/* =====================================================================
 * 6.5 Validação e determinismo
 * ===================================================================== */
Testes.grupo("6.5 Validação e determinismo", "Entradas inválidas são recusadas sem ajuste; a mesma configuração gera os mesmos números.");

(function () {
  const invalidos = [
    ["-1", "umidade", "fora_do_intervalo"], ["101", "umidade", "fora_do_intervalo"],
    ["9", "temperatura", "fora_do_intervalo"], ["41", "temperatura", "fora_do_intervalo"],
    ["", "umidade", "vazio"], ["   ", "temperatura", "vazio"],
    ["abc", "umidade", "nao_numerico"], ["35a", "temperatura", "nao_numerico"],
    ["1.000,5", "umidade", "nao_numerico"], ["NaN", "umidade", "nao_numerico"],
    ["Infinity", "temperatura", "nao_finito"], ["1e999", "umidade", "nao_finito"]
  ];
  invalidos.forEach(function (caso) {
    const v = Fuzzy.validarNumero(caso[0], caso[1]);
    const ok = !v.valido && v.valor === null && v.tipoErro === caso[2];
    Testes.condicao(caso[1] + " = \"" + caso[0] + "\" é recusado (sem ajuste para o limite)", ok,
                    "inválido: " + caso[2], (v.valido ? "aceito: " + v.valor : "inválido: " + v.tipoErro));
  });

  const validos = [["0", "umidade", 0], ["100", "umidade", 100], ["10", "temperatura", 10],
                   ["40", "temperatura", 40], ["35,5", "umidade", 35.5], ["35.5", "umidade", 35.5]];
  validos.forEach(function (caso) {
    const v = Fuzzy.validarNumero(caso[0], caso[1]);
    Testes.condicao(caso[1] + " = \"" + caso[0] + "\" é aceito como " + caso[2],
                    v.valido && v.valor === caso[2], String(caso[2]), v.valido ? String(v.valor) : v.mensagem);
  });

  let lancouErro = false;
  try { Fuzzy.inferir(101, 30, regrasPadrao(), 0.1); } catch (e) { lancouErro = true; }
  Testes.condicao("O motor também recusa U = 101 diretamente", lancouErro, "erro", lancouErro ? "erro" : "calculou");

  // Determinismo
  const a = Fuzzy.inferir(35, 30, regrasPadrao(), 0.1);
  const b = Fuzzy.inferir(35, 30, regrasPadrao(), 0.1);
  Testes.condicao("Duas execuções iguais produzem resultados idênticos",
                  JSON.stringify(a) === JSON.stringify(b), "idênticos",
                  JSON.stringify(a) === JSON.stringify(b) ? "idênticos" : "diferentes");

  // Etapa por etapa (como o botão Avançar etapa) x inferência completa (Calcular)
  const f = Fuzzy.fuzzificar(35, 30);
  const av = Fuzzy.avaliarRegras(f, regrasPadrao());
  const rc = Fuzzy.implicar(av);
  const ag = Fuzzy.agregar(rc);
  const df = Fuzzy.defuzzificar(ag, 0.1);
  Testes.condicao("Etapa por etapa = Calcular (centroide bit a bit)",
                  df.centroide === a.defuzzificacao.centroide, String(a.defuzzificacao.centroide), String(df.centroide));

  // Denominador zero
  const vazio = Fuzzy.defuzzificar({ contribuintes: [] }, 0.1);
  Testes.condicao("Sem regras ativas: mensagem de saída inválida (não retorna 0)",
                  vazio.valido === false && vazio.centroide === null && vazio.mensagem.length > 0,
                  "sem saída válida", vazio.valido ? "retornou " + vazio.centroide : "sem saída válida");

  // Com a base completa e entradas válidas, o denominador nunca é zero
  let sempreValido = true, combinacoes = 0;
  for (let U = 0; U <= 100; U += 5) {
    for (let T = 10; T <= 40; T += 2.5) {
      combinacoes++;
      if (!Fuzzy.inferir(U, T, regrasPadrao(), 0.1).defuzzificacao.valido) sempreValido = false;
    }
  }
  Testes.condicao("Base completa: saída válida em " + combinacoes + " combinações de U e T", sempreValido,
                  "todas válidas", sempreValido ? "todas válidas" : "há denominador zero");
})();

/* =====================================================================
 * Exibição dos resultados na página
 * ===================================================================== */
(function mostrar() {
  let total = 0, aprovados = 0;
  const falhas = [];
  let html = "";

  Testes.grupos.forEach(function (g) {
    html += '<section class="cartao"><h2>' + g.titulo + '</h2><p class="nota">' + g.descricao + "</p>" +
      '<div class="tabela-rolagem"><table class="tabela-testes"><thead><tr>' +
      "<th>Verificação</th><th>Esperado</th><th>Obtido</th><th>|diferença|</th><th>Tolerância</th><th>Resultado</th>" +
      "</tr></thead><tbody>";
    g.casos.forEach(function (c) {
      total++;
      if (c.passou) aprovados++; else falhas.push(g.titulo + " — " + c.descricao);
      html += "<tr><td>" + c.descricao + '</td><td class="num">' + c.esperado + '</td><td class="num">' +
        c.obtido + '</td><td class="num">' + c.diferenca + '</td><td class="num">' + c.tolerancia +
        '</td><td class="' + (c.passou ? "passou" : "falhou") + '">' + (c.passou ? "✔ passou" : "✘ falhou") + "</td></tr>";
    });
    html += "</tbody></table></div></section>";
  });

  document.getElementById("lista-testes").innerHTML = html;
  const resumo = document.getElementById("resumo-testes");
  resumo.className = "resumo-testes " + (aprovados === total ? "ok" : "falha");
  resumo.textContent = aprovados + " de " + total + " verificações aprovadas" +
    (aprovados === total ? "." : ". Veja as linhas marcadas com ✘.");
  document.getElementById("data-testes").textContent =
    "Executado em " + new Date().toLocaleString("pt-BR") + " neste navegador.";

  // Disponível no console do navegador (F12) para conferência.
  window.RESULTADO_TESTES = { total: total, aprovados: aprovados, falhas: falhas };
  console.log("Testes: " + aprovados + "/" + total, falhas);
})();
