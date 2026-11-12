/
const el = {
  campoU: document.getElementById("campo-umidade"),
  sliderU: document.getElementById("slider-umidade"),
  erroU: document.getElementById("erro-umidade"),
  campoT: document.getElementById("campo-temperatura"),
  sliderT: document.getElementById("slider-temperatura"),
  erroT: document.getElementById("erro-temperatura"),
  selectPasso: document.getElementById("select-passo"),
  erroPasso: document.getElementById("erro-passo"),
  listaRegras: document.getElementById("lista-regras"),
  erroRegras: document.getElementById("erro-regras"),
  btnCalcular: document.getElementById("btn-calcular"),
  btnAvancar: document.getElementById("btn-avancar"),
  btnRestaurar: document.getElementById("btn-restaurar"),
  dicaEtapa: document.getElementById("dica-etapa"),
  aviso: document.getElementById("aviso"),
  resultado: document.getElementById("cartao-resultado"),
  resultadoNumero: document.getElementById("resultado-numero"),
  resultadoDetalhe: document.getElementById("resultado-detalhe"),
  resultadoContexto: document.getElementById("resultado-contexto"),
  graficoU: document.getElementById("grafico-umidade"),
  graficoT: document.getElementById("grafico-temperatura"),
  grausU: document.getElementById("graus-umidade"),
  grausT: document.getElementById("graus-temperatura"),
  conteudo2: document.getElementById("conteudo-2"),
  conteudo3: document.getElementById("conteudo-3"),
  conteudo4: document.getElementById("conteudo-4"),
  conteudo5: document.getElementById("conteudo-5"),
  graficoSaida: document.getElementById("grafico-saida"),
  legendaSaida: document.getElementById("legenda-saida"),
  log: document.getElementById("log"),
  linkRepo: document.getElementById("link-repositorio")
};

const NOMES_ETAPAS = ["Fuzzificação", "Avaliação das regras", "Implicação", "Agregação", "Defuzzificação"];

const PADRAO = { umidade: "35", temperatura: "30", passo: "0.1" };

const estado = {
  etapa: 0,              // 0 = nada executado; 1 a 5 = última etapa executada
  config: null,          // entradas validadas usadas na sequência atual
  fuzzificacao: null,    // resultado da etapa 1
  avaliacoes: null,      // resultado da etapa 2
  recortes: null,        // resultado da etapa 3
  agregacao: null,       // resultado da etapa 4
  defuzzificacao: null,  // resultado da etapa 5
  regraSelecionada: null // regra exibida no detalhe da implicação
};

function grau(n) { return Fuzzy.formatarGrau(n); }
function seis(n) { return Fuzzy.formatar(n, 0, 6); }

function montarListaRegras() {
  el.listaRegras.innerHTML = "";

  Fuzzy.REGRAS_PADRAO.forEach(function (regra) {
    const linha = document.createElement("div");
    linha.className = "regra-config";
    linha.id = "linha-" + regra.id;

    const opcoes = Fuzzy.CONJUNTOS.tempo.map(function (c) {
      return '<option value="' + c.id + '">' + c.nome + "</option>";
    }).join("");

    linha.innerHTML =
      '<span class="regra-id">' + regra.id + "</span>" +
      '<label class="regra-texto" for="consequente-' + regra.id + '">SE solo <strong>' +
        Fuzzy.nomeConjunto("umidade", regra.umidade) + "</strong> E temperatura <strong>" +
        Fuzzy.nomeConjunto("temperatura", regra.temperatura) + "</strong>, ENTÃO tempo</label>" +
      '<select id="consequente-' + regra.id + '">' + opcoes + "</select>" +
      '<span class="regra-alterada">(alterada)</span>';

    el.listaRegras.appendChild(linha);

    const select = linha.querySelector("select");
    select.value = regra.consequente;
    select.addEventListener("change", function () {
      marcarRegrasAlteradas();
      configuracaoAlterada();
    });
  });
}

