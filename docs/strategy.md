# Estratégia: posicionamento, concorrência e monetização (2026-11)

Documento de trabalho. Os preços dos concorrentes vêm de fontes públicas de terceiros em novembro
de 2026 e **têm de ser confirmados** nos sites oficiais antes de qualquer decisão.

## Posicionamento proposto

> O Miven não se limita a mostrar onde gastas. Diz-te o que mudar, em euros, e lembra-te do que
> vem aí — pensado para a vida financeira em Portugal.

Três pilares que os concorrentes não juntam:

1. **Inteligência explicável, com números reais.** Previsão do fim do mês, gasto por dia, alertas
   com impacto mensal e anual, subidas de preço das subscrições e saúde financeira com pilares.
   Nada é estimado sem o dizer; sem dados, a app diz o que falta.
2. **Obrigações portuguesas no mesmo sítio.** IRS, e-fatura, IMI, IUC, inspeções, seguros e
   validades de documentos, ao lado do dinheiro.
3. **Privacidade e uso local.** Os dados vivem no dispositivo e sincronizam com a conta; não é
   preciso dar acesso ao banco.

## Concorrentes

| App                   | Preço (fonte de terceiros)                              | Ponto forte                                | Onde falha para o público português                      |
| --------------------- | ------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------- |
| YNAB                  | ≈ 109 $/ano ou 14,99 $/mês ([1])                        | Método de orçamento base zero, comunidade  | Caro, em inglês, exige disciplina diária, nada de PT     |
| Wallet (BudgetBakers) | ≈ 4–5 €/mês, com desconto anual; valores divergem ([2]) | Ligação a bancos europeus, multiplataforma | Muitos ecrãs, análise descritiva, sem obrigações fiscais |
| Spendee               | ≈ 1,25–2,99 $/mês, sem preço oficial em euros ([3])     | Visual simples, carteiras partilhadas      | Pouca inteligência, sem contexto português               |
| Actual Budget         | Gratuito, código aberto (alojamento próprio)            | Privacidade, orçamento base zero           | Exige instalar e manter, pouco amigável no telemóvel     |
| Apps dos bancos       | Grátis                                                  | Dados automáticos                          | Só um banco, pouco honestas sobre os próprios produtos   |

[1]: https://getfinny.app/blog/ynab-pricing-2026
[2]: https://getfinny.app/blog/wallet-budgetbakers-review-2026
[3]: https://millennialmoney.com/spendee-review

## Modelo freemium proposto

**Grátis, para sempre:** contas, movimentos, transferências, categorias, orçamentos, subscrições,
objetivos, património, carros, documentos, prazos, importação CSV, sincronização, previsão do mês,
gasto por dia e saúde financeira. Nada que seja essencial para controlar o dinheiro fica pago.

**Miven Premium:** o que tem custo variável ou exige mais trabalho:

- registo por texto e, mais tarde, por fotografia do recibo (IA, custo por pedido);
- relatórios avançados (comparações entre anos, exportação PDF, categorias personalizadas);
- histórico do património e projeções de objetivos;
- espaços partilhados (casal ou família), quando existirem.

**Preço a testar:** 2,99 €/mês ou 24,99 €/ano em Portugal (abaixo do Wallet, muito abaixo do YNAB),
com 30 dias de experiência. Validar com 3 a 5 entrevistas e uma página de interesse antes de ligar
o paywall (`EXPO_PUBLIC_PAYWALL_ENABLED`).

## Custos operacionais estimados (por confirmar)

| Item                          | Estimativa                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Supabase                      | Plano gratuito na fase de testes; plano pago a partir de cerca de 25 $/mês    |
| Email (Resend)                | Gratuito até ao limite mensal do plano; pago depois                           |
| IA (`claude-haiku-5-5`)       | Pedido típico ≈ 600 tokens de entrada e 150 de saída: fração de cêntimo ([4]) |
| Apple Developer / Google Play | 99 $/ano / 25 $ uma vez (necessários para as lojas)                           |
| Domínio e alojamento do site  | GitHub Pages gratuito; domínio anual                                          |

[4]: https://pricepertoken.com/pricing-page/model/anthropic-claude-haiku-5.5 — confirmar na
página oficial da Anthropic antes de definir limites.

**Riscos:** custo da IA sem limite por utilizador (definir quota); dependência de SideStore no iPhone
até haver App Store; obrigações legais (RGPD, responsável pelo tratamento, D-4); Open Banking exige
um agregador licenciado (D-5).

## Próximas cinco prioridades

1. Testar as jornadas principais num iPhone e num Android reais (inclui o Toque posterior e a
   confirmação de email) e corrigir o que falhar.
2. Histórico mensal do património líquido (migração nova) para mostrar a evolução.
3. Início com divulgação progressiva: resumo curto no topo e secções recolhíveis.
4. Decidir a IA (chave, quota e preço) e só então anunciá-la.
5. Validar o Premium com utilizadores reais antes de ligar pagamentos.
