
const Graficos = {

  MARGEM: { esq: 58, dir: 18, topo: 30, base: 50 },

  PASSO_MARCAS: { umidade: 10, temperatura: 5, tempo: 5 },

  TITULO_EIXO_X: {
    umidade: "Umidade do solo (%)",
    temperatura: "Temperatura (°C)",
    tempo: "Tempo de irrigação (min)"
  },

  SIMBOLO: { umidade: "U", temperatura: "T", tempo: "z" },

  AMOSTRAS: 1200,

  _redesenhos: {},
  _larguras: {},

  medir: function (elemento) {
    const largura = Math.max(300, Math.round(elemento.clientWidth || 600));
    const altura = Math.round(Math.min(320, Math.max(240, largura * 0.55)));
    return { largura: largura, altura: altura };
  },

  escalas: function (dominio, tamanho) {
    const m = Graficos.MARGEM;
    const x0 = m.esq;
    const x1 = tamanho.largura - m.dir;
    const y0 = tamanho.altura - m.base; // linha do grau 0
    const y1 = m.topo;                  // linha do grau 1
    return {
      largura: tamanho.largura, altura: tamanho.altura,
      x0: x0, x1: x1, y0: y0, y1: y1,
      x: function (valor) {
        return x0 + (valor - dominio.min) / (dominio.max - dominio.min) * (x1 - x0);
      },
      y: function (grau) {
        return y0 - grau * (y0 - y1);
      }
    };
  },

  n: function (valor) {
    return valor.toFixed(1);
  },

  _lembrar: function (elemento, redesenhar) {
    Graficos._redesenhos[elemento.id] = redesenhar;
    Graficos._larguras[elemento.id] = elemento.clientWidth;
  },

  abrirSvg: function (esc, descricao) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + esc.largura + " " + esc.altura +
      '" width="' + esc.largura + '" height="' + esc.altura +
      '" role="img" aria-label="' + descricao + '">';
  },

  pontosConjunto: function (params, dominio) {
    const xs = [dominio.min, dominio.max].concat(params)
      .filter(function (v) { return v >= dominio.min && v <= dominio.max; })
      .sort(function (a, b) { return a - b; });
    const unicos = xs.filter(function (v, i) { return i === 0 || v !== xs[i - 1]; });
    return unicos.map(function (x) { return [x, Fuzzy.pertinencia(x, params)]; });
  },

  amostrar: function (funcao, dominio) {
    const pontos = [];
    const total = Graficos.AMOSTRAS;
    for (let i = 0; i <= total; i++) {
      const z = dominio.min + (dominio.max - dominio.min) * i / total;
      pontos.push([z, funcao(z)]);
    }
    const enxutos = [pontos[0]];
    for (let i = 1; i < pontos.length - 1; i++) {
      const a = enxutos[enxutos.length - 1], b = pontos[i], c = pontos[i + 1];
      const giro = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      if (Math.abs(giro) > 1e-12) enxutos.push(b);
    }
    enxutos.push(pontos[pontos.length - 1]);
    return enxutos;
  },

  caminhoLinha: function (pontos, esc) {
    return "M" + pontos.map(function (p) {
      return Graficos.n(esc.x(p[0])) + " " + Graficos.n(esc.y(p[1]));
    }).join(" L");
  },

  caminhoArea: function (pontos, esc) {
    const primeiro = pontos[0], ultimo = pontos[pontos.length - 1];
    return "M" + Graficos.n(esc.x(primeiro[0])) + " " + Graficos.n(esc.y(0)) + " L" +
      pontos.map(function (p) {
        return Graficos.n(esc.x(p[0])) + " " + Graficos.n(esc.y(p[1]));
      }).join(" L") +
      " L" + Graficos.n(esc.x(ultimo[0])) + " " + Graficos.n(esc.y(0)) + " Z";
  },

  eixos: function (esc, dominio, variavel) {
    let s = '<g class="eixos">';

    [0, 0.25, 0.5, 0.75, 1].forEach(function (grau) {
      const y = Graficos.n(esc.y(grau));
      s += '<line class="grade" x1="' + esc.x0 + '" y1="' + y + '" x2="' + esc.x1 + '" y2="' + y + '"/>';
      s += '<text class="marca-texto" x="' + (esc.x0 - 8) + '" y="' + y +
           '" dy="4" text-anchor="end">' + Fuzzy.formatarGrau(grau) + "</text>";
    });

    let passo = Graficos.PASSO_MARCAS[variavel];
    const qtd = (dominio.max - dominio.min) / passo;
    if ((esc.x1 - esc.x0) / qtd < 34) passo = passo * 2;

    for (let v = dominio.min; v <= dominio.max + 1e-9; v += passo) {
      const x = Graficos.n(esc.x(v));
      s += '<line class="marca" x1="' + x + '" y1="' + esc.y0 + '" x2="' + x + '" y2="' + (esc.y0 + 5) + '"/>';
      s += '<text class="marca-texto" x="' + x + '" y="' + (esc.y0 + 19) + '" text-anchor="middle">' +
           Fuzzy.formatar(v, 0, 2) + "</text>";
    }

    s += '<line class="eixo" x1="' + esc.x0 + '" y1="' + esc.y0 + '" x2="' + esc.x1 + '" y2="' + esc.y0 + '"/>';
    s += '<line class="eixo" x1="' + esc.x0 + '" y1="' + esc.y0 + '" x2="' + esc.x0 + '" y2="' + (esc.y1 - 6) + '"/>';

    s += '<text class="titulo-eixo" x="' + Graficos.n((esc.x0 + esc.x1) / 2) + '" y="' + (esc.altura - 10) +
         '" text-anchor="middle">' + Graficos.TITULO_EIXO_X[variavel] + "</text>";
    s += '<text class="titulo-eixo" text-anchor="middle" transform="translate(14 ' +
         Graficos.n((esc.y0 + esc.y1) / 2) + ') rotate(-90)">Grau de pertinência μ</text>';

    return s + "</g>";
  },

  rotuloConjunto: function (conjunto, indice, variavel, dominio, esc) {
    const centro = (conjunto.params[1] + conjunto.params[2]) / 2;
    const amplitude = dominio.max - dominio.min;
    let ancora = "middle";
    if (centro - dominio.min < amplitude * 0.06) ancora = "start";
    else if (dominio.max - centro < amplitude * 0.06) ancora = "end";
    return '<text class="rotulo-conj conj-' + variavel + "-" + indice + '" x="' +
      Graficos.n(esc.x(centro)) + '" y="' + (esc.y1 - 10) + '" text-anchor="' + ancora + '">' +
      conjunto.nome + "</text>";
  },

  rotulo: function (classe, x, y, ancora, texto) {
    return '<text class="' + classe + ' halo" x="' + Graficos.n(x) + '" y="' + Graficos.n(y) +
      '" text-anchor="' + ancora + '">' + texto + "</text>";
  },

  indiceTempo: function (id) {
    return Fuzzy.CONJUNTOS.tempo.map(function (c) { return c.id; }).indexOf(id);
  },

  desenharEntrada: function (elemento, variavel, valor, graus) {
    Graficos._lembrar(elemento, function () {
      Graficos.desenharEntrada(elemento, variavel, valor, graus);
    });

    const dominio = Fuzzy.DOMINIOS[variavel];
    const conjuntos = Fuzzy.CONJUNTOS[variavel];
    const esc = Graficos.escalas(dominio, Graficos.medir(elemento));
    const temValor = valor !== null && valor !== undefined;

    const nomes = conjuntos.map(function (c) { return c.nome; }).join(", ");
    let svg = Graficos.abrirSvg(esc, "Conjuntos de " + dominio.nome + ": " + nomes +
      (temValor ? ". Valor informado: " + Fuzzy.formatar(valor, 0, 4) + " " + dominio.unidade : ""));

    svg += Graficos.eixos(esc, dominio, variavel);

    conjuntos.forEach(function (conjunto, i) {
      const pontos = Graficos.pontosConjunto(conjunto.params, dominio);
      svg += '<path class="linha-conj conj-' + variavel + "-" + i + '" d="' +
             Graficos.caminhoLinha(pontos, esc) + '"/>';
      svg += Graficos.rotuloConjunto(conjunto, i, variavel, dominio, esc);
    });

    if (temValor) {
      const x = esc.x(valor);
      svg += '<line class="marcador" x1="' + Graficos.n(x) + '" y1="' + esc.y0 +
             '" x2="' + Graficos.n(x) + '" y2="' + (esc.y1 - 4) + '"/>';

      conjuntos.forEach(function (conjunto, i) {
        svg += '<circle class="ponto conj-' + variavel + "-" + i + '" cx="' + Graficos.n(x) +
               '" cy="' + Graficos.n(esc.y(graus[conjunto.id])) + '" r="5"/>';
      });

      const texto = Graficos.SIMBOLO[variavel] + " = " + Fuzzy.formatar(valor, 0, 4) + " " + dominio.unidade;
      const aDireita = valor <= dominio.min + 0.7 * (dominio.max - dominio.min);
      svg += Graficos.rotulo("rotulo-marcador", aDireita ? x + 8 : x - 8, esc.y1 + 18,
                             aDireita ? "start" : "end", texto);
    }

    elemento.innerHTML = svg + "</svg>";
  },

  desenharSaida: function (elemento, opcoes) {
    opcoes = opcoes || {};
    Graficos._lembrar(elemento, function () {
      Graficos.desenharSaida(elemento, opcoes);
    });

    const dominio = Fuzzy.DOMINIOS.tempo;
    const esc = Graficos.escalas(dominio, Graficos.medir(elemento));
    let svg = Graficos.abrirSvg(esc, "Conjuntos de saída curto, médio e longo" +
      (opcoes.agregacao ? ", com a região agregada preenchida" : "") +
      (opcoes.defuzzificacao && opcoes.defuzzificacao.valido ? " e a linha do centroide" : ""));

    svg += Graficos.eixos(esc, dominio, "tempo");

    let pontosAgregada = null;
    if (opcoes.agregacao) {
      pontosAgregada = Graficos.amostrar(function (z) {
        return Fuzzy.muAgregada(opcoes.agregacao, z);
      }, dominio);
      svg += '<path class="area-agregada" d="' + Graficos.caminhoArea(pontosAgregada, esc) + '"/>';
    }

    Fuzzy.CONJUNTOS.tempo.forEach(function (conjunto, i) {
      const pontos = Graficos.pontosConjunto(conjunto.params, dominio);
      svg += '<path class="linha-original conj-tempo-' + i + '" d="' +
             Graficos.caminhoLinha(pontos, esc) + '"/>';
      svg += Graficos.rotuloConjunto(conjunto, i, "tempo", dominio, esc);
    });

    if (opcoes.recortes) {
      Graficos.gruposDeRecorte(opcoes.recortes).forEach(function (grupo) {
        const i = Graficos.indiceTempo(grupo.consequente);
        const pontos = Graficos.amostrar(function (z) {
          return Fuzzy.muRecortada(grupo.recorte, z);
        }, dominio);
        svg += '<path class="area-recorte conj-tempo-' + i + '" d="' + Graficos.caminhoArea(pontos, esc) + '"/>';
        svg += '<path class="linha-recorte conj-tempo-' + i + '" d="' + Graficos.caminhoLinha(pontos, esc) + '"/>';
      });
    }

    if (pontosAgregada) {
      svg += '<path class="contorno-agregada" d="' + Graficos.caminhoLinha(pontosAgregada, esc) + '"/>';
    }

    const d = opcoes.defuzzificacao;
    if (d && d.valido) {
      const x = esc.x(d.centroide);
      svg += '<line class="linha-centroide" x1="' + Graficos.n(x) + '" y1="' + esc.y0 +
             '" x2="' + Graficos.n(x) + '" y2="' + (esc.y1 - 4) + '"/>';
      const aDireita = d.centroide <= 20;
      svg += Graficos.rotulo("rotulo-centroide", aDireita ? x + 8 : x - 8, esc.y1 + 18,
                             aDireita ? "start" : "end",
                             "z* = " + Fuzzy.formatar(d.centroide, 2) + " min");
    }

    elemento.innerHTML = svg + "</svg>";
  },

  gruposDeRecorte: function (recortes) {
    const grupos = [];
    recortes.forEach(function (r) {
      if (!r.contribui) return;
      const existente = grupos.find(function (g) {
        return g.consequente === r.consequente && g.recorte.h === r.h;
      });
      if (existente) existente.regras.push(r.id);
      else grupos.push({ consequente: r.consequente, recorte: r, regras: [r.id] });
    });
    return grupos;
  },

  legendaSaida: function (opcoes) {
    opcoes = opcoes || {};
    const itens = [];

    itens.push('<li><svg class="amostra" viewBox="0 0 28 12" aria-hidden="true">' +
      '<line class="linha-original-amostra" x1="1" y1="6" x2="27" y2="6"/></svg>' +
      "Conjuntos originais (tracejado): curto, médio e longo</li>");

    if (opcoes.recortes) {
      const grupos = Graficos.gruposDeRecorte(opcoes.recortes);
      if (grupos.length === 0) {
        itens.push("<li>Nenhuma regra ativada: não há recortes.</li>");
      }
      grupos.forEach(function (g) {
        const i = Graficos.indiceTempo(g.consequente);
        itens.push('<li class="conj-tempo-' + i + '"><span class="amostra-cor"></span>' +
          Fuzzy.nomeConjunto("tempo", g.consequente) + " recortado em h = " +
          Fuzzy.formatarGrau(g.recorte.h) + " (" + g.regras.join(", ") + ")</li>");
      });
    }

    if (opcoes.agregacao) {
      itens.push('<li><span class="amostra-cor amostra-agregada"></span>' +
        "Região agregada: máximo ponto a ponto dos recortes</li>");
    }

    const d = opcoes.defuzzificacao;
    if (d && d.valido) {
      itens.push('<li><svg class="amostra" viewBox="0 0 28 12" aria-hidden="true">' +
        '<line class="linha-centroide" x1="14" y1="0" x2="14" y2="12"/></svg>' +
        "Centroide z* = " + Fuzzy.formatar(d.centroide, 6) + " min</li>");
    }

    return itens.join("");
  },

  desenharRegra: function (elemento, recorte) {
    Graficos._lembrar(elemento, function () {
      Graficos.desenharRegra(elemento, recorte);
    });

    const dominio = Fuzzy.DOMINIOS.tempo;
    const esc = Graficos.escalas(dominio, Graficos.medir(elemento));
    const i = Graficos.indiceTempo(recorte.consequente);
    const conjunto = Fuzzy.buscarConjunto("tempo", recorte.consequente);

    let svg = Graficos.abrirSvg(esc, "Regra " + recorte.id + ": conjunto " + conjunto.nome +
      " original e recorte na altura " + Fuzzy.formatarGrau(recorte.h));
    svg += Graficos.eixos(esc, dominio, "tempo");

    if (recorte.h > 0) {
      const pontos = Graficos.amostrar(function (z) {
        return Fuzzy.muRecortada(recorte, z);
      }, dominio);
      svg += '<path class="area-recorte forte conj-tempo-' + i + '" d="' + Graficos.caminhoArea(pontos, esc) + '"/>';
      svg += '<path class="linha-recorte conj-tempo-' + i + '" d="' + Graficos.caminhoLinha(pontos, esc) + '"/>';
    }

    svg += '<path class="linha-original conj-tempo-' + i + '" d="' +
           Graficos.caminhoLinha(Graficos.pontosConjunto(conjunto.params, dominio), esc) + '"/>';
    svg += Graficos.rotuloConjunto(conjunto, i, "tempo", dominio, esc);

    if (recorte.h > 0) {
      const y = esc.y(recorte.h);
      svg += '<line class="linha-altura" x1="' + esc.x0 + '" y1="' + Graficos.n(y) +
             '" x2="' + esc.x1 + '" y2="' + Graficos.n(y) + '"/>';
      const ancora = conjunto.id === "longo" ? "start" : "end";
      const xTexto = ancora === "start" ? esc.x0 + 8 : esc.x1 - 4;
      svg += Graficos.rotulo("rotulo-altura", xTexto, y - 7, ancora,
                             "h(" + recorte.id + ") = " + Fuzzy.formatarGrau(recorte.h));
    } else {
      svg += Graficos.rotulo("texto-vazio", (esc.x0 + esc.x1) / 2, (esc.y0 + esc.y1) / 2 + 20, "middle",
                             "h(" + recorte.id + ") = 0: recorte vazio, a regra não contribui");
    }

    elemento.innerHTML = svg + "</svg>";
  }
};

window.addEventListener("resize", function () {
  clearTimeout(Graficos._temporizador);
  Graficos._temporizador = setTimeout(function () {
    Object.keys(Graficos._redesenhos).forEach(function (id) {
      const elemento = document.getElementById(id);
      if (elemento && elemento.clientWidth !== Graficos._larguras[id]) {
        Graficos._redesenhos[id]();
      }
    });
  }, 150);
});
