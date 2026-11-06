/* =====================================================================
 * fuzzy.js — Motor de inferência fuzzy Mamdani
 * ---------------------------------------------------------------------
 * Este arquivo contém SOMENTE a matemática do sistema. Ele não lê
 * campos da tela e não desenha nada: recebe números e devolve números.
 *
 * Por que separar assim?
 *  - A página principal (interface.js) e a página de testes (testes.js)
 *    usam exatamente as mesmas funções. Se os testes passam, a tela
 *    mostra os mesmos valores.
 *  - Mudar cores, gráficos ou animações nunca altera um cálculo.
 *
 * Tudo fica dentro de um único objeto global chamado "Fuzzy".
 * Nenhuma biblioteca externa é usada aqui.
 * ===================================================================== */

const Fuzzy = {

  /* ------------------------------------------------------------------
   * 1. DOMÍNIOS: limites de cada variável (seção 1 do enunciado)
   * ------------------------------------------------------------------ */
  DOMINIOS: {
    umidade:     { min: 0,  max: 100, unidade: "%",   nome: "umidade do solo" },
    temperatura: { min: 10, max: 40,  unidade: "°C",  nome: "temperatura" },
    tempo:       { min: 0,  max: 30,  unidade: "min", nome: "tempo de irrigação" }
  },

  /* ------------------------------------------------------------------
   * 2. CONJUNTOS FUZZY: parâmetros (a, b, c, d) da seção 2.1.
   *    A ordem de cada lista é a ordem das tuplas do enunciado.
   * ------------------------------------------------------------------ */
  CONJUNTOS: {
    umidade: [
      { id: "seco",          nome: "seco",          params: [0, 0, 20, 50] },
      { id: "intermediario", nome: "intermediário", params: [20, 50, 50, 80] },
      { id: "umido",         nome: "úmido",         params: [50, 80, 100, 100] }
    ],
    temperatura: [
      { id: "baixa", nome: "baixa", params: [10, 10, 15, 25] },
      { id: "media", nome: "média", params: [15, 25, 25, 35] },
      { id: "alta",  nome: "alta",  params: [25, 35, 40, 40] }
    ],
    tempo: [
      { id: "curto", nome: "curto", params: [0, 0, 0, 15] },
      { id: "medio", nome: "médio", params: [0, 15, 15, 30] },
      { id: "longo", nome: "longo", params: [15, 30, 30, 30] }
    ]
  },

  /* ------------------------------------------------------------------
   * 3. BASE DE REGRAS PADRÃO (seção 2.2).
   *    Antecedentes fixos; só o consequente pode ser trocado na tela.
   * ------------------------------------------------------------------ */
  REGRAS_PADRAO: [
    { id: "R1", umidade: "seco",          temperatura: "baixa", consequente: "medio" },
    { id: "R2", umidade: "seco",          temperatura: "media", consequente: "longo" },
    { id: "R3", umidade: "seco",          temperatura: "alta",  consequente: "longo" },
    { id: "R4", umidade: "intermediario", temperatura: "baixa", consequente: "curto" },
    { id: "R5", umidade: "intermediario", temperatura: "media", consequente: "medio" },
    { id: "R6", umidade: "intermediario", temperatura: "alta",  consequente: "longo" },
    { id: "R7", umidade: "umido",         temperatura: "baixa", consequente: "curto" },
    { id: "R8", umidade: "umido",         temperatura: "media", consequente: "curto" },
    { id: "R9", umidade: "umido",         temperatura: "alta",  consequente: "curto" }
  ],

  /* Passos de defuzzificação aceitos (seção 3). */
  PASSOS_PERMITIDOS: [0.1, 0.05, 0.01],

  /* Devolve uma CÓPIA das regras padrão. Quem altera a cópia não
   * altera o original, então "Restaurar padrão" sempre funciona. */
  copiarRegrasPadrao: function () {
    return Fuzzy.REGRAS_PADRAO.map(function (regra) {
      return { id: regra.id, umidade: regra.umidade,
               temperatura: regra.temperatura, consequente: regra.consequente };
    });
  },

  /* Procura um conjunto pelo id. Ex.: buscarConjunto("tempo", "longo"). */
  buscarConjunto: function (variavel, id) {
    const lista = Fuzzy.CONJUNTOS[variavel];
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].id === id) return lista[i];
    }
    throw new Error("Conjunto desconhecido: " + variavel + " / " + id);
  },

  /* Nome legível de um conjunto. Ex.: "intermediario" -> "intermediário". */
  nomeConjunto: function (variavel, id) {
    return Fuzzy.buscarConjunto(variavel, id).nome;
  },

  /* ==================================================================
   * FUNÇÃO DE PERTINÊNCIA LINEAR POR PARTES (seção 2.1)
   * ------------------------------------------------------------------
   *   μ(x) = 1                 se b <= x <= c   (avaliado PRIMEIRO)
   *   μ(x) = 0                 se x < a ou x > d
   *   μ(x) = (x - a)/(b - a)   se a <= x < b   (subida)
   *   μ(x) = (d - x)/(d - c)   se c < x <= d   (descida)
   *
   * Por que o patamar vem primeiro? Veja o conjunto "seco" (0,0,20,50):
   * em x = 0 a resposta tem de ser 1. Como o patamar é testado antes,
   * nunca chegamos à subida com a = b, ou seja, nunca dividimos por zero.
   * O mesmo vale para c = d na descida.
   * ================================================================== */
  pertinencia: function (x, params) {
    const a = params[0], b = params[1], c = params[2], d = params[3];

    // 1) Patamar de pertinência 1
    if (x >= b && x <= c) return 1;

    // 2) Fora do suporte [a, d]
    if (x < a || x > d) return 0;

    // 3) Subida. Só entra aqui se a <= x < b, o que exige a < b.
    //    Logo (b - a) é sempre maior que zero neste ponto.
    if (x >= a && x < b) return (x - a) / (b - a);

    // 4) Descida. Só entra aqui se c < x <= d, o que exige c < d.
    if (x > c && x <= d) return (d - x) / (d - c);

    return 0; // segurança (não deve acontecer com a <= b <= c <= d)
  },

  /* ==================================================================
   * ETAPA 1 — FUZZIFICAÇÃO
   * Calcula os 3 graus da umidade e os 3 graus da temperatura.
   * Exemplo do enunciado: U = 35 -> seco 0,5; intermediário 0,5; úmido 0.
   * ================================================================== */
  fuzzificar: function (U, T) {
    const resultado = { U: U, T: T, umidade: {}, temperatura: {} };

    Fuzzy.CONJUNTOS.umidade.forEach(function (conjunto) {
      resultado.umidade[conjunto.id] = Fuzzy.pertinencia(U, conjunto.params);
    });

    Fuzzy.CONJUNTOS.temperatura.forEach(function (conjunto) {
      resultado.temperatura[conjunto.id] = Fuzzy.pertinencia(T, conjunto.params);
    });

    return resultado;
  },

  /* ==================================================================
   * ETAPA 2 — AVALIAÇÃO DAS REGRAS
   * Operador E = mínimo:  h(r) = min(μumidade(U), μtemperatura(T))
   * ================================================================== */
  avaliarRegras: function (fuzzificacao, regras) {
    return regras.map(function (regra) {
      const muU = fuzzificacao.umidade[regra.umidade];
      const muT = fuzzificacao.temperatura[regra.temperatura];
      return {
        id: regra.id,
        umidade: regra.umidade,
        temperatura: regra.temperatura,
        consequente: regra.consequente,
        muU: muU,
        muT: muT,
        h: Math.min(muU, muT)
      };
    });
  },

  /* ==================================================================
   * ETAPA 3 — IMPLICAÇÃO (mínimo de Mamdani)
   * Cada consequente é "recortado" na altura h(r):
   *     μr(z) = min(h(r), μconsequente(z))
   * Regras com h = 0 são marcadas como "não contribui".
   * ================================================================== */
  implicar: function (avaliacoes) {
    return avaliacoes.map(function (avaliacao) {
      const conjunto = Fuzzy.buscarConjunto("tempo", avaliacao.consequente);
      return {
        id: avaliacao.id,
        consequente: avaliacao.consequente,
        h: avaliacao.h,
        params: conjunto.params.slice(), // cópia dos (a, b, c, d) do consequente
        contribui: avaliacao.h > 0
      };
    });
  },

  /* Valor do conjunto recortado de UMA regra no ponto z. */
  muRecortada: function (recorte, z) {
    return Math.min(recorte.h, Fuzzy.pertinencia(z, recorte.params));
  },

  /* ==================================================================
   * ETAPA 4 — AGREGAÇÃO (máximo)
   *     μagregada(z) = max(μ1(z), ..., μ9(z))
   * Guardamos quais recortes participam. O valor em cada z é calculado
   * por muAgregada(). Nada é somado: três regras "longo" com h = 0,5
   * continuam produzindo altura 0,5.
   * ================================================================== */
  agregar: function (recortes) {
    const contribuintes = recortes.filter(function (r) { return r.contribui; });
    return { contribuintes: contribuintes };
  },

  muAgregada: function (agregacao, z) {
    let maior = 0;
    for (let i = 0; i < agregacao.contribuintes.length; i++) {
      const valor = Fuzzy.muRecortada(agregacao.contribuintes[i], z);
      if (valor > maior) maior = valor;
    }
    return maior;
  },

  /* ==================================================================
   * ETAPA 5 — DEFUZZIFICAÇÃO (centroide por pontos médios, seção 2.3)
   *     N = 30 / Δz      z(k) = (k + 0,5) × Δz,   k = 0 ... N - 1
   *     z* = Σ[z(k) × μagregada(z(k))] / Σ[μagregada(z(k))]
   * Nenhum valor é arredondado aqui. O arredondamento acontece só na tela.
   * ================================================================== */
  defuzzificar: function (agregacao, dz) {
    const zMax = Fuzzy.DOMINIOS.tempo.max; // 30 minutos
    // 30 / 0,1 = 300. Math.round garante um número inteiro de pontos
    // mesmo que a divisão em ponto flutuante gere algo como 299,99999.
    const N = Math.round(zMax / dz);

    let numerador = 0;   // Σ z(k) × μ(z(k))
    let denominador = 0; // Σ μ(z(k))

    for (let k = 0; k < N; k++) {
      const z = (k + 0.5) * dz;
      const mu = Fuzzy.muAgregada(agregacao, z);
      numerador += z * mu;
      denominador += mu;
    }

    if (denominador === 0) {
      return {
        valido: false, dz: dz, N: N,
        numerador: numerador, denominador: denominador, centroide: null,
        mensagem: "Não há saída agregada válida: nenhuma regra foi ativada " +
                  "(Σ μagregada = 0). O centroide não pode ser calculado."
      };
    }

    return {
      valido: true, dz: dz, N: N,
      numerador: numerador, denominador: denominador,
      centroide: numerador / denominador
    };
  },

  /* ==================================================================
   * INFERÊNCIA COMPLETA: executa as cinco etapas em ordem.
   * O botão "Calcular" e o botão "Avançar etapa" chamam as MESMAS
   * funções acima, por isso chegam ao mesmo resultado.
   * ================================================================== */
  inferir: function (U, T, regras, dz) {
    const erros = Fuzzy.validarConfiguracao(U, T, regras, dz);
    if (erros.length > 0) {
      throw new Error("Configuração inválida: " + erros.join(" "));
    }
    const fuzzificacao  = Fuzzy.fuzzificar(U, T);
    const avaliacoes    = Fuzzy.avaliarRegras(fuzzificacao, regras);
    const recortes      = Fuzzy.implicar(avaliacoes);
    const agregacao     = Fuzzy.agregar(recortes);
    const defuzzificacao = Fuzzy.defuzzificar(agregacao, dz);

    return {
      entradas: { U: U, T: T, dz: dz },
      fuzzificacao: fuzzificacao,
      avaliacoes: avaliacoes,
      recortes: recortes,
      agregacao: agregacao,
      defuzzificacao: defuzzificacao
    };
  },

  /* ==================================================================
   * VALIDAÇÃO DAS ENTRADAS (seções 3 e 6.5)
   * Regra de ouro: nunca "consertar" um valor inválido em silêncio.
   * Se o valor está fora do intervalo, ele é recusado com uma mensagem.
   * ================================================================== */

  /* Valida o texto digitado em um campo numérico.
   * Aceita vírgula ou ponto como separador decimal ("35,5" ou "35.5").
   * Devolve { valido, valor, tipoErro, mensagem }. */
  validarNumero: function (texto, variavel) {
    const dominio = Fuzzy.DOMINIOS[variavel];
    const nome = dominio.nome.charAt(0).toUpperCase() + dominio.nome.slice(1);
    const faixa = "entre " + dominio.min + " e " + dominio.max + " " + dominio.unidade;
    const bruto = (texto === null || texto === undefined) ? "" : String(texto).trim();

    function erro(tipo, mensagem) {
      return { valido: false, valor: null, tipoErro: tipo, mensagem: mensagem };
    }

    if (bruto === "") {
      return erro("vazio", nome + ": o campo está vazio. Informe um valor " + faixa + ".");
    }

    // Troca a vírgula decimal por ponto (apenas leitura do formato).
    const normalizado = bruto.replace(",", ".");

    if (/^[+-]?(infinity|infinito|∞)$/i.test(normalizado)) {
      return erro("nao_finito", nome + ": o valor precisa ser um número finito " + faixa + ".");
    }

    // Formato numérico: dígitos, um separador decimal opcional e expoente opcional.
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(normalizado)) {
      return erro("nao_numerico", nome + ": \"" + bruto + "\" não é um número válido. " +
                  "Use algarismos com vírgula ou ponto decimal (ex.: 35 ou 35,5).");
    }

    const valor = Number(normalizado);

    if (!Number.isFinite(valor)) {
      return erro("nao_finito", nome + ": o valor precisa ser um número finito " + faixa + ".");
    }

    if (valor < dominio.min || valor > dominio.max) {
      return erro("fora_do_intervalo", nome + " deve estar " + faixa +
                  ". O valor " + bruto + " está fora do intervalo e não foi ajustado.");
    }

    return { valido: true, valor: valor, tipoErro: null, mensagem: "" };
  },

  /* Valida o passo Δz: só 0,1; 0,05 ou 0,01. */
  validarPasso: function (dz) {
    const valor = Number(dz);
    if (Fuzzy.PASSOS_PERMITIDOS.indexOf(valor) === -1) {
      return { valido: false, valor: null,
               mensagem: "Passo Δz inválido. Escolha 0,1; 0,05 ou 0,01 minuto." };
    }
    return { valido: true, valor: valor, mensagem: "" };
  },

  /* Valida a base de regras: 9 regras, antecedentes fixos, consequente preenchido. */
  validarRegras: function (regras) {
    if (!Array.isArray(regras) || regras.length !== Fuzzy.REGRAS_PADRAO.length) {
      return { valido: false, mensagem: "A base precisa ter exatamente 9 regras." };
    }
    const idsTempo = Fuzzy.CONJUNTOS.tempo.map(function (c) { return c.id; });
    for (let i = 0; i < regras.length; i++) {
      const padrao = Fuzzy.REGRAS_PADRAO[i];
      const regra = regras[i];
      if (regra.id !== padrao.id || regra.umidade !== padrao.umidade ||
          regra.temperatura !== padrao.temperatura) {
        return { valido: false, mensagem: "Os antecedentes da regra " + padrao.id + " não podem ser alterados." };
      }
      if (idsTempo.indexOf(regra.consequente) === -1) {
        return { valido: false, mensagem: "A regra " + padrao.id + " precisa de um consequente (curto, médio ou longo)." };
      }
    }
    return { valido: true, mensagem: "" };
  },

  /* Verifica uma configuração já convertida em números (usada por inferir). */
  validarConfiguracao: function (U, T, regras, dz) {
    const erros = [];
    const vU = Fuzzy.validarNumero(U, "umidade");
    const vT = Fuzzy.validarNumero(T, "temperatura");
    const vDz = Fuzzy.validarPasso(dz);
    const vR = Fuzzy.validarRegras(regras);
    if (typeof U !== "number" || !vU.valido) erros.push(vU.mensagem || "Umidade inválida.");
    if (typeof T !== "number" || !vT.valido) erros.push(vT.mensagem || "Temperatura inválida.");
    if (!vDz.valido) erros.push(vDz.mensagem);
    if (!vR.valido) erros.push(vR.mensagem);
    return erros;
  },

  /* ==================================================================
   * EXIBIÇÃO: formata um número no padrão brasileiro (vírgula decimal).
   * Usada pela tela e pelos testes. NÃO altera nenhum valor guardado:
   * apenas produz o texto que aparece para o usuário.
   * ================================================================== */
  formatar: function (numero, casasMin, casasMax) {
    if (casasMax === undefined) casasMax = casasMin;
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: casasMin,
      maximumFractionDigits: casasMax,
      useGrouping: false
    });
  },

  /* Graus de pertinência: até 6 casas, sem zeros sobrando ("0,5", "1"). */
  formatarGrau: function (numero) {
    return Fuzzy.formatar(numero, 0, 6);
  }
};

/* Congela as regras padrão para que nenhum código as altere por engano. */
Fuzzy.REGRAS_PADRAO.forEach(function (regra) { Object.freeze(regra); });
Object.freeze(Fuzzy.REGRAS_PADRAO);
