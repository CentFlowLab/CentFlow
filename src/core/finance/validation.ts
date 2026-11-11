import { isCurrencyCode, MAX_AMOUNT_MINOR } from '../money';
import { isValidCalendarDate } from './dates';
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
  VEHICLE_KINDS,
  DOCUMENT_CATEGORIES,
  type SubscriptionInput,
  type Category,
  type CategoryInput,
  type EntryInput,
} from './types';
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
  | 'notLiability';

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
  return errors;
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

  return errors;
}

/** Normaliza texto livre antes de guardar. */
export function normalizeEntryInput(input: EntryInput): EntryInput {
  const notes = input.notes?.trim() ?? '';
  return {
    ...input,
    description: input.description.trim(),
    notes: notes === '' ? null : notes,
    categoryId: input.type === 'transfer' ? null : input.categoryId,
    destinationAccountId: input.type === 'transfer' ? input.destinationAccountId : null,
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
  if (!Number.isSafeInteger(input.principal) || input.principal <= 0) {
    errors.principal ??= 'amountNotPositive';
  } else if (input.principal > input.amount || input.principal > item.amount) {
    errors.principal ??= 'principalTooLarge';
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
  return errors;
}