function lerRegras() {
  return Fuzzy.REGRAS_PADRAO.map(function (padrao) {
    return {
      id: padrao.id,
      umidade: padrao.umidade,
      temperatura: padrao.temperatura,
      consequente: document.getElementById("consequente-" + padrao.id).value
    };
  });
}

function marcarRegrasAlteradas() {
  Fuzzy.REGRAS_PADRAO.forEach(function (padrao) {
    const valor = document.getElementById("consequente-" + padrao.id).value;
    document.getElementById("linha-" + padrao.id)
      .classList.toggle("alterada", valor !== padrao.consequente);
  });
}

function regrasAlteradas(regras) {
  return regras.filter(function (r, i) {
    return r.consequente !== Fuzzy.REGRAS_PADRAO[i].consequente;
  }).map(function (r) { return r.id; });
}

function mostrarErro(campo, elementoErro, mensagem) {
  elementoErro.textContent = mensagem || "";
  if (campo) {
    campo.classList.toggle("invalido", Boolean(mensagem));
    campo.setAttribute("aria-invalid", mensagem ? "true" : "false");
  }
}

function avisar(texto, tipo) {
  el.aviso.textContent = texto;
  el.aviso.className = "aviso aviso-" + (tipo || "info");
}

function lerConfiguracao() {
  const vU = Fuzzy.validarNumero(el.campoU.value, "umidade");
  const vT = Fuzzy.validarNumero(el.campoT.value, "temperatura");
  const vDz = Fuzzy.validarPasso(el.selectPasso.value);
  const regras = lerRegras();
  const vR = Fuzzy.validarRegras(regras);

  mostrarErro(el.campoU, el.erroU, vU.mensagem);
  mostrarErro(el.campoT, el.erroT, vT.mensagem);
  mostrarErro(el.selectPasso, el.erroPasso, vDz.mensagem);
  mostrarErro(null, el.erroRegras, vR.mensagem);

  if (!vU.valido || !vT.valido || !vDz.valido || !vR.valido) {
    avisar("Cálculo bloqueado: corrija os campos indicados em vermelho.", "erro");
    const primeiroInvalido = !vU.valido ? el.campoU : (!vT.valido ? el.campoT : el.selectPasso);
    primeiroInvalido.focus();
    return null;
  }

  return { U: vU.valor, T: vT.valor, dz: vDz.valor, regras: regras };
}

function configuracaoAlterada() {
  if (estado.etapa > 0) {
    limparResultados();
    avisar("Configuração alterada: os resultados anteriores foram apagados e as etapas recomeçam da etapa 1.", "info");
  }
}

function aoDigitar(campo, slider, elementoErro, variavel) {
  const v = Fuzzy.validarNumero(campo.value, variavel);
  mostrarErro(campo, elementoErro, v.mensagem);
  if (v.valido) slider.value = String(v.valor);
  configuracaoAlterada();
}

function aoDeslizar(campo, slider, elementoErro) {
  campo.value = slider.value;
  mostrarErro(campo, elementoErro, "");
  configuracaoAlterada();
}

function iniciarSequencia() {
  const config = lerConfiguracao();
  if (!config) return false;
  limparResultados();
  estado.config = config;
  return true;
}

function executarEtapa(n) {
  const c = estado.config;
  if (n === 1) {
    estado.fuzzificacao = Fuzzy.fuzzificar(c.U, c.T);
    mostrarFuzzificacao();
  } else if (n === 2) {
    estado.avaliacoes = Fuzzy.avaliarRegras(estado.fuzzificacao, c.regras);
    mostrarAvaliacao();
  } else if (n === 3) {
    estado.recortes = Fuzzy.implicar(estado.avaliacoes);
    mostrarImplicacao();
  } else if (n === 4) {
    estado.agregacao = Fuzzy.agregar(estado.recortes);
    mostrarAgregacao();
  } else if (n === 5) {
    estado.defuzzificacao = Fuzzy.defuzzificar(estado.agregacao, c.dz);
    mostrarDefuzzificacao();
  }
  estado.etapa = n;
  atualizarEtapas();
}

