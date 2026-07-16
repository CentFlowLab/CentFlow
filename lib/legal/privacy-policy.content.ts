import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_DISCLAIMER_PT,
  LEGAL_ENTITY_NAME,
  PRIVACY_POLICY_DATE,
  PRIVACY_POLICY_VERSION,
} from './constants';
import type { LegalDocument } from './types';

export const privacyPolicyDocument: LegalDocument = {
  title: 'Política de Privacidade',
  version: PRIVACY_POLICY_VERSION,
  lastUpdated: PRIVACY_POLICY_DATE,
  disclaimer: LEGAL_DISCLAIMER_PT,
  sections: [
    {
      id: 'intro',
      title: '1. Quem somos',
      paragraphs: [
        `${LEGAL_ENTITY_NAME} («nós», «CentFlow») é uma aplicação móvel de gestão financeira pessoal. Esta política descreve como tratamos dados pessoais quando utilizas a app CentFlow.`,
        `Responsável pelo tratamento (contacto): ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: 'data-collected',
      title: '2. Dados que podemos recolher',
      paragraphs: ['Consoante as funcionalidades que activas, podemos tratar:'],
      bullets: [
        'Dados de conta: nome, email, identificador de utilizador, preferências de perfil.',
        'Dados financeiros que introduzes: movimentos, contas, créditos, objetivos, subscrições, inventário, orçamentos e anexos (ex.: fotos de talões).',
        'Dados de autenticação: sessão Supabase (tokens geridos pelo SDK; passwords nunca guardadas em texto claro na app).',
        'Dados de Open Banking (se ligares um banco): identificadores de ligação e movimentos importados — tokens bancários apenas no backend, não no dispositivo.',
        'Dados de OCR: imagens de talões enviadas para processamento (Edge Function) para extrair montantes e comerciantes.',
        'Dados técnicos: versão da app, canal OTA, eventos de diagnóstico local (CentFlow Doctor, em builds beta/dev), e — se consentires — eventos de produto e relatórios de crash.',
        'Dados de login social: identificador fornecido pelo Google ou Apple quando usas esses métodos.',
      ],
    },
    {
      id: 'purpose',
      title: '3. Finalidades',
      paragraphs: ['Utilizamos os dados para:'],
      bullets: [
        'Prestar o serviço: sincronizar, calcular e apresentar o teu panorama financeiro.',
        'Autenticação, segurança da conta e recuperação de password.',
        'Open Banking: importar movimentos com o teu consentimento explícito e revogável.',
        'OCR: digitalizar talões que escolhes capturar ou enviar.',
        'Notificações e emails de ciclo de vida (conforme as tuas preferências).',
        'Melhorar estabilidade e produto — apenas com o teu consentimento para analytics opcionais e crash reporting.',
        'Benchmarks agregados anónimos — apenas com opt-in separado em Definições.',
      ],
    },
    {
      id: 'legal-basis',
      title: '4. Base legal (RGPD)',
      paragraphs: [
        'Consoante o contexto, as bases legais podem incluir execução de contrato (prestação do serviço), consentimento (Open Banking, benchmarks, analytics opcionais, notificações marketing), e interesse legítimo (segurança, prevenção de fraude, melhoria técnica essencial).',
        'A base exacta aplicável a cada tratamento deve ser confirmada na revisão jurídica final.',
      ],
    },
    {
      id: 'storage',
      title: '5. Armazenamento',
      paragraphs: [
        'Dados de conta e financeiros são armazenados principalmente em Supabase (UE, conforme configuração do projecto).',
        'No dispositivo: preferências, flags de biometria e registo de consentimento em armazenamento seguro (SecureStore / Keychain). Não utilizamos AsyncStorage para dados sensíveis.',
        'Tokens de sessão são geridos pelo SDK Supabase. Tokens bancários de Open Banking não são guardados localmente.',
      ],
    },
    {
      id: 'retention',
      title: '6. Retenção',
      paragraphs: [
        'Mantemos os dados enquanto a tua conta estiver activa ou conforme necessário para prestar o serviço.',
        'Após eliminação da conta, os dados associados são removidos do backend (cascata via base de dados), salvo obrigações legais de conservação.',
        'Backups e logs de servidor podem reter dados por um período limitado — política de retenção a definir na revisão jurídica.',
      ],
    },
    {
      id: 'encryption',
      title: '7. Encriptação e segurança',
      paragraphs: [
        'Comunicações com Supabase e Edge Functions usam TLS.',
        'Passwords são tratadas pelo Supabase Auth (hash no servidor).',
        'Dados locais sensíveis usam SecureStore com acessibilidade restrita ao dispositivo desbloqueado.',
        'Implementamos medidas técnicas e organizativas adequadas ao estado actual do produto; não garantimos segurança absoluta.',
      ],
    },
    {
      id: 'analytics',
      title: '8. Analytics de produto (opcional)',
      paragraphs: [
        'Eventos de utilização (ex.: abrir definições) podem ser registados na tabela analytics_events apenas se activares «Analytics de produto» no consentimento inicial ou em Privacidade.',
        'Sem consentimento, estes eventos não são persistidos no backend (podem aparecer apenas em consola em desenvolvimento).',
      ],
    },
    {
      id: 'doctor',
      title: '9. CentFlow Doctor',
      paragraphs: [
        'Em builds de desenvolvimento e beta, o Doctor regista operações locais (sync, OCR, erros) para diagnóstico. Não expõe passwords, tokens ou IBAN completos na UI.',
        'O Doctor não substitui analytics de produto; é uma ferramenta de suporte técnico limitada a variantes autorizadas.',
      ],
    },
    {
      id: 'ocr',
      title: '10. OCR e imagens',
      paragraphs: [
        'Quando digitalizas um talão, a imagem pode ser enviada a uma Edge Function para extracção de texto. Só deves enviar documentos que tenhas direito a partilhar.',
        'Podes eliminar movimentos e dados associados; a retenção de imagens no servidor depende da implementação de storage — confirmar na revisão jurídica.',
      ],
    },
    {
      id: 'open-banking',
      title: '11. Open Banking',
      paragraphs: [
        'Ligações bancárias requerem consentimento explícito via fluxo GoCardless. Podes revogar em Definições → Ligações bancárias.',
        'Nenhum token de acesso bancário é armazenado no dispositivo; a gestão de tokens ocorre no backend CentFlow/Supabase.',
      ],
    },
    {
      id: 'social-login',
      title: '12. Google e Apple Login',
      paragraphs: [
        'Se inicias sessão com Google ou Apple, recebemos identificadores e email (conforme permissões do provider) para criar ou associar a tua conta CentFlow.',
        'O tratamento pelo Google e Apple rege-se pelas respectivas políticas de privacidade.',
      ],
    },
    {
      id: 'cookies',
      title: '13. Cookies e tecnologias similares',
      paragraphs: [
        'A app nativa CentFlow não utiliza cookies de navegador. A versão web, se disponível, pode usar armazenamento de sessão do browser — sem tracking publicitário descrito nesta versão do documento.',
      ],
    },
    {
      id: 'rights',
      title: '14. Os teus direitos (RGPD)',
      paragraphs: ['Podes, nos termos legais aplicáveis:'],
      bullets: [
        'Aceder e exportar os teus dados (Definições → Exportar dados, JSON).',
        'Rectificar dados de perfil em Definições.',
        'Retirar consentimentos (analytics, benchmarks, notificações).',
        'Eliminar a conta (Definições → Privacidade → Eliminar conta).',
        'Apresentar reclamação à autoridade de controlo competente (ex.: CNPD em Portugal).',
      ],
    },
    {
      id: 'contact',
      title: '15. Contacto',
      paragraphs: [
        `Questões sobre privacidade: ${LEGAL_CONTACT_EMAIL}.`,
        'Responderemos no prazo razoável; prazos legais formais a confirmar na revisão jurídica.',
      ],
    },
    {
      id: 'changes',
      title: '16. Alterações',
      paragraphs: [
        'Podemos actualizar esta política. A versão e data aparecem no topo do documento. Alterações materiais podem ser comunicadas na app ou por email.',
      ],
    },
  ],
};
