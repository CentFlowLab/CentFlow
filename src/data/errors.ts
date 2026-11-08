export class NotFoundError extends Error {
  constructor(
    readonly entity: 'account' | 'category' | 'entry',
    readonly id: string,
  ) {
    super(`${entity} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

/** A conta tem movimentos; a interface deve propor arquivar ou eliminar com os movimentos. */
export class AccountInUseError extends Error {
  constructor(readonly entryCount: number) {
    super(`Account has ${entryCount} entries`);
    this.name = 'AccountInUseError';
  }
}

/** A categoria tem movimentos e não foi indicada uma categoria de destino válida. */
export class CategoryInUseError extends Error {
  constructor(readonly entryCount: number) {
    super(`Category has ${entryCount} entries`);
    this.name = 'CategoryInUseError';
  }
}