function calcular() {
  if (!iniciarSequencia()) return;
  for (let n = 1; n <= 5; n++) executarEtapa(n);
  avisar("Inferência completa: as cinco etapas foram executadas.", "sucesso");

  if (window.innerWidth < 960) {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.resultado.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
  }
}

function avancarEtapa() {
  if (estado.etapa === 0 || estado.etapa === 5) {
    if (!iniciarSequencia()) return;
  }
  const proxima = estado.etapa + 1;
  executarEtapa(proxima);
  avisar("Etapa " + proxima + " de 5 executada: " + NOMES_ETAPAS[proxima - 1] + ".", "sucesso");
}

function restaurarPadrao() {
  el.campoU.value = PADRAO.umidade;
  el.sliderU.value = PADRAO.umidade;
  el.campoT.value = PADRAO.temperatura;
  el.sliderT.value = PADRAO.temperatura;
  el.selectPasso.value = PADRAO.passo;
  Fuzzy.REGRAS_PADRAO.forEach(function (regra) {
    document.getElementById("consequente-" + regra.id).value = regra.consequente;
  });
  marcarRegrasAlteradas();
  mostrarErro(el.campoU, el.erroU, "");
  mostrarErro(el.campoT, el.erroT, "");
  mostrarErro(el.selectPasso, el.erroPasso, "");
  mostrarErro(null, el.erroRegras, "");
  limparResultados();
  avisar("Configuração padrão restaurada: U = 35 %, T = 30 °C, Δz = 0,1 min e as nove regras originais. Resultados apagados.", "sucesso");
}

function mostrarListaGraus(ul, variavel, graus, valor) {
  const simbolo = Graficos.SIMBOLO[variavel];
  ul.innerHTML = Fuzzy.CONJUNTOS[variavel].map(function (conjunto, i) {
    const g = graus ? graus[conjunto.id] : null;
    const argumento = graus ? Fuzzy.formatar(valor, 0, 4) : simbolo;
    const classe = g === null ? "" : (g > 0 ? " positivo" : " zero");
    return '<li class="grau conj-' + variavel + "-" + i + classe + '">' +
      '<span class="amostra-cor"></span>' +
      '<span class="grau-nome">μ<sub>' + conjunto.nome + "</sub>(" + argumento + ")</span>" +
      '<span class="grau-valor">' + (g === null ? "—" : grau(g)) + "</span></li>";
  }).join("");
}

function mostrarFuzzificacao() {
  const f = estado.fuzzificacao;
  Graficos.desenharEntrada(el.graficoU, "umidade", f.U, f.umidade);
  Graficos.desenharEntrada(el.graficoT, "temperatura", f.T, f.temperatura);
  mostrarListaGraus(el.grausU, "umidade", f.umidade, f.U);
  mostrarListaGraus(el.grausT, "temperatura", f.temperatura, f.T);

  const textoU = Fuzzy.CONJUNTOS.umidade.map(function (c) {
    return c.nome + " = " + grau(f.umidade[c.id]);
  }).join("; ");
  const textoT = Fuzzy.CONJUNTOS.temperatura.map(function (c) {
    return c.nome + " = " + grau(f.temperatura[c.id]);
  }).join("; ");

  registrar(1, "U = " + Fuzzy.formatar(f.U, 0, 4) + " % → " + textoU +
               ". T = " + Fuzzy.formatar(f.T, 0, 4) + " °C → " + textoT + ".");
}

