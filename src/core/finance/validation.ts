import { isCurrencyCode, MAX_AMOUNT_MINOR } from '../money';
import { isValidCalendarDate, type CalendarDate } from './dates';
import {
  ACCOUNT_TYPES,
  BUDGET_PERIODS,
  CATEGORY_TYPES,
  SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_STATUSES,
  ENTRY_TYPES,
  type Account,
  type AccountInput,
  type BudgetInput,
  type GoalContributionInput,
  type SavingsGoalInput,
  type WealthItem,
  type WealthItemInput,
  type WealthPaymentInput,
  WEALTH_TYPES,
  type VehicleInput,
  type DocumentInput,
  VEHICLE_COST_TYPES,
  LOAN_KINDS,
  LOAN_ROLES,
  VEHICLE_FUEL_TYPES,
  VEHICLE_KINDS,
  VEHICLE_LIMITS,
  DOCUMENT_CATEGORIES,
  ATTACHMENT_LIMITS,
  ATTACHMENT_MIMES,
  type DocumentAttachment,
  type SubscriptionInput,
  type Category,
  type CategoryInput,
  type EntryInput,
} from './types';
import { splitPayment } from './credit';
import { isLiabilityType } from './wealth';

export const LIMITS = {
  nameMaxLength: 60,
  descriptionMaxLength: 140,
  notesMaxLength: 1000,
} as const;

/** Códigos estáveis; a interface traduz cada um (ver `validation.*` nas traduções). */
export type ValidationCode =
  | 'required'
  | 'tooLong'
  | 'invalid'
  | 'amountNotPositive'
  | 'amountTooLarge'
  | 'accountNotFound'
  | 'accountArchived'
  | 'categoryRequired'
  | 'categoryNotFound'
  | 'categoryTypeMismatch'
  | 'sameAccount'
  | 'currencyMismatch'
  | 'currencyLocked'
  | 'typeLocked'
  | 'invalidDate'
  | 'duplicateCategory'
  | 'originNotBefore'
  | 'principalTooLarge'
  | 'dateBeforeValuation'
  | 'notLiability'
  | 'odometerOutOfOrder'
  | 'purchaseNotExpense'
  | 'splitMismatch'
  | 'cardOnly'
  | 'purchaseAlreadyLinked';

export type ValidationErrors<Field extends string> = Partial<Record<Field, ValidationCode>>;

