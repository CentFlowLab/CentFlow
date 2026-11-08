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
  type SubscriptionInput,
  type Category,
  type CategoryInput,
  type EntryInput,
} from './types';

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
  | 'duplicateCategory';

export type ValidationErrors<Field extends string> = Partial<Record<Field, ValidationCode>>;

export class ValidationError<Field extends string = string> extends Error {
  constructor(readonly errors: ValidationErrors<Field>) {
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
