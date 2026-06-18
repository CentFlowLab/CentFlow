# CentFlow — Conteúdo completo do Onboarding

Documento de referência com todo o copy, opções e lógica de personalização do fluxo de onboarding (`app/onboarding.tsx`).

---

## Visão geral

| # | Passo | ID interno | Barra de progresso | Botão principal |
|---|--------|------------|----------------------|-----------------|
| 1 | Nome e tratamento | `name` | — | Continuar |
| 2 | Boas-vindas (assistente) | `welcome` | 12% | Continuar |
| 3 | Perfil | `profile` | 25% | Continuar |
| 4 | Áreas de vida | `life_areas` | 40% | Continuar |
| 5 | Configuração rápida | `smart_config` | 55% | Continuar |
| 6 | Ambições | `ambition` | 70% | Continuar |
| 7 | Revelação personalizada | `reveal` | 85% | Ver o meu espaço |
| 8 | Primeiro passo (WOW) | `wow` | 95% | Vamos a isso |

**Shell (cabeçalho):** marca **CentFlow** · botão voltar a partir do passo 2 (excepto durante a fase de loading do passo 7).

**Gate (antes de concluir):** mensagem de loading *"A preparar a tua experiência..."* enquanto o utilizador autenticado tenta aceder à app sem onboarding completo.

---

## Passo 1 — Nome e tratamento

### Título
**Como te chamas?**

### Texto de apoio
Usamos o seu nome para personalizar a experiência — nada de formalidades desnecessárias.

### Campo
| Campo | Label | Placeholder |
|-------|-------|-------------|
| Nome | O seu nome | Ex: Emanuel |

### Tratamento
**Como gostaria de ser tratado?**

| Opção | ID interno |
|-------|------------|
| Masculino | `male` |
| Feminino | `female` |
| Prefiro não dizer | `neutral` |

**Validação:** nome preenchido + género seleccionado.

---

## Passo 2 — Boas-vindas (mensagens animadas)

Mensagens apresentadas sequencialmente pelo assiste animado. O botão **Continuar** só fica activo quando todas terminam.

### Variante masculino (`male`)
1. Prazer, {primeiroNome} 👋
2. Vou ajudá-lo a organizar o seu dinheiro com clareza e calma.
3. Mas primeiro preciso de conhecer um pouco melhor a sua realidade.

### Variante feminino (`female`)
1. Prazer, {primeiroNome} 👋
2. Vou ajudá-la a organizar o seu dinheiro com clareza e calma.
3. Mas primeiro preciso de conhecer um pouco melhor a sua realidade.

### Variante neutro / prefiro não dizer (`neutral`)
1. Prazer, {primeiroNome} 👋
2. Vou ajudar-te a organizar o teu dinheiro com clareza e calma.
3. Mas primeiro preciso de conhecer melhor a tua realidade.

---

## Passo 3 — Perfil

### Título
**Qual destas frases o descreve melhor?**

### Texto de apoio
Pode escolher mais do que uma — isto ajuda-nos a priorizar o que importa para si.

### Opções (multi-selecção)

| Emoji | Texto | ID interno |
|-------|-------|------------|
| 💳 | Quero controlar melhor os meus gastos | `control_spending` |
| 📄 | Estou cansado de perder faturas e garantias | `receipts_warranties` |
| 📈 | Quero acompanhar o meu património | `track_wealth` |
| 🎯 | Tenho objetivos financeiros específicos | `financial_goals` |
| 🏠 | Tenho créditos e quero perceber melhor os custos | `credits_costs` |
| 🤔 | Ainda estou a descobrir | `still_exploring` |

**Validação:** pelo menos 1 opção seleccionada.

---

## Passo 4 — Áreas de vida

### Título
**{primeiroNome}, quais destas áreas fazem parte da sua vida actualmente?**

### Texto de apoio
Seleccione tudo o que se aplica — usamos isto para mostrar as secções mais relevantes.

### Opções (multi-selecção)

| Emoji | Texto | ID interno |
|-------|-------|------------|
| 🏠 | Casa própria | `own_home` |
| 🚗 | Automóvel | `car` |
| 💳 | Créditos | `credits` |
| 📦 | Compras frequentes online | `online_shopping` |
| 📱 | Subscrições | `subscriptions` |
| 📈 | Investimentos | `investments` |
| 🎯 | Objetivos de poupança | `savings_goals` |
| 🧾 | Guarda faturas / talões | `keeps_receipts` |