export class ValidationError<Field extends string = string> extends Error {
  constructor(
    readonly errors: ValidationErrors<Field>,
    /** Posição do registo com erro, quando se gravam vários de uma vez. */
    readonly index?: number,
  ) {
    super(`Validation failed: ${Object.keys(errors).join(', ')}`);
    this.name = 'ValidationError';
  }
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

function validateName(name: string): ValidationCode | undefined {
  const trimmed = name.trim();
  if (trimmed === '') return 'required';
  if (trimmed.length > LIMITS.nameMaxLength) return 'tooLong';
  return undefined;
}

function isSafeMinor(value: number): boolean {
  return Number.isSafeInteger(value) && Math.abs(value) <= MAX_AMOUNT_MINOR;
}

export type AccountField = keyof AccountInput;

export function validateAccountInput(input: AccountInput): ValidationErrors<AccountField> {
  const errors: ValidationErrors<AccountField> = {};
  const name = validateName(input.name);
  if (name) errors.name = name;
  if (!(ACCOUNT_TYPES as readonly string[]).includes(input.type)) errors.type = 'invalid';
  if (!isCurrencyCode(input.currency)) errors.currency = 'invalid';
  if (!isSafeMinor(input.initialBalance)) errors.initialBalance = 'amountTooLarge';
  // Campos de cartão (ADR-057): só em contas do tipo cartão.
  const card = input.type === 'card';
  if (input.creditLimit != null) {
    if (!card) errors.creditLimit = 'cardOnly';
    else if (!isIntegerBetween(input.creditLimit, 1, MAX_AMOUNT_MINOR)) {
      errors.creditLimit = 'amountNotPositive';
    }
  }
  for (const field of ['statementDay', 'dueDay'] as const) {
    const value = input[field];
    if (value == null) continue;
    if (!card) errors[field] = 'cardOnly';
    else if (!isIntegerBetween(value, 1, 31)) errors[field] = 'invalid';
  }
  if (input.paymentAccountId != null && !card) errors.paymentAccountId = 'cardOnly';
  if (input.institution != null && !isTextBetween(input.institution, 1, 60)) {
    errors.institution = 'invalid';
  }
  if (input.color != null && !isTextBetween(input.color, 1, 20)) errors.color = 'invalid';
  return errors;
}

function isIntegerBetween(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function isTextBetween(value: string, min: number, max: number): boolean {
  const length = value.trim().length;
  return length >= min && length <= max;
}

export type CategoryField = keyof CategoryInput;

export function validateCategoryInput(input: CategoryInput): ValidationErrors<CategoryField> {
  const errors: ValidationErrors<CategoryField> = {};
  const name = validateName(input.name);
  if (name) errors.name = name;
  if (!(CATEGORY_TYPES as readonly string[]).includes(input.type)) errors.type = 'invalid';
  if (input.icon.trim() === '') errors.icon = 'required';
  if (input.color.trim() === '') errors.color = 'required';
  return errors;
}

export type EntryField = keyof EntryInput;

export type EntryValidationContext = {
  accounts: ReadonlyMap<string, Pick<Account, 'id' | 'currency' | 'archivedAt'>>;
  categories: ReadonlyMap<string, Pick<Category, 'id' | 'type'>>;
  /** Veículos existentes; sem o mapa, a existência não é verificada (ex.: validação parcial). */
  vehicles?: ReadonlySet<string>;
  /** Empréstimos (dívidas) existentes; idem. */
  loans?: ReadonlySet<string>;
  /** Ao editar, permite manter uma conta entretanto arquivada. */
  previous?: Pick<EntryInput, 'accountId' | 'destinationAccountId'>;
};

export function validateEntryInput(
  input: EntryInput,
  context: EntryValidationContext,
): ValidationErrors<EntryField> {
  const errors: ValidationErrors<EntryField> = {};

  if (!(ENTRY_TYPES as readonly string[]).includes(input.type)) errors.type = 'invalid';

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    errors.amount = 'amountNotPositive';
  } else if (input.amount > MAX_AMOUNT_MINOR) {
    errors.amount = 'amountTooLarge';
  }

  if (input.description.trim().length > LIMITS.descriptionMaxLength) {
    errors.description = 'tooLong';
  }
  if (input.notes !== null && input.notes.length > LIMITS.notesMaxLength) {
    errors.notes = 'tooLong';
  }
  if (!isValidCalendarDate(input.date)) errors.date = 'invalidDate';

  const keepsAccount = (id: string | null) =>
    id !== null &&
    (id === context.previous?.accountId || id === context.previous?.destinationAccountId);

  const source = input.accountId ? context.accounts.get(input.accountId) : undefined;
  if (!input.accountId) errors.accountId = 'required';
  else if (!source) errors.accountId = 'accountNotFound';
  else if (source.archivedAt && !keepsAccount(input.accountId))
    errors.accountId = 'accountArchived';

  if (input.type === 'transfer') {
    if (input.categoryId !== null) errors.categoryId = 'invalid';
    const destination = input.destinationAccountId
      ? context.accounts.get(input.destinationAccountId)
      : undefined;
    if (!input.destinationAccountId) errors.destinationAccountId = 'required';
    else if (!destination) errors.destinationAccountId = 'accountNotFound';
    else if (input.destinationAccountId === input.accountId) {
      errors.destinationAccountId = 'sameAccount';
    } else if (destination.archivedAt && !keepsAccount(input.destinationAccountId)) {
      errors.destinationAccountId = 'accountArchived';
    } else if (source && source.currency !== destination.currency) {
      errors.destinationAccountId = 'currencyMismatch';
    }
  } else {
    if (input.destinationAccountId !== null) errors.destinationAccountId = 'invalid';
    const category = input.categoryId ? context.categories.get(input.categoryId) : undefined;
    if (!input.categoryId) errors.categoryId = 'categoryRequired';
    else if (!category) errors.categoryId = 'categoryNotFound';
    else if (category.type !== input.type) errors.categoryId = 'categoryTypeMismatch';
  }

  validateEntryVehicle(input, context, errors);
  validateEntryLoan(input, context, errors);
  return errors;
}

/** Normaliza texto livre antes de guardar. */
function isIntegerIn(value: number, min: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

/**
 * Ligação ao veículo (ADR-054): só despesas e rendimentos; tipo de custo obrigatório; litros só no
 * combustível; quilómetros com veículo. A coerência com outras leituras precisa dos outros
 * movimentos: ver `validateOdometerReading`.
 */
function validateEntryVehicle(
  input: EntryInput,
  context: EntryValidationContext,
  errors: ValidationErrors<EntryField>,
): void {
  const vehicleId = input.vehicleId ?? null;
  const costType = input.vehicleCostType ?? null;
  const quantity = input.quantityMilli ?? null;
  const odometer = input.odometerKm ?? null;
  if (vehicleId === null) {
    if (costType !== null) errors.vehicleCostType = 'invalid';
    if (quantity !== null) errors.quantityMilli = 'invalid';
    if (odometer !== null) errors.odometerKm = 'invalid';
    return;
  }
  if (input.type === 'transfer') errors.vehicleId = 'invalid';
  else if (context.vehicles && !context.vehicles.has(vehicleId)) errors.vehicleId = 'invalid';
  if (costType === null) errors.vehicleCostType = 'required';
  else if (!(VEHICLE_COST_TYPES as readonly string[]).includes(costType)) {
    errors.vehicleCostType = 'invalid';
  } else if (costType === 'purchase' && input.type !== 'expense') {
    // Um rendimento marcado como compra baixaria o custo de posse (ADR-054).
    errors.vehicleCostType = 'purchaseNotExpense';
  }
  if (
    quantity !== null &&
    (costType !== 'fuel' || !isIntegerIn(quantity, 1, VEHICLE_LIMITS.maxQuantityMilli))
  ) {
    errors.quantityMilli = 'invalid';
  }
  if (odometer !== null && !isIntegerIn(odometer, 0, VEHICLE_LIMITS.maxOdometerKm)) {
    errors.odometerKm = 'invalid';
  }
}

/**
 * Ligação a um empréstimo (ADR-057): prestação = despesa com capital + juros + encargos = valor;
 * desembolso = entrada sem decomposição (não é rendimento nos relatórios).
 */
function validateEntryLoan(
  input: EntryInput,
  context: EntryValidationContext,
  errors: ValidationErrors<EntryField>,
): void {
  const loanId = input.loanId ?? null;
  const role = input.loanRole ?? null;
  const parts = [input.principalAmount, input.interestAmount, input.feesAmount];
  if (loanId === null) {
    if (role !== null) errors.loanRole = 'invalid';
    if (parts.some((part) => part != null)) errors.principalAmount = 'invalid';
    return;
  }
  if (context.loans && !context.loans.has(loanId)) errors.loanId = 'invalid';
  if (role === null || !(LOAN_ROLES as readonly string[]).includes(role)) {
    errors.loanRole = 'required';
    return;
  }
  if (role === 'disbursement') {
    if (input.type !== 'income') errors.loanRole = 'invalid';
    if (parts.some((part) => part != null)) errors.principalAmount = 'invalid';
    return;
  }
  if (input.type !== 'expense') errors.loanRole = 'invalid';
  const values = parts.map((part) => part ?? 0);
  if (!values.every((value) => Number.isSafeInteger(value) && value >= 0)) {
    errors.principalAmount = 'invalid';
  } else if (values.reduce((sum, value) => sum + value, 0) !== input.amount) {
    errors.principalAmount = 'splitMismatch';
  }
}

/** Leitura incoerente: menor do que uma anterior ou maior do que uma posterior (mesmo veículo). */
export function validateOdometerReading(
  reading: { date: CalendarDate; odometerKm: number },
  others: readonly { date: CalendarDate; odometerKm: number }[],
): ValidationCode | null {
  for (const other of others) {
    if (other.date < reading.date && other.odometerKm > reading.odometerKm) {
      return 'odometerOutOfOrder';
    }
    if (other.date > reading.date && other.odometerKm < reading.odometerKm) {
      return 'odometerOutOfOrder';
    }
  }
  return null;
}

export function normalizeEntryInput(input: EntryInput): EntryInput {
  const notes = input.notes?.trim() ?? '';
  const vehicleId = input.type === 'transfer' ? null : (input.vehicleId ?? null);
  const loanId = input.type === 'transfer' ? null : (input.loanId ?? null);
  const loanRole = loanId === null ? null : (input.loanRole ?? null);
  const payment = loanRole === 'payment';
  const costType = vehicleId === null ? null : (input.vehicleCostType ?? null);
  return {
    ...input,
    description: input.description.trim(),
    notes: notes === '' ? null : notes,
    categoryId: input.type === 'transfer' ? null : input.categoryId,
    destinationAccountId: input.type === 'transfer' ? input.destinationAccountId : null,
    vehicleId,
    vehicleCostType: costType,
    quantityMilli: costType === 'fuel' ? (input.quantityMilli ?? null) : null,
    odometerKm: vehicleId === null ? null : (input.odometerKm ?? null),
    loanId,
    loanRole,
    principalAmount: payment ? (input.principalAmount ?? null) : null,
    interestAmount: payment ? (input.interestAmount ?? null) : null,
    feesAmount: payment ? (input.feesAmount ?? null) : null,
  };
}

export type BudgetField = keyof BudgetInput;

export function validateBudgetInput(input: BudgetInput): ValidationErrors<BudgetField> {
  const errors: ValidationErrors<BudgetField> = {};
  if (input.categoryId.trim() === '') errors.categoryId = 'categoryRequired';
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    errors.amount = 'amountNotPositive';
  } else if (input.amount > MAX_AMOUNT_MINOR) {
    errors.amount = 'amountTooLarge';
  }
  if (!isCurrencyCode(input.currency)) errors.currency = 'invalid';
  if (!(BUDGET_PERIODS as readonly string[]).includes(input.period)) errors.period = 'invalid';
  if (!isValidCalendarDate(input.startsOn)) errors.startsOn = 'invalidDate';
  return errors;
}

export type SubscriptionField = keyof SubscriptionInput;

export function validateSubscriptionInput(
  input: SubscriptionInput,
): ValidationErrors<SubscriptionField> {
  const errors: ValidationErrors<SubscriptionField> = {};
  if (input.name.trim() === '') errors.name = 'required';
  else if (input.name.trim().length > LIMITS.nameMaxLength) errors.name = 'tooLong';
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    errors.amount = 'amountNotPositive';
  } else if (input.amount > MAX_AMOUNT_MINOR) {
    errors.amount = 'amountTooLarge';
  }
  if (!isCurrencyCode(input.currency)) errors.currency = 'invalid';
  if (!(SUBSCRIPTION_PERIODS as readonly string[]).includes(input.period))
    errors.period = 'invalid';
  if (!(SUBSCRIPTION_STATUSES as readonly string[]).includes(input.status)) {
    errors.status = 'invalid';
  }
  if (!isValidCalendarDate(input.startsOn)) errors.startsOn = 'invalidDate';
  if (!isValidCalendarDate(input.nextOn) || input.nextOn < input.startsOn) {
    errors.nextOn = 'invalidDate';
  }
  return errors;
}

