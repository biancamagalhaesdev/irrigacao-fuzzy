
const Fuzzy = {

  DOMINIOS: {
    umidade:     { min: 0,  max: 100, unidade: "%",   nome: "umidade do solo" },
    temperatura: { min: 10, max: 40,  unidade: "°C",  nome: "temperatura" },
    tempo:       { min: 0,  max: 30,  unidade: "min", nome: "tempo de irrigação" }
  },

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

  PASSOS_PERMITIDOS: [0.1, 0.05, 0.01],

  copiarRegrasPadrao: function () {
    return Fuzzy.REGRAS_PADRAO.map(function (regra) {
      return { id: regra.id, umidade: regra.umidade,
               temperatura: regra.temperatura, consequente: regra.consequente };
    });
  },

  buscarConjunto: function (variavel, id) {
    const lista = Fuzzy.CONJUNTOS[variavel];
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].id === id) return lista[i];
    }
    throw new Error("Conjunto desconhecido: " + variavel + " / " + id);
  },

  nomeConjunto: function (variavel, id) {
    return Fuzzy.buscarConjunto(variavel, id).nome;
  },

  pertinencia: function (x, params) {
    const a = params[0], b = params[1], c = params[2], d = params[3];

    if (x >= b && x <= c) return 1;

    if (x < a || x > d) return 0;

    if (x >= a && x < b) return (x - a) / (b - a);

    if (x > c && x <= d) return (d - x) / (d - c);

    return 0; // segurança (não deve acontecer com a <= b <= c <= d)
  },

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

  muRecortada: function (recorte, z) {
    return Math.min(recorte.h, Fuzzy.pertinencia(z, recorte.params));
  },

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

  defuzzificar: function (agregacao, dz) {
    const zMax = Fuzzy.DOMINIOS.tempo.max; 
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

    const normalizado = bruto.replace(",", ".");

    if (/^[+-]?(infinity|infinito|∞)$/i.test(normalizado)) {
      return erro("nao_finito", nome + ": o valor precisa ser um número finito " + faixa + ".");
    }

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

  validarPasso: function (dz) {
    const valor = Number(dz);
    if (Fuzzy.PASSOS_PERMITIDOS.indexOf(valor) === -1) {
      return { valido: false, valor: null,
               mensagem: "Passo Δz inválido. Escolha 0,1; 0,05 ou 0,01 minuto." };
    }
    return { valido: true, valor: valor, mensagem: "" };
  },

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

  formatar: function (numero, casasMin, casasMax) {
    if (casasMax === undefined) casasMax = casasMin;
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: casasMin,
      maximumFractionDigits: casasMax,
      useGrouping: false
    });
  },

  formatarGrau: function (numero) {
    return Fuzzy.formatar(numero, 0, 6);
  }
};

Fuzzy.REGRAS_PADRAO.forEach(function (regra) { Object.freeze(regra); });
Object.freeze(Fuzzy.REGRAS_PADRAO);