**Validação:** pelo menos 1 opção seleccionada.

---

## Passo 5 — Configuração rápida

### Título
**Só o essencial**

### Texto de apoio
Três perguntas rápidas para calibrar a sua experiência — sem formulários longos.

### Pergunta 1 — Rendimento
**Tem rendimento mensal?**

| Opção | Valor |
|-------|-------|
| Sim | `yes` |
| Não | `no` |
| Prefiro não responder | `prefer_not` |

### Pergunta 2 — Poupanças
**Tem poupanças actualmente?**

| Opção | Valor |
|-------|-------|
| Sim | `true` |
| Não | `false` |

### Pergunta 3 — Créditos / dívidas (condicional)

**Condição de omissão:** a pergunta é **omitida** se o utilizador **não** seleccionou `credits_costs` no perfil **e** **não** seleccionou `credits` nas áreas de vida.

**Quando omitida, mostra:**
> Como não indicou créditos, omitimos perguntas sobre dívidas por agora.

**Quando apresentada:**
**Tem créditos ou dívidas?**

| Opção | Valor |
|-------|-------|
| Sim | `true` |
| Não | `false` |

**Validação:** rendimento + poupanças respondidos; se a pergunta de dívidas aparece, também tem de ser respondida.

---

## Passo 6 — Ambições

### Título
**O que gostaria que fosse diferente daqui a 12 meses?**

### Texto de apoio
Escolha uma ou mais ambições — isto orienta as sugestões no seu painel.

### Opções (multi-selecção)

| Emoji | Texto | ID interno |
|-------|-------|------------|
| 💰 | Ter mais poupanças | `more_savings` |
| 📉 | Reduzir dívida | `reduce_debt` |
| 🏠 | Comprar casa | `buy_home` |
| 🚗 | Comprar carro | `buy_car` |
| ✈️ | Viajar | `travel` |
| 📈 | Investir mais | `invest_more` |
| 🎯 | Ter maior controlo financeiro | `more_control` |
| ✨ | Outro | `other` |

### Campo condicional (se "Outro" seleccionado)

| Campo | Label | Placeholder |
|-------|-------|-------------|
| Ambição personalizada | Descreva a sua ambição | Ex: Criar um fundo de emergência |

**Validação:** pelo menos uma ambição (não-"Outro") **ou** "Outro" com texto preenchido.

---

## Passo 7 — Revelação personalizada

### Fase A — Loading (~2,4 s)

- Indicador de progresso
- **A analisar o seu perfil...**
- Estamos a preparar uma experiência à sua medida.

### Fase B — Resumo

#### Cabeçalho
**Olá {primeiroNome} 👋**

Com base nas suas respostas:

#### Insights (lista dinâmica, máx. 6)

Gerados a partir das respostas:

| Origem | Texto mostrado |
|--------|----------------|
| Tags de perfil (excepto "Ainda estou a descobrir") | Label da opção seleccionada |
| Ambições (excepto "Outro" vazio) | Label da ambição ou texto livre |
| Poupanças = Sim | Tem poupanças para acompanhar |
| Dívidas = Sim | Quer ter visibilidade sobre créditos e dívidas |
| Área "Guarda faturas / talões" | Guarda faturas e talões regularmente |

#### Mensagem de confirmação
**A sua experiência CentFlow foi personalizada.**

#### Funcionalidades prioritárias (máx. 4)

| Condição | Emoji | Label |
|----------|-------|-------|
| Perfil `receipts_warranties` OU área `keeps_receipts` OU `online_shopping` | 🧾 | Talões e garantias |
| Perfil `track_wealth` OU área `investments` | 📈 | Património |
| Perfil `financial_goals` OU área `savings_goals` | 🎯 | Objetivos |
| Perfil `control_spending` | 💳 | Controlo de gastos |
| Perfil `credits_costs` OU área `credits` OU dívidas = Sim | 🏦 | Créditos e custos |
| Área `subscriptions` | 📱 | Subscrições |
| *Fallback se nenhuma condição* | 💳 | Movimentos |
| *Fallback se nenhuma condição* | 📊 | Análises |

**Botão:** Ver o meu espaço

---

## Passo 8 — Primeiro passo (WOW)