export type SavingsGoalField = keyof SavingsGoalInput;

export function validateSavingsGoalInput(
  input: SavingsGoalInput,
): ValidationErrors<SavingsGoalField> {
  const errors: ValidationErrors<SavingsGoalField> = {};
  const name = validateName(input.name);
  if (name) errors.name = name;
  if (!Number.isSafeInteger(input.targetAmount) || input.targetAmount <= 0) {
    errors.targetAmount = 'amountNotPositive';
  } else if (input.targetAmount > MAX_AMOUNT_MINOR) {
    errors.targetAmount = 'amountTooLarge';
  }
  if (!isCurrencyCode(input.currency)) errors.currency = 'invalid';
  if (input.targetOn !== null && !isValidCalendarDate(input.targetOn)) {
    errors.targetOn = 'invalidDate';
  }
  return errors;
}

export type GoalContributionField = keyof GoalContributionInput;

export function validateGoalContributionInput(
  input: GoalContributionInput,
): ValidationErrors<GoalContributionField> {
  const errors: ValidationErrors<GoalContributionField> = {};
  if (input.goalId.trim() === '') errors.goalId = 'required';
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    errors.amount = 'amountNotPositive';
  } else if (input.amount > MAX_AMOUNT_MINOR) {
    errors.amount = 'amountTooLarge';
  }
  if (!isValidCalendarDate(input.date)) errors.date = 'invalidDate';
  return errors;
}

