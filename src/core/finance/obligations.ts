import type { CurrencyCode } from '../money';
import { addDays, type CalendarDate } from './dates';
import { daysUntil } from './deadlines';
import { chargesBetween } from './forecast';
import type { DocumentRecord, Id, Subscription, Vehicle } from './types';

/**
 * Próximos prazos e cobranças, juntando o que a pessoa registou (carros, documentos, subscrições)
 * com as datas fixas dos impostos em Portugal. As datas fiscais são as gerais da lei; cada
 * obrigação aparece só a quem ela se pode aplicar (ex.: IMI só com um imóvel registado).
 */
export type Obligation =
  | { kind: 'inspection' | 'insurance'; date: CalendarDate; vehicleId: Id; name: string }
  | { kind: 'document'; date: CalendarDate; documentId: Id; name: string }
  | {
      kind: 'subscription';
      date: CalendarDate;
      subscriptionId: Id;
      name: string;
      amount: number;
      currency: CurrencyCode;
    }
  /** Validar faturas no e-fatura (até 25 de fevereiro). */
  | { kind: 'efatura'; date: CalendarDate }
  /** Fim do prazo de entrega do IRS (1 de abril a 30 de junho). */
  | { kind: 'irs'; date: CalendarDate }
  /** Prestação do IMI: maio (única ou 1.ª), agosto (> 500 €) e novembro (> 100 €). */
  | { kind: 'imi'; date: CalendarDate; installment: 'may' | 'august' | 'november' };

export type ObligationKind = Obligation['kind'];

export type ObligationsInput = {
  today: CalendarDate;
  /** Dias à frente a mostrar. Prazos já ultrapassados de carros e documentos aparecem sempre. */
  horizonDays: number;
  vehicles: readonly Vehicle[];
  documents: readonly DocumentRecord[];
  subscriptions: readonly Subscription[];
  /** Há um imóvel no património (IMI). */
  hasProperty: boolean;
};

/** Datas fiscais gerais de um ano. */
function taxDates(year: number, hasProperty: boolean): Obligation[] {
  const dates: Obligation[] = [
    { kind: 'efatura', date: `${year}-02-25` },
    { kind: 'irs', date: `${year}-06-30` },
  ];
  if (hasProperty) {
    dates.push(
      { kind: 'imi', date: `${year}-05-31`, installment: 'may' },
      { kind: 'imi', date: `${year}-08-31`, installment: 'august' },
      { kind: 'imi', date: `${year}-11-30`, installment: 'november' },
    );
  }
  return dates;
}

/** Dias em que o prazo do IRS está aberto (para o mostrar desde 1 de abril). */
function irsOpen(today: CalendarDate): boolean {
  const monthDay = today.slice(5);
  return monthDay >= '04-01' && monthDay <= '06-30';
}

export function upcomingObligations(input: ObligationsInput): Obligation[] {
  const { today } = input;
  const until = addDays(today, input.horizonDays);
  const items: Obligation[] = [];

  for (const vehicle of input.vehicles) {
    if (vehicle.inspectionDue && vehicle.inspectionDue <= until) {
      items.push({
        kind: 'inspection',
        date: vehicle.inspectionDue,
        vehicleId: vehicle.id,
        name: vehicle.name,
      });
    }
    if (vehicle.insuranceDue && vehicle.insuranceDue <= until) {
      items.push({
        kind: 'insurance',
        date: vehicle.insuranceDue,
        vehicleId: vehicle.id,
        name: vehicle.name,
      });
    }
  }
  for (const document of input.documents) {
    if (document.expiresOn && document.expiresOn <= until) {
      items.push({
        kind: 'document',
        date: document.expiresOn,
        documentId: document.id,
        name: document.title,
      });
    }
  }
  for (const subscription of input.subscriptions) {
    const [next] = chargesBetween(subscription, today, until);
    if (next) {
      items.push({
        kind: 'subscription',
        date: next,
        subscriptionId: subscription.id,
        name: subscription.name,
        amount: subscription.amount,
        currency: subscription.currency,
      });
    }
  }

  const year = Number(today.slice(0, 4));
  for (const tax of [
    ...taxDates(year, input.hasProperty),
    ...taxDates(year + 1, input.hasProperty),
  ]) {
    if (tax.date < today) continue;
    // O IRS aparece durante todo o prazo de entrega (abril a junho); o resto só dentro do horizonte.
    if (
      tax.kind === 'irs'
        ? !irsOpen(today) || tax.date.slice(0, 4) !== today.slice(0, 4)
        : tax.date > until
    )
      continue;
    items.push(tax);
  }

  return items.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1));
}

/** Dias até ao prazo (negativo: já passou). */
export function obligationDays(obligation: Obligation, today: CalendarDate): number {
  return daysUntil(obligation.date, today) ?? 0;
}