### Título
**Qual queres adicionar primeiro?**

### Texto de apoio
Escolhe um primeiro passo concreto — nós guiamo-te a partir daí.

### Cartões disponíveis (até 4, ordenados por relevância)

| Emoji | Título | Subtítulo | ID interno |
|-------|--------|-----------|------------|
| 📄 | Primeiro talão | Digitaliza uma fatura e vê a magia do OCR | `first_receipt` |
| 🏠 | Primeiro ativo | Regista algo que possuis ou valorizas | `first_asset` |
| 🎯 | Primeiro objetivo | Define uma meta de poupança concreta | `first_goal` |
| 🛡️ | Primeira garantia | Guarda uma garantia para não a perder | `first_warranty` |

**Ordenação:** pontuação baseada em tags de perfil, áreas de vida e ambições (ex.: talões/garantias sobem `first_receipt` e `first_warranty`; património sobe `first_asset`; objetivos sobem `first_goal`).

### Mensagem ao seleccionar um cartão
> Excelente escolha, {primeiroNome}! Vamos começar pelo que mais importa para ti.

**Botão final:** Vamos a isso → conclui onboarding e redirecciona para `/(tabs)/`.

---

## Conteúdo pós-onboarding (derivado das respostas)

Textos usados na app **depois** de concluir o onboarding, com base nas mesmas respostas.

### Mensagem contextual no Início (`getHomeContextualMessage`)

| Prioridade / condição | Mensagem |
|-----------------------|----------|
| Dívidas, créditos ou ambição "Reduzir dívida" | Mantém os teus créditos e custos sob controlo. |
| Poupanças, objetivos financeiros ou área poupança | Cada movimento conta para os teus objetivos. |
| Faturas/garantias ou primeiro passo talão/garantia | Digitaliza talões para não perderes garantias. |
| Património / investimentos | Acompanha a evolução do teu património todos os dias. |
| Controlo de gastos | Hoje é um bom dia para manter os gastos sob controlo. |
| Ambição "Ter mais poupanças" | Cada pequeno passo conta para as tuas poupanças. |
| Onboarding saltado | Bem-vindo à CentFlow — organiza o teu dinheiro com calma. |
| *Default* | A tua experiência foi personalizada — vamos começar. |

### Subtítulo personalizado no Início

| Condição | Subtítulo |
|----------|-----------|
| Dívidas ou perfil créditos | Foco em visibilidade sobre dívidas e custos fixos. |
| Objetivos financeiros / poupança | Os teus objetivos de poupança guiam as sugestões. |
| Faturas e garantias | Talões digitalizados = garantias + histórico automático. |
| Acompanhar património | Património líquido atualizado em tempo real. |

### Acções rápidas recomendadas no Início (máx. 2)

| Condição | Acção |
|----------|-------|
| Faturas/garantias / talões | Digitalizar talão |
| Garantias como foco | Registar garantia |
| Objetivos / poupança | Criar objetivo |
| Créditos / dívidas | Registar pagamento de crédito |
| Património / inventário | Adicionar bem ao inventário |
| *Fallback* | Digitalizar talão |

### Insight personalizado no Início

| Condição | Emoji | Título | Mensagem | CTA |
|----------|-------|--------|----------|-----|
| Créditos/dívidas | 🏦 | Créditos e custos fixos | Regista pagamentos de crédito e subscrições para teres visibilidade real sobre o que sai todos os meses. | Registar movimento |
| Objetivos sem metas criadas | 🎯 | O teu primeiro objetivo | Definiste que queres poupar com intenção — cria uma meta concreta e acompanha o progresso aqui no Início. | Criar objetivo |
| Garantias sem registos | 🧾 | Garantias sem esforço | Digitaliza um talão e guarda automaticamente o histórico — a base perfeita para registar garantias. | Digitalizar talão |
| Património / investimentos | 📈 | Património completo | Combina movimentos, objetivos e inventário para veres a evolução do teu património num só lugar. | Ver ativos |
| Controlo de gastos | 💳 | Controlo de gastos | Regista despesas à medida que acontecem — em poucos dias vais perceber para onde vai o dinheiro. | Adicionar despesa |

### Empty states personalizados (Ativos)