export type WealthItemField = keyof WealthItemInput;

export function validateWealthItemInput(input: WealthItemInput): ValidationErrors<WealthItemField> {
  const errors: ValidationErrors<WealthItemField> = {};
  const name = validateName(input.name);
  if (name) errors.name = name;
  if (!(WEALTH_TYPES as readonly string[]).includes(input.type)) errors.type = 'invalid';
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    errors.amount = 'amountNotPositive';
  } else if (input.amount > MAX_AMOUNT_MINOR) {
    errors.amount = 'amountTooLarge';
  }
  if (!isCurrencyCode(input.currency)) errors.currency = 'invalid';
  if (!isValidCalendarDate(input.valuedOn)) errors.valuedOn = 'invalidDate';
  if (input.loanKind != null && !(LOAN_KINDS as readonly string[]).includes(input.loanKind)) {
    errors.loanKind = 'invalid';
  }
  for (const field of ['principalAmount', 'openingDebt', 'installmentAmount'] as const) {
    const value = input[field];
    if (value != null && !isIntegerBetween(value, 1, MAX_AMOUNT_MINOR)) {
      errors[field] = 'amountNotPositive';
    }
  }
  for (const field of ['startedOn', 'openingOn', 'endsOn'] as const) {
    const value = input[field];
    if (value != null && !isValidCalendarDate(value)) errors[field] = 'invalidDate';
  }
  if (input.interestRateBp != null && !isIntegerBetween(input.interestRateBp, 0, 100_000)) {
    errors.interestRateBp = 'invalid';
  }
  if (input.dueDay != null && !isIntegerBetween(input.dueDay, 1, 31)) errors.dueDay = 'invalid';
  if (input.institution != null && !isTextBetween(input.institution, 1, 60)) {
    errors.institution = 'invalid';
  }
  if ((input.openingDebt == null) !== (input.openingOn == null)) {
    errors.openingDebt = 'required';
  }
  if (input.origin) {
    const { amount, valuedOn } = input.origin;
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_MINOR) {
      errors.origin = amount > MAX_AMOUNT_MINOR ? 'amountTooLarge' : 'amountNotPositive';
    } else if (!isValidCalendarDate(valuedOn)) {
      errors.origin = 'invalidDate';
    } else if (valuedOn >= input.valuedOn) {
      errors.origin = 'originNotBefore';
    }
  }
  return errors;
}

