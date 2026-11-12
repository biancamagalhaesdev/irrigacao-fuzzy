# Simulador de irrigação fuzzy (Mamdani)

Aplicação web que simula um sistema de inferência fuzzy do tipo Mamdani para recomendar o tempo de irrigação de um jardim a partir da umidade do solo e da temperatura do ambiente. Toda a inferência (fuzzificação, avaliação das regras, implicação, agregação e defuzzificação) foi implementada em JavaScript puro, sem bibliotecas de lógica fuzzy ou de inteligência artificial.

Atividade prática da disciplina de Inteligência Artificial, Universidade Federal do Piauí, período 2026.2.

## Autores

| Nome completo | Matrícula |
|---|---|
| (preencher) | (preencher) |
| (preencher) | (preencher) |
| (preencher) | (preencher) |

O trabalho pode ser feito por até três estudantes. Apague as linhas que não forem usadas.

## Links

- Aplicação publicada (GitHub Pages): `https://SEU-USUARIO.github.io/irrigacao-fuzzy/` (substituir)
- Repositório público: `https://github.com/SEU-USUARIO/irrigacao-fuzzy` (substituir)
- Página de testes automáticos: `https://SEU-USUARIO.github.io/irrigacao-fuzzy/testes.html` (substituir)

## Objetivo

Receber a umidade do solo U (0 a 100 %) e a temperatura T (10 a 40 °C) e calcular o tempo de irrigação z (0 a 30 minutos), mostrando de forma verificável cada uma das cinco etapas do modelo Mamdani, com gráficos dos conjuntos de entrada e saída, das regras ativadas, dos recortes, da região agregada e do centroide.

A aplicação não simula a dinâmica da água no solo, não integra sensores e não controla equipamentos.

## O modelo Mamdani

Em um sistema fuzzy, cada valor numérico de entrada tem um grau de pertinência entre 0 e 1 em cada termo linguístico (por exemplo, "solo seco"). Esse grau indica o quanto o valor é compatível com o termo; ele não é uma probabilidade, e os graus de uma mesma entrada não precisam somar 1.

No modelo Mamdani, as regras têm a forma "SE antecedente E antecedente, ENTÃO consequente fuzzy". Cada regra produz um conjunto de saída recortado na altura da sua ativação; os conjuntos recortados são reunidos pelo máximo, e a região resultante é convertida em um número pelo centroide. O tempo calculado é resultado dessas operações sobre regras fixas, e não de qualquer processo de aprendizado.

## Conjuntos de pertinência

Funções lineares por partes com quatro parâmetros (a, b, c, d), com a ≤ b ≤ c ≤ d:

- μ(x) = 1 se b ≤ x ≤ c (este trecho é avaliado primeiro);
- μ(x) = 0 se x < a ou x > d;
- μ(x) = (x − a) / (b − a) se a ≤ x < b;
- μ(x) = (d − x) / (d − c) se c < x ≤ d.

Quando a = b ou c = d, o intervalo da rampa correspondente é vazio e a divisão nunca é calculada.

| Variável | Conjunto | (a, b, c, d) |
|---|---|---|
| Umidade (%) | seco | (0, 0, 20, 50) |
| Umidade (%) | intermediário | (20, 50, 50, 80) |
| Umidade (%) | úmido | (50, 80, 100, 100) |
| Temperatura (°C) | baixa | (10, 10, 15, 25) |
| Temperatura (°C) | média | (15, 25, 25, 35) |
| Temperatura (°C) | alta | (25, 35, 40, 40) |
| Tempo (min) | curto | (0, 0, 0, 15) |
| Tempo (min) | médio | (0, 15, 15, 30) |
| Tempo (min) | longo | (15, 30, 30, 30) |

## Base de regras padrão

| Regra | SE o solo é | E a temperatura é | ENTÃO o tempo é |
|---|---|---|---|
| R1 | seco | baixa | médio |
| R2 | seco | média | longo |
| R3 | seco | alta | longo |
| R4 | intermediário | baixa | curto |
| R5 | intermediário | média | médio |
| R6 | intermediário | alta | longo |
| R7 | úmido | baixa | curto |
| R8 | úmido | média | curto |
| R9 | úmido | alta | curto |

Os antecedentes são fixos. Na tela, o consequente de cada regra pode ser trocado por um seletor (curto, médio ou longo).