function mostrarAvaliacao() {
  const avaliacoes = estado.avaliacoes;
  const ativas = avaliacoes.filter(function (a) { return a.h > 0; });

  let html = '<p class="resumo">' + ativas.length + " de 9 regras ativadas (h &gt; 0)" +
    (ativas.length ? ": " + ativas.map(function (a) { return a.id; }).join(", ") : "") +
    ". Clique em uma regra para ver o recorte dela na etapa 3.</p>";

  html += '<div class="tabela-rolagem"><table class="tabela-regras"><thead><tr>' +
    '<th scope="col">Regra</th><th scope="col">Antecedentes</th>' +
    '<th scope="col">μ do solo</th><th scope="col">μ da temperatura</th>' +
    '<th scope="col">h(r) = mínimo</th><th scope="col">Consequente</th>' +
    '<th scope="col">Situação</th></tr></thead><tbody>';

  avaliacoes.forEach(function (a) {
    const ativa = a.h > 0;
    html += '<tr class="' + (ativa ? "ativa" : "inativa") + '" data-regra="' + a.id + '" tabindex="0">' +
      '<th scope="row">' + a.id + "</th>" +
      "<td>" + Fuzzy.nomeConjunto("umidade", a.umidade) + " E " +
               Fuzzy.nomeConjunto("temperatura", a.temperatura) + "</td>" +
      '<td class="num">' + grau(a.muU) + "</td>" +
      '<td class="num">' + grau(a.muT) + "</td>" +
      '<td class="num">min(' + grau(a.muU) + "; " + grau(a.muT) + ") = <strong>" + grau(a.h) + "</strong></td>" +
      "<td>" + Fuzzy.nomeConjunto("tempo", a.consequente) + "</td>" +
      '<td><span class="selo ' + (ativa ? "selo-ativa" : "selo-inativa") + '">' +
        (ativa ? "ativada" : "não ativada") + "</span></td></tr>";
  });

  html += "</tbody></table></div>";
  el.conteudo2.innerHTML = html;

  el.conteudo2.querySelectorAll("tbody tr").forEach(function (linha) {
    linha.addEventListener("click", function () { selecionarRegra(linha.dataset.regra); });
    linha.addEventListener("keydown", function (evento) {
      if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        selecionarRegra(linha.dataset.regra);
      }
    });
  });

  registrar(2, ativas.length + " de 9 regras ativadas.", avaliacoes.map(function (a) {
    return a.id + ": min(" + grau(a.muU) + "; " + grau(a.muT) + ") = " + grau(a.h) +
      (a.h > 0 ? " → ativada" : " → não ativada");
  }));
}

function mostrarImplicacao() {
  const recortes = estado.recortes;
  const ativas = recortes.filter(function (r) { return r.contribui; });
  if (!estado.regraSelecionada) {
    estado.regraSelecionada = ativas.length ? ativas[0].id : recortes[0].id;
  }

  const opcoes = recortes.map(function (r) {
    return '<option value="' + r.id + '">' + r.id + ": " + Fuzzy.nomeConjunto("tempo", r.consequente) +
      ", h = " + grau(r.h) + "</option>";
  }).join("");

  const itens = recortes.map(function (r) {
    const nome = Fuzzy.nomeConjunto("tempo", r.consequente);
    return r.contribui
      ? '<li class="contribui">' + r.id + ": " + nome + " recortado em h = " + grau(r.h) + "</li>"
      : '<li class="nao-contribui">' + r.id + ": h = 0, " + nome + " não contribui</li>";
  }).join("");

  el.conteudo3.innerHTML =
    '<div class="detalhe-regra">' +
      '<div class="detalhe-escolha"><label for="select-regra-detalhe">Regra exibida no gráfico</label>' +
      '<select id="select-regra-detalhe">' + opcoes + "</select></div>" +
      '<div class="grafico" id="grafico-regra"></div>' +
      '<p class="legenda-texto" id="legenda-regra"></p>' +
    "</div>" +
    '<ul class="lista-recortes">' + itens + "</ul>";

  const select = document.getElementById("select-regra-detalhe");
  select.value = estado.regraSelecionada;
  select.addEventListener("change", function () { selecionarRegra(select.value); });

  desenharDetalheRegra();

  Graficos.desenharSaida(el.graficoSaida, { recortes: recortes });
  el.legendaSaida.innerHTML = Graficos.legendaSaida({ recortes: recortes });

  const textoAtivas = ativas.map(function (r) {
    return r.id + " → " + Fuzzy.nomeConjunto("tempo", r.consequente) + " recortado em " + grau(r.h);
  }).join("; ");
  registrar(3, ativas.length
    ? textoAtivas + ". As demais regras têm h = 0 e não contribuem."
    : "Nenhuma regra tem h > 0: não há conjuntos recortados.");
}

