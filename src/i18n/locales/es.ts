import type { Translation } from './pt-PT';

const es: Translation = {
  app: {
    name: 'CentFlow',
    tagline: 'Tu dinero, bajo control.',
  },
  common: {
    comingSoon: 'Próximamente',
    close: 'Cerrar',
    retry: 'Reintentar',
  },
  nav: {
    mainNavigation: 'Navegación principal',
    dashboard: 'Panel',
    transactions: 'Movimientos',
    budgets: 'Presupuestos',
    subscriptions: 'Suscripciones',
    wealth: 'Patrimonio',
    vehicles: 'Vehículos',
    documents: 'Documentos',
    reports: 'Informes',
    settings: 'Ajustes',
    more: 'Más',
    newTransaction: 'Nuevo movimiento',
    groups: {
      planning: 'Planificación',
      assets: 'Patrimonio y archivo',
    },
  },
  dashboard: {
    greeting: {
      morning: 'Buenos días',
      afternoon: 'Buenas tardes',
      evening: 'Buenas noches',
    },
    emptyTitle: 'Tu panel está listo',
    emptyDescription:
      'Cuando añadas cuentas y movimientos, aquí verás el saldo, los ingresos, los gastos y el ahorro calculados a partir de tus datos.',
  },
  modules: {
    transactions: {
      description: 'Gastos, ingresos y transferencias entre cuentas, con búsqueda y filtros.',
    },
    budgets: {
      description: 'Límites mensuales por categoría y objetivos de ahorro con progreso.',
    },
    subscriptions: {
      description: 'Pagos recurrentes, próximas fechas y coste mensual y anual.',
    },
    wealth: {
      description: 'Activos, pasivos, inversiones y evolución del patrimonio neto.',
    },
    vehicles: {
      description: 'Combustible, mantenimiento, seguros y coste real por kilómetro.',
    },
    documents: {
      description: 'Facturas, recibos, contratos y garantías en un archivo seguro.',
    },
    reports: {
      description: 'Análisis por periodo, categoría y evolución en el tiempo.',
    },
  },
  more: {
    title: 'Más',
    subtitle: 'Todas las áreas de CentFlow',
  },
  settings: {
    title: 'Ajustes',
    appearance: 'Apariencia',
    theme: {
      system: 'Sistema',
      light: 'Claro',
      dark: 'Oscuro',
    },
    language: 'Idioma',
    languageSystem: 'Automático',
    about: 'Acerca de',
    version: 'Versión',
  },
  newTransaction: {
    title: 'Nuevo movimiento',
    description: 'El registro rápido de gastos, ingresos y transferencias estará disponible aquí.',
  },
  notFound: {
    title: 'Página no encontrada',
    description: 'La dirección que has abierto no existe o se ha movido.',
    goHome: 'Volver al inicio',
  },
  errors: {
    unexpectedTitle: 'Algo ha salido mal',
    unexpectedDescription:
      'Se ha producido un error inesperado. Tus datos no se han visto afectados.',
  },
};

export default es;