## As cinco etapas

Os exemplos usam U = 35 %, T = 30 °C, base padrão e Δz = 0,1.

1. **Fuzzificação.** Calcula os três graus da umidade e os três da temperatura. Exemplo: seco = 0,5; intermediário = 0,5; úmido = 0; baixa = 0; média = 0,5; alta = 0,5.
2. **Avaliação das regras.** O operador E é o mínimo: h(r) = min(μumidade(U); μtemperatura(T)). Exemplo: R2 = min(0,5; 0,5) = 0,5. Ficam ativadas R2, R3, R5 e R6, todas com h = 0,5; as demais têm h = 0.
3. **Implicação.** Cada consequente é recortado na altura da regra: μr(z) = min(h(r); μconsequente(z)). Regras com h = 0 não contribuem.
4. **Agregação.** Para cada z, μagregada(z) = max(μ1(z), …, μ9(z)). As áreas nunca são somadas: R2, R3 e R6 concluem "longo" com h = 0,5 e a altura de "longo" continua 0,5. Resultado: μ(z) = z/15 entre 0 e 7,5 e μ(z) = 0,5 entre 7,5 e 30.
5. **Defuzzificação.** Centroide numérico por pontos médios: N = 30/Δz, z(k) = (k + 0,5)·Δz, k = 0, …, N − 1, e z* = Σ[z(k)·μagregada(z(k))] / Σ[μagregada(z(k))]. Exemplo: N = 300, Σ z·μ = 2203,120833, Σ μ = 131,25, z* = 16,785683 min, exibido como 16,79 min. Se o denominador for zero, a aplicação informa que não há saída agregada válida.

Nenhum valor é arredondado durante os cálculos; o arredondamento acontece somente na exibição.

## Tecnologias utilizadas

- HTML5, CSS3 e JavaScript puro (sem frameworks).
- Execução inteiramente no navegador, sem servidor de aplicação.
- Publicação estática pelo GitHub Pages.

## Bibliotecas auxiliares

Nenhuma biblioteca JavaScript foi usada. Os gráficos são desenhados em SVG pelo arquivo `js/graficos.js`, escrito pelo grupo.

## Estrutura dos arquivos

```
irrigacao-fuzzy/
├── index.html        página principal do simulador
├── testes.html       página de testes automáticos
├── README.md         este documento
├── css/
│   └── style.css     aparência (cores e layout)
└── js/
    ├── fuzzy.js      motor Mamdani: conjuntos, regras, cinco etapas e validação
    ├── graficos.js   gráficos em SVG
    ├── interface.js  leitura dos campos, botões, etapas, tabelas e registro
    └── testes.js     verificações automáticas da seção 6 do enunciado
```

O `fuzzy.js` não acessa a tela; a interface e a página de testes usam exatamente as mesmas funções. Os botões Calcular e Avançar etapa chamam a mesma função de execução de etapas, por isso produzem resultados idênticos.

## Como executar localmente

1. Baixe ou clone este repositório.
2. Abra o arquivo `index.html` com dois cliques (Chrome, Edge, Firefox ou Safari).
3. Para rodar os testes, abra `testes.html` da mesma forma.

Não é preciso instalar nada nem iniciar servidor.

## Como utilizar

1. Informe a umidade do solo (0 a 100 %) e a temperatura (10 a 40 °C) pelo campo numérico ou pelo controle deslizante. Vírgula e ponto são aceitos como separador decimal.
2. Escolha o passo Δz (0,1; 0,05 ou 0,01 minuto).
3. Se quiser, altere o consequente de qualquer regra. Regras alteradas ficam sinalizadas.
4. Clique em **Calcular** para executar as cinco etapas, ou em **Avançar etapa** para executá-las uma por vez.
5. Clique em uma linha da tabela de regras (ou use o seletor da etapa 3) para ver o consequente original e o recorte daquela regra.
6. **Restaurar padrão** volta a U = 35 %, T = 30 °C, Δz = 0,1 e às regras originais, e apaga os resultados.

Ao alterar qualquer configuração, os resultados anteriores são apagados e a sequência de etapas recomeça. Campos vazios, valores não numéricos, valores não finitos e valores fora do intervalo bloqueiam o cálculo com uma mensagem; o valor digitado nunca é ajustado para o limite mais próximo.