function selecionarRegra(id) {
  estado.regraSelecionada = id;
  el.conteudo2.querySelectorAll("tbody tr").forEach(function (linha) {
    linha.classList.toggle("selecionada", linha.dataset.regra === id);
  });
  if (!estado.recortes) {
    avisar("Regra " + id + " selecionada. O recorte aparece depois da etapa 3 (Implicação).", "info");
    return;
  }
  const select = document.getElementById("select-regra-detalhe");
  if (select) select.value = id;
  desenharDetalheRegra();
}

function desenharDetalheRegra() {
  const recorte = estado.recortes.find(function (r) { return r.id === estado.regraSelecionada; });
  Graficos.desenharRegra(document.getElementById("grafico-regra"), recorte);
  const nome = Fuzzy.nomeConjunto("tempo", recorte.consequente);
  document.getElementById("legenda-regra").textContent = recorte.contribui
    ? "Tracejado: conjunto “" + nome + "” original. Área preenchida: recorte μ" + recorte.id +
      "(z) = min(" + grau(recorte.h) + "; μ" + nome + "(z))."
    : "A regra " + recorte.id + " tem h = 0: o conjunto “" + nome +
      "” (tracejado) fica com altura zero e não entra na agregação.";
  el.conteudo2.querySelectorAll("tbody tr").forEach(function (linha) {
    linha.classList.toggle("selecionada", linha.dataset.regra === estado.regraSelecionada);
  });
}

function agruparPorConsequente(contribuintes) {
  return Fuzzy.CONJUNTOS.tempo.map(function (conjunto) {
    const doConjunto = contribuintes.filter(function (r) { return r.consequente === conjunto.id; });
    return {
      consequente: conjunto.id,
      hMax: doConjunto.reduce(function (m, r) { return Math.max(m, r.h); }, 0),
      regras: doConjunto.map(function (r) { return r.id; })
    };
  }).filter(function (g) { return g.regras.length > 0; });
}

function mostrarAgregacao() {
  const ag = estado.agregacao;
  Graficos.desenharSaida(el.graficoSaida, { recortes: estado.recortes, agregacao: ag });
  el.legendaSaida.innerHTML = Graficos.legendaSaida({ recortes: estado.recortes, agregacao: ag });

  const grupos = agruparPorConsequente(ag.contribuintes);
  if (grupos.length === 0) {
    el.conteudo4.innerHTML = '<p class="alerta">Nenhuma regra foi ativada: a saída agregada é nula.</p>';
    registrar(4, "Nenhum conjunto recortado: saída agregada nula.");
    return;
  }

  const descricao = grupos.map(function (g) {
    return Fuzzy.nomeConjunto("tempo", g.consequente) + " (altura " + grau(g.hMax) + "; " + g.regras.join(", ") + ")";
  }).join(" e ");

  const repetidos = grupos.filter(function (g) { return g.regras.length > 1; });
  const notaSoma = repetidos.length
    ? '<p class="nota">Regras com o mesmo consequente não se somam: ' + repetidos.map(function (g) {
        return g.regras.join(", ") + " mantêm “" + Fuzzy.nomeConjunto("tempo", g.consequente) +
          "” na altura " + grau(g.hMax);
      }).join("; ") + ".</p>"
    : "";

  const pontos = [0, 3, 7.5, 15, 22.5, 30];
  const linhas = pontos.map(function (z) {
    return "<tr><td>" + Fuzzy.formatar(z, 0, 2) + '</td><td class="num">' +
      grau(Fuzzy.muAgregada(ag, z)) + "</td></tr>";
  }).join("");

  el.conteudo4.innerHTML =
    "<p>Máximo ponto a ponto entre: " + descricao + ".</p>" + notaSoma +
    '<table class="tabela-pontos"><caption>Valores para conferência</caption>' +
    '<thead><tr><th scope="col">z (min)</th><th scope="col">μ<sub>agregada</sub>(z)</th></tr></thead>' +
    "<tbody>" + linhas + "</tbody></table>";

  registrar(4, "Máximo entre " + grupos.map(function (g) {
    return Fuzzy.nomeConjunto("tempo", g.consequente);
  }).join(" e ") + " recortados. " + pontos.map(function (z) {
    return "μ(" + Fuzzy.formatar(z, 0, 2) + ") = " + grau(Fuzzy.muAgregada(ag, z));
  }).join("; ") + ".");
}

