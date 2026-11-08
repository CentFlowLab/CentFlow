const ptPT = {
  app: {
    name: 'CentFlow',
    tagline: 'O teu dinheiro, sob controlo.',
  },
  common: {
    comingSoon: 'Em breve',
    close: 'Fechar',
    retry: 'Tentar novamente',
  },
  nav: {
    mainNavigation: 'Navegação principal',
    dashboard: 'Dashboard',
    transactions: 'Movimentos',
    budgets: 'Orçamentos',
    subscriptions: 'Subscrições',
    wealth: 'Património',
    vehicles: 'Veículos',
    documents: 'Documentos',
    reports: 'Relatórios',
    settings: 'Definições',
    more: 'Mais',
    newTransaction: 'Novo movimento',
    groups: {
      planning: 'Planeamento',
      assets: 'Património e arquivo',
    },
  },
  dashboard: {
    greeting: {
      morning: 'Bom dia',
      afternoon: 'Boa tarde',
      evening: 'Boa noite',
    },
    emptyTitle: 'O teu painel está pronto',
    emptyDescription:
      'Quando adicionares contas e movimentos, vais ver aqui o saldo, rendimentos, despesas e poupança calculados a partir dos teus dados.',
  },
  modules: {
    transactions: {
      description: 'Despesas, rendimentos e transferências entre contas, com pesquisa e filtros.',
    },
    budgets: {
      description: 'Limites mensais por categoria e objetivos de poupança com progresso.',
    },
    subscriptions: {
      description: 'Pagamentos recorrentes, próximas datas e custo mensal e anual.',
    },
    wealth: {
      description: 'Ativos, passivos, investimentos e evolução do património líquido.',
    },
    vehicles: {
      description: 'Combustível, manutenção, seguros e custo real por quilómetro.',
    },
    documents: {
      description: 'Faturas, recibos, contratos e garantias num arquivo seguro.',
    },
    reports: {
      description: 'Análises por período, categoria e evolução ao longo do tempo.',
    },
  },
  more: {
    title: 'Mais',
    subtitle: 'Todas as áreas do CentFlow',
  },
  settings: {
    title: 'Definições',
    appearance: 'Aparência',
    theme: {
      system: 'Sistema',
      light: 'Claro',
      dark: 'Escuro',
    },
    language: 'Idioma',
    languageSystem: 'Automático',
    about: 'Sobre',
    version: 'Versão',
  },
  newTransaction: {
    title: 'Novo movimento',
    description:
      'O registo rápido de despesas, rendimentos e transferências vai estar disponível aqui.',
  },
  notFound: {
    title: 'Página não encontrada',
    description: 'O endereço que abriste não existe ou foi movido.',
    goHome: 'Voltar ao início',
  },
  errors: {
    unexpectedTitle: 'Algo correu mal',
    unexpectedDescription: 'Ocorreu um erro inesperado. Os teus dados não foram afetados.',
  },
};

export default ptPT;

export type Translation = typeof ptPT;