## Testes e resultados

Salvo indicação, os testes usam a base de regras padrão e Δz = 0,1 minuto. Tolerâncias do enunciado: 0,000001 para pertinências e ativações; 0,01 minuto para tempos.

Os valores abaixo foram obtidos executando o código deste repositório. A página `testes.html` repete todas as verificações no navegador de quem a abrir; na execução registrada, 92 de 92 verificações foram aprovadas.

### Teste 1: pertinências e extremos

| Entrada | Obtido | Referência |
|---|---|---|
| U = 35 % | seco 0,5; intermediário 0,5; úmido 0 | 0,5; 0,5; 0 |
| T = 30 °C | baixa 0; média 0,5; alta 0,5 | 0; 0,5; 0,5 |
| U = 0 % | (1, 0, 0) | (1, 0, 0) |
| U = 100 % | (0, 0, 1) | (0, 0, 1) |
| T = 10 °C | (1, 0, 0) | (1, 0, 0) |
| T = 40 °C | (0, 0, 1) | (0, 0, 1) |
| μcurto(0) e μlongo(30) | 1 e 1 | 1 e 1 |

Conclusão: todos os graus coincidem exatamente com as referências. Os extremos são tratados pelo trecho de pertinência 1, avaliado antes das rampas; em 18.009 avaliações ao longo dos três domínios, nenhum valor foi infinito, indefinido ou fora de [0, 1].

### Teste 2: ativação de uma única regra

| Entrada | Regra ativa | Demais regras | Saída agregada | Tempo obtido | Referência |
|---|---|---|---|---|---|
| U = 20 %, T = 35 °C | R3, h = 1 | h = 0 | longo completo | 24,999889 min (25,00) | ≈ 25,00 |
| U = 50 %, T = 25 °C | R5, h = 1 | h = 0 | médio completo | 15,000000 min (15,00) | 15,00 |
| U = 80 %, T = 25 °C | R8, h = 1 | h = 0 | curto completo | 5,000111 min (5,00) | ≈ 5,00 |

Conclusão: com uma única regra ativa em altura 1, a saída agregada é o conjunto consequente inteiro e o tempo é o centroide do triângulo, não o seu pico. Por isso o solo úmido leva a cerca de 5 minutos, e não a zero. As pequenas diferenças em relação a 25 e 5 vêm da aproximação numérica por pontos médios e estão muito abaixo da tolerância de 0,01 min.

### Teste 3: inferência completa com sobreposição

Entrada: U = 35 %, T = 30 °C, base padrão, Δz = 0,1.

- Fuzzificação: seco 0,5; intermediário 0,5; úmido 0; baixa 0; média 0,5; alta 0,5.
- Ativações: R2 = 0,5 (longo); R3 = 0,5 (longo); R5 = 0,5 (médio); R6 = 0,5 (longo); R1, R4, R7, R8 e R9 = 0.
- Agregação obtida: μ(0) = 0; μ(3) = 0,2; μ(7,5) = 0,5; μ(15) = 0,5; μ(30) = 0,5. A forma coincide com z/15 em [0; 7,5] e 0,5 em [7,5; 30], e a altura máxima é 0,5.
- Defuzzificação: N = 300; Σ z·μ = 2203,120833; Σ μ = 131,25; z* = 16,785683 min.
- Exibição na tela: 16,79 min.

Registro gerado pela aplicação (trecho): "R2: min(0,5; 0,5) = 0,5 → ativada. … Etapa 3: R2 → longo recortado em 0,5; R3 → longo recortado em 0,5; R5 → médio recortado em 0,5; R6 → longo recortado em 0,5. Etapa 4: Máximo entre médio e longo recortados. Etapa 5: z* = 16,785683 min. Tempo recomendado: 16,79 min."

Conclusão: o resultado coincide com a referência do enunciado. As três regras que concluem "longo" não elevam a altura acima de 0,5, o que confirma que a agregação usa o máximo, e não a soma.

### Teste 4: simetria e alteração de regras