function mostrarDefuzzificacao() {
  const d = estado.defuzzificacao;
  const c = estado.config;

  if (!d.valido) {
    el.conteudo5.innerHTML = '<p class="alerta">' + d.mensagem + "</p>";
    Graficos.desenharSaida(el.graficoSaida, { recortes: estado.recortes, agregacao: estado.agregacao });
    el.resultado.className = "resultado sem-saida";
    el.resultadoNumero.textContent = "—";
    el.resultadoDetalhe.textContent = d.mensagem;
    registrar(5, d.mensagem);
    return;
  }

  const ultimoPonto = (d.N - 1 + 0.5) * d.dz;
  el.conteudo5.innerHTML =
    '<dl class="contas">' +
      "<dt>Passo Δz</dt><dd>" + Fuzzy.formatar(d.dz, 0, 2) + " min</dd>" +
      "<dt>N = 30 / Δz</dt><dd>" + d.N + " pontos</dd>" +
      "<dt>Pontos médios z(k)</dt><dd>" + Fuzzy.formatar(0.5 * d.dz, 0, 4) + "; " +
        Fuzzy.formatar(1.5 * d.dz, 0, 4) + "; …; " + Fuzzy.formatar(ultimoPonto, 0, 4) + "</dd>" +
      "<dt>Σ z(k) · μ(z(k))</dt><dd>" + seis(d.numerador) + "</dd>" +
      "<dt>Σ μ(z(k))</dt><dd>" + seis(d.denominador) + "</dd>" +
      "<dt>z* (6 casas)</dt><dd>" + Fuzzy.formatar(d.centroide, 6) + " min</dd>" +
      '<dt>Exibido</dt><dd class="destaque">' + Fuzzy.formatar(d.centroide, 2) + " min</dd>" +
    "</dl>";

  const opcoes = { recortes: estado.recortes, agregacao: estado.agregacao, defuzzificacao: d };
  Graficos.desenharSaida(el.graficoSaida, opcoes);
  el.legendaSaida.innerHTML = Graficos.legendaSaida(opcoes);

  // Resultado principal
  el.resultado.className = "resultado pronto";
  el.resultadoNumero.textContent = Fuzzy.formatar(d.centroide, 2);
  el.resultadoDetalhe.textContent = "Centroide com 6 casas: " + Fuzzy.formatar(d.centroide, 6) + " min.";
  const alteradas = regrasAlteradas(c.regras);
  el.resultadoContexto.textContent = "Para U = " + Fuzzy.formatar(c.U, 0, 4) + " %, T = " +
    Fuzzy.formatar(c.T, 0, 4) + " °C e Δz = " + Fuzzy.formatar(c.dz, 0, 2) + " min, " +
    (alteradas.length ? "com regras alteradas (" + alteradas.join(", ") + ")." : "com a base de regras padrão.");

  registrar(5, "Δz = " + Fuzzy.formatar(d.dz, 0, 2) + "; N = " + d.N + "; Σ z·μ = " + seis(d.numerador) +
    "; Σ μ = " + seis(d.denominador) + "; z* = " + Fuzzy.formatar(d.centroide, 6) +
    " min. Tempo recomendado: " + Fuzzy.formatar(d.centroide, 2) + " min.");
}

function registrar(etapa, texto, detalhes) {
  const vazio = el.log.querySelector(".log-vazio");
  if (vazio) vazio.remove();
  const item = document.createElement("li");
  let html = "<strong>Etapa " + etapa + ", " + NOMES_ETAPAS[etapa - 1].toLowerCase() + ":</strong> " + texto;
  if (detalhes && detalhes.length) {
    html += "<ul>" + detalhes.map(function (d) { return "<li>" + d + "</li>"; }).join("") + "</ul>";
  }
  item.innerHTML = html;
  el.log.appendChild(item);
}

