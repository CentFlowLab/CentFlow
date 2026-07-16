import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_DISCLAIMER_PT,
  LEGAL_ENTITY_NAME,
  TERMS_DATE,
  TERMS_VERSION,
} from './constants';
import type { LegalDocument } from './types';

export const termsDocument: LegalDocument = {
  title: 'Termos de Utilização',
  version: TERMS_VERSION,
  lastUpdated: TERMS_DATE,
  disclaimer: LEGAL_DISCLAIMER_PT,
  sections: [
    {
      id: 'acceptance',
      title: '1. Aceitação',
      paragraphs: [
        `Ao criar conta ou utilizar ${LEGAL_ENTITY_NAME}, aceitas estes Termos de Utilização e a Política de Privacidade aplicável.`,
        'Se não concordares, não deves utilizar a aplicação.',
      ],
    },
    {
      id: 'service',
      title: '2. Descrição do serviço',
      paragraphs: [
        'CentFlow é uma ferramenta de organização financeira pessoal. Não somos instituição de crédito, banco, consultoria de investimento nem prestador de aconselhamento financeiro regulado.',
        'Cálculos, projeções e sugestões são informativos e baseados nos dados que introduzes.',
      ],
    },
    {
      id: 'accounts',
      title: '3. Contas',
      paragraphs: [
        'Deves fornecer informação exacta e manter a segurança das tuas credenciais.',
        'És responsável pela actividade na tua conta até notificares acesso não autorizado.',
        'Podes eliminar a conta a qualquer momento nas definições da app.',
      ],
    },
    {
      id: 'usage',
      title: '4. Utilização permitida',
      paragraphs: ['Comprometes-te a:'],
      bullets: [
        'Usar a app apenas para fins pessoais e legítimos.',
        'Não tentar aceder a sistemas ou dados de outros utilizadores.',
        'Não utilizar a app para actividades ilegais ou fraudulentas.',
        'Não fazer engenharia inversa com intenção de prejudicar o serviço.',
      ],
    },
    {
      id: 'premium',
      title: '5. Funcionalidades Premium (futuro)',
      paragraphs: [
        'Funcionalidades pagas ou subscrições Premium, quando disponíveis, terão preços e condições apresentados antes da compra.',
        'Pagamentos processarão através das lojas Apple/Google ou outro método indicado, sujeito às políticas dessas plataformas.',
        'Nesta versão 1.0.0, não há cobrança activa documentada na app.',
      ],
    },
    {
      id: 'open-banking',
      title: '6. Open Banking',
      paragraphs: [
        'Ligações a instituições financeiras dependem de terceiros (ex.: GoCardless). A disponibilidade e exactidão dos dados importados não são garantidas.',
        'Revoga o consentimento quando deixares de pretender sincronização automática.',
      ],
    },
    {
      id: 'ocr',
      title: '7. OCR e conteúdo enviado',
      paragraphs: [
        'És responsável pelas imagens e documentos que carregas. Garante que tens direito a utilizá-los.',
        'O OCR pode conter erros; deves rever os dados antes de os registar como movimentos.',
      ],
    },
    {
      id: 'availability',
      title: '8. Disponibilidade',
      paragraphs: [
        'O serviço é prestado «tal como está», com manutenção, actualizações OTA e possíveis interrupções.',
        'Podemos activar modo de manutenção ou force update por razões de segurança ou compatibilidade.',
      ],
    },
    {
      id: 'liability',
      title: '9. Responsabilidade e limitações',
      paragraphs: [
        'CentFlow não se responsabiliza por decisões financeiras tomadas com base na app.',
        'Na medida máxima permitida por lei, excluímos garantias implícitas e limitamos responsabilidade por danos indirectos, perda de lucros ou dados, salvo dolo ou negligência grave.',
        'O limite máximo agregado de responsabilidade, se aplicável, deve ser definido na revisão jurídica final.',
      ],
    },
    {
      id: 'ip',
      title: '10. Propriedade intelectual',
      paragraphs: [
        'A marca, interface, código e conteúdos da app pertencem aos titulares de direitos da CentFlow. Não adquires propriedade sobre o software.',
        'Concedes licença limitada, revogável e não exclusiva para usar a app conforme estes Termos.',
      ],
    },
    {
      id: 'suspension',
      title: '11. Suspensão e rescisão',
      paragraphs: [
        'Podemos suspender ou encerrar contas que violem estes Termos ou representem risco de segurança.',
        'Podes deixar de usar o serviço e eliminar a conta a qualquer momento.',
      ],
    },
    {
      id: 'changes',
      title: '12. Alterações aos Termos',
      paragraphs: [
        'Podemos actualizar estes Termos. A versão vigente é indicada no documento. O uso continuado após alterações pode constituir aceitação, conforme lei aplicável.',
      ],
    },
    {
      id: 'law',
      title: '13. Lei aplicável',
      paragraphs: [
        'Salvo disposição legal imperativa em contrário, estes Termos rege-se pela lei portuguesa. Foro competente a confirmar na revisão jurídica.',
      ],
    },
    {
      id: 'contact',
      title: '14. Contacto',
      paragraphs: [`Questões sobre estes Termos: ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};