| Situação | Obtido | Referência |
|---|---|---|
| U = 35 %, T = 20 °C: ativações | R1, R2, R4 e R5 = 0,5; demais 0 | R1, R2, R4, R5 = 0,5 |
| U = 35 %, T = 20 °C: agregação | constante 0,5 de 0 a 30 | constante 0,5 |
| U = 35 %, T = 20 °C: tempo | 15,000000 min (15,00) | 15,00 |
| Todas as regras = curto; U = 50 %, T = 25 °C | 5,000111 min (5,00) | ≈ 5,00 |
| Restaurar padrão e calcular U = 35 %, T = 30 °C | 16,79 min | 16,79 |

Conclusão: quando curto, médio e longo ficam todos recortados em 0,5, a região agregada é um retângulo simétrico e o centroide fica no meio do domínio, 15 minutos. Trocar todos os consequentes para "curto" faz a mesma entrada que antes resultava em 15 minutos passar a resultar em 5 minutos: o resultado depende diretamente da base de regras. Restaurar padrão recupera entradas, regras e passo originais, e o cálculo volta a 16,79 minutos.

### Teste 5: precisão em função do passo Δz

Entrada do teste 3. Centroide contínuo (integração exata): 220,3125 / 13,125 = 16,785714 min.

| Δz | N | z* obtido | Referência | Erro em relação ao contínuo | Exibido |
|---|---|---|---|---|---|
| 0,1 | 300 | 16,785683 | 16,785683 | 3,175 × 10⁻⁵ | 16,79 |
| 0,05 | 600 | 16,785706 | 16,785706 | 7,937 × 10⁻⁶ | 16,79 |
| 0,01 | 3000 | 16,785714 | 16,785714 | 3,175 × 10⁻⁷ | 16,79 |

Conclusão: quanto menor o passo, mais pontos médios são usados e mais o resultado se aproxima do centroide contínuo. O erro cai com o quadrado do passo: ao dividir Δz por 2, o erro fica 4 vezes menor; ao dividir por 10, fica 100 vezes menor. Isso acontece porque o método dos pontos médios é exato para trechos retos (por isso Σ μ não tem erro), e a única fonte de erro é o trecho curvo z·μ(z) = z²/15 entre 0 e 7,5 minutos. Com duas casas decimais o valor exibido continua 16,79 nos três casos, porque o erro já é menor que 0,005 minuto com Δz = 0,1.

### Teste 6: validação e determinismo

| Entrada | Resultado |
|---|---|
| U = −1 % e U = 101 % | recusadas, mensagem "fora do intervalo", valor mantido |
| T = 9 °C e T = 41 °C | recusadas, mensagem "fora do intervalo", valor mantido |
| Campo vazio | recusado, mensagem "campo vazio" |
| "abc", "35a", "1.000,5" | recusados, mensagem "não é um número válido" |
| "Infinity", "1e999" | recusados, mensagem "precisa ser um número finito" |
| 0, 100, 10, 40, "35,5" | aceitos sem alteração |
| Mesma configuração executada duas vezes | resultados idênticos em todas as etapas |
| Calcular x Avançar etapa cinco vezes | mesmo centroide e mesmo registro |
| Nenhuma regra ativa (teste direto do motor) | mensagem de saída inválida, sem retornar zero |
| Base completa em 273 combinações de U e T | saída válida em todas |

Conclusão: entradas inválidas bloqueiam o cálculo e nunca são corrigidas em silêncio. O sistema é determinístico: a mesma configuração produz os mesmos graus, ativações, área agregada e tempo, seja pelo botão Calcular ou percorrendo as etapas.

### Verificação da interface

Os itens do roteiro de `testes.html` (valores iniciais, Calcular, Avançar etapa, validação na tela, limpeza ao alterar a configuração, seleção de regra, regras alteradas, Restaurar padrão, link do repositório e layout em tela de celular) foram executados com cliques automatizados em um navegador Chromium: 59 de 59 verificações aprovadas. O roteiro pode ser repetido manualmente.

## Publicação no GitHub Pages

1. No repositório, abra **Settings** e depois **Pages**.
2. Em **Build and deployment**, escolha **Source: Deploy from a branch**.
3. Em **Branch**, selecione `main` e a pasta `/ (root)` e clique em **Save**.
4. Aguarde de 1 a 3 minutos e recarregue a página de configurações; o endereço publicado aparece no topo.
5. Confira se `index.html` está na raiz do repositório (e não dentro de outra pasta) e se as pastas `css` e `js` foram enviadas.

Cada novo commit na branch `main` atualiza o site automaticamente em alguns minutos.