function atualizarEtapas() {
  for (let n = 1; n <= 5; n++) {
    const concluida = n <= estado.etapa;
    document.getElementById("etapa-" + n).classList.toggle("concluida", concluida);
    document.getElementById("status-" + n).textContent = concluida ? "(concluída)" : "(pendente)";
  }

  el.dicaEtapa.textContent = estado.etapa < 5
    ? "Próxima etapa: " + (estado.etapa + 1) + ". " + NOMES_ETAPAS[estado.etapa]
    : "Sequência concluída. Avançar etapa recomeça da etapa 1.";
}

function textoPendente(n) {
  return '<p class="vazio">A etapa ' + n + " ainda não foi executada. Use Calcular ou Avançar etapa.</p>";
}

function limparResultados() {
  estado.etapa = 0;
  estado.config = null;
  estado.fuzzificacao = null;
  estado.avaliacoes = null;
  estado.recortes = null;
  estado.agregacao = null;
  estado.defuzzificacao = null;
  estado.regraSelecionada = null;

  Graficos.desenharEntrada(el.graficoU, "umidade", null, null);
  Graficos.desenharEntrada(el.graficoT, "temperatura", null, null);
  mostrarListaGraus(el.grausU, "umidade", null, null);
  mostrarListaGraus(el.grausT, "temperatura", null, null);

  el.conteudo2.innerHTML = textoPendente(2);
  el.conteudo3.innerHTML = textoPendente(3);
  el.conteudo4.innerHTML = textoPendente(4);
  el.conteudo5.innerHTML = textoPendente(5);

  Graficos.desenharSaida(el.graficoSaida, {});
  el.legendaSaida.innerHTML = Graficos.legendaSaida({});

  el.resultado.className = "resultado";
  el.resultadoNumero.textContent = "—";
  el.resultadoDetalhe.textContent = "Clique em Calcular ou percorra as etapas com Avançar etapa.";
  el.resultadoContexto.textContent = "";

  el.log.innerHTML = '<li class="log-vazio">Nenhuma etapa executada.</li>';
  atualizarEtapas();
}

function configurarLinkRepositorio() {
  const host = window.location.hostname;
  if (el.linkRepo.href.indexOf("SEU-USUARIO") === -1 || !host.endsWith(".github.io")) return;
  const usuario = host.slice(0, -".github.io".length);
  const repositorio = window.location.pathname.split("/")[1];
  if (usuario && repositorio) {
    el.linkRepo.href = "https://github.com/" + usuario + "/" + repositorio;
  }
}

function ligarEventos() {
  el.campoU.addEventListener("input", function () { aoDigitar(el.campoU, el.sliderU, el.erroU, "umidade"); });
  el.campoT.addEventListener("input", function () { aoDigitar(el.campoT, el.sliderT, el.erroT, "temperatura"); });
  el.sliderU.addEventListener("input", function () { aoDeslizar(el.campoU, el.sliderU, el.erroU); });
  el.sliderT.addEventListener("input", function () { aoDeslizar(el.campoT, el.sliderT, el.erroT); });
  el.selectPasso.addEventListener("change", function () {
    mostrarErro(el.selectPasso, el.erroPasso, "");
    configuracaoAlterada();
  });

  [el.campoU, el.campoT].forEach(function (campo) {
    campo.addEventListener("keydown", function (evento) {
      if (evento.key === "Enter") calcular();
    });
  });

  el.btnCalcular.addEventListener("click", calcular);
  el.btnAvancar.addEventListener("click", avancarEtapa);
  el.btnRestaurar.addEventListener("click", restaurarPadrao);
}

function iniciar() {
  montarListaRegras();
  ligarEventos();
  configurarLinkRepositorio();
  limparResultados();
  avisar("Configuração padrão carregada. Clique em Calcular ou em Avançar etapa.", "info");
}

iniciar();