#### Garantias
| Condição | Título | Descrição | CTA |
|----------|--------|-----------|-----|
| Foco em talões/garantias | Ainda não tens garantias | Digitaliza o teu primeiro talão para começares a guardar garantias automaticamente. Nunca mais percas uma. | Digitalizar talão |
| *Default* | Protege as tuas compras | Regista garantias com data de expiração. Associa ao talão e recebe alertas antes de expirarem. | — |

#### Objetivos
| Condição | Título | Descrição | CTA |
|----------|--------|-----------|-----|
| Foco em poupança/objetivos | Define o teu primeiro objetivo | Tens objetivos de poupança — começa por criar uma meta concreta (fundo de emergência, viagem, etc.) e acompanha o progresso. | Criar primeiro objetivo |
| *Default* | Ainda sem objetivos | Cria metas de poupança com valor alvo, data prevista e acompanha o progresso em tempo real. | — |

#### Inventário
| Condição | Título | Descrição | CTA |
|----------|--------|-----------|-----|
| Património / casa / carro | Regista os teus bens | Mantém o valor dos teus ativos físicos (electrónica, casa, carro...) para teres uma visão completa do património. | Adicionar primeiro item |
| *Default* | Inventaria os teus bens | Mantém registo do valor dos teus ativos físicos — eletrónica, joias, equipamento. | — |

### Mensagens "sem movimentos"

| Condição | Mensagem |
|----------|----------|
| Filtro despesas | Não tens despesas registadas neste filtro. |
| Filtro receitas | Não tens receitas registadas neste filtro. |
| Onboarding incompleto | Adiciona a primeira transação ou digitaliza um talão para começares a ter histórico completo. |
| Foco em talões | Digitaliza o teu primeiro talão e vê como o OCR preenche automaticamente os movimentos. |
| Controlo de gastos | Regista a tua primeira despesa para começares a controlar os gastos. |
| *Default* | Adiciona a primeira transação ou digitaliza um talão para começares a ter histórico completo. |

### Sugestões fallback no Início (máx. 2)

| Condição | Título | Descrição | CTA |
|----------|--------|-----------|-----|
| Onboarding incompleto | Digitaliza o primeiro talão | O OCR preenche o movimento e guarda o histórico para garantias. | Experimentar |
| Faturas/garantias | Começa por um talão | É a forma mais rápida de criar movimentos e preparar garantias sem papelada. | Digitalizar talão |
| Objetivos/poupança | Define um objetivo concreto | Fundo de emergência, viagem ou entrada de casa — escolhe uma meta e acompanha. | Criar objetivo |
| Créditos/dívidas | Mapeia os teus créditos | Regista prestações e custos fixos para saberes quanto comprometido tens por mês. | Ver movimentos |
| Património | Completa o inventário | Adiciona bens com valor estimado para enriquecer a visão do património. | Adicionar bem |
| *Default* | Primeiro passo | Adiciona um movimento ou digitaliza um talão para activar as análises. | Começar |

### Dicas nos tiles de Ativos (Início)

| Condição | Tile | Hint |
|----------|------|------|
| Objetivos financeiros / poupança | Objetivos | Foco em poupança |
| Faturas/garantias | Garantias | Talões → garantias |
| Património / investimentos / casa | Inventário | Património físico |

---

## Dados guardados

Ao concluir, são persistidos:

- Nome e género
- Tags de perfil
- Áreas de vida
- Rendimento, poupanças, dívidas
- Ambições (+ texto livre se "Outro")
- Primeira acção escolhida (`firstAction`)
- `completed: true`, `skipped: false`, `completedAt` (ISO timestamp)

---

## Ficheiros de origem

| Ficheiro | Conteúdo |
|----------|----------|
| `app/onboarding.tsx` | Fluxo UI e copy dos passos |
| `lib/onboarding/constants.ts` | Opções de perfil, áreas, ambições, WOW, progresso |
| `lib/onboarding/welcome.ts` | Mensagens de boas-vindas e opções de género |
| `lib/onboarding/personalization.ts` | Insights, features, WOW ranking, copy pós-onboarding |
| `lib/onboarding/types.ts` | Tipos e estrutura de respostas |
| `components/onboarding/OnboardingShell.tsx` | Layout (CentFlow, voltar, progresso) |
| `components/onboarding/OnboardingGateEffect.tsx` | Gate e loading pré-onboarding |

---

*Gerado a partir do código em `main` — CentFlow Lab.*