export type WealthPaymentField = keyof WealthPaymentInput;

/** Valida um pagamento contra a dívida atual (as contas e categorias validam-se no movimento). */
export function validateWealthPayment(
  input: WealthPaymentInput,
  item: Pick<WealthItem, 'type' | 'amount' | 'valuedOn' | 'closedOn'>,
): ValidationErrors<WealthPaymentField> {
  const errors: ValidationErrors<WealthPaymentField> = {};
  if (!isLiabilityType(item.type) || item.closedOn) errors.principal = 'notLiability';
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) errors.amount = 'amountNotPositive';
  else if (input.amount > MAX_AMOUNT_MINOR) errors.amount = 'amountTooLarge';
  if (!Number.isSafeInteger(input.principal) || input.principal < 0) {
    errors.principal ??= 'invalid';
  } else if (input.principal > input.amount || input.principal > item.amount) {
    errors.principal ??= 'principalTooLarge';
  } else if (
    Number.isSafeInteger(input.amount) &&
    input.amount > 0 &&
    !splitPayment(input.amount, input.principal, input.interest, input.fees)
  ) {
    errors.principal ??= 'splitMismatch';
  }
  if (!isValidCalendarDate(input.date)) errors.date = 'invalidDate';
  else if (input.date < item.valuedOn) errors.date = 'dateBeforeValuation';
  return errors;
}

export type VehicleField = keyof VehicleInput;

export function validateVehicleInput(input: VehicleInput): ValidationErrors<VehicleField> {
  const errors: ValidationErrors<VehicleField> = {};
  const name = validateName(input.name);
  if (name) errors.name = name;
  if (!(VEHICLE_KINDS as readonly string[]).includes(input.kind)) errors.kind = 'invalid';
  if (input.plate !== null && (input.plate.length < 1 || input.plate.length > 16)) {
    errors.plate = 'invalid';
  }
  if (
    input.odometerKm !== null &&
    (!Number.isSafeInteger(input.odometerKm) ||
      input.odometerKm < 0 ||
      input.odometerKm > 10_000_000)
  ) {
    errors.odometerKm = 'invalid';
  }
  if (input.inspectionDue !== null && !isValidCalendarDate(input.inspectionDue)) {
    errors.inspectionDue = 'invalidDate';
  }
  if (input.insuranceDue !== null && !isValidCalendarDate(input.insuranceDue)) {
    errors.insuranceDue = 'invalidDate';
  }
  for (const field of ['make', 'model'] as const) {
    const value = input[field];
    if (value != null && (value.trim().length === 0 || value.trim().length > 40)) {
      errors[field] = 'invalid';
    }
  }
  if (input.year != null && !isIntegerIn(input.year, 1900, 2100)) errors.year = 'invalid';
  if (
    input.fuelType != null &&
    !(VEHICLE_FUEL_TYPES as readonly string[]).includes(input.fuelType)
  ) {
    errors.fuelType = 'invalid';
  }
  for (const field of ['acquiredOn', 'roadTaxDue', 'serviceDueOn'] as const) {
    const value = input[field];
    if (value != null && !isValidCalendarDate(value)) errors[field] = 'invalidDate';
  }
  if (input.purchaseAmount != null) {
    if (!isIntegerIn(input.purchaseAmount, 1, MAX_AMOUNT_MINOR)) errors.purchaseAmount = 'invalid';
    if (input.currency == null) errors.currency = 'required';
  }
  if (input.currency != null && !isCurrencyCode(input.currency)) errors.currency = 'invalid';
  if (
    input.serviceDueKm != null &&
    !isIntegerIn(input.serviceDueKm, 0, VEHICLE_LIMITS.maxOdometerKm)
  ) {
    errors.serviceDueKm = 'invalid';
  }
  if (input.notes != null && input.notes.length > LIMITS.notesMaxLength) errors.notes = 'tooLong';
  if (input.kindLabel != null) {
    const label = input.kindLabel.trim();
    if (label.length === 0) errors.kindLabel = 'required';
    else if (label.length > 30) errors.kindLabel = 'tooLong';
  }
  if (input.icon != null && (input.icon.length === 0 || input.icon.length > 40)) {
    errors.icon = 'invalid';
  }
  return errors;
}

export type DocumentField = keyof DocumentInput;

export function validateDocumentInput(input: DocumentInput): ValidationErrors<DocumentField> {
  const errors: ValidationErrors<DocumentField> = {};
  const title = input.title.trim();
  if (title.length === 0) errors.title = 'required';
  else if (title.length > 80) errors.title = 'tooLong';
  if (!(DOCUMENT_CATEGORIES as readonly string[]).includes(input.category)) {
    errors.category = 'invalid';
  }
  if (input.expiresOn !== null && !isValidCalendarDate(input.expiresOn)) {
    errors.expiresOn = 'invalidDate';
  }
  if (input.notes !== null && input.notes.length > 500) errors.notes = 'tooLong';
  if (input.attachments) {
    if (input.attachments.length > ATTACHMENT_LIMITS.perDocument) errors.attachments = 'tooLong';
    else if (!input.attachments.every(isValidAttachment)) errors.attachments = 'invalid';
  }
  if (input.acquiredOn != null && !isValidCalendarDate(input.acquiredOn)) {
    errors.acquiredOn = 'invalidDate';
  }
  if (input.amount != null) {
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0)
      errors.amount = 'amountNotPositive';
    else if (input.amount > MAX_AMOUNT_MINOR) errors.amount = 'amountTooLarge';
    if (input.currency == null) errors.currency = 'required';
  }
  if (input.currency != null && !isCurrencyCode(input.currency)) errors.currency = 'invalid';
  return errors;
}

/** Anexo aceitável: tipo permitido, tamanho entre 1 byte e 10 MB, nome curto. */
export function isValidAttachment(attachment: DocumentAttachment): boolean {
  return (
    typeof attachment.id === 'string' &&
    attachment.id.length > 0 &&
    (ATTACHMENT_MIMES as readonly string[]).includes(attachment.mime) &&
    Number.isSafeInteger(attachment.size) &&
    attachment.size > 0 &&
    attachment.size <= ATTACHMENT_LIMITS.maxBytes &&
    attachment.name.trim().length > 0 &&
    attachment.name.length <= ATTACHMENT_LIMITS.nameMaxLength
  );
}
