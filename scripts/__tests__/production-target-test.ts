import {
  PRODUCTION_PROJECT_REF as STAGING_GUARD_PRODUCTION_REF,
  STAGING_PROJECT_REF as STAGING_GUARD_STAGING_REF,
} from '../staging-target';
import {
  PRODUCTION_CONFIRMATION,
  PRODUCTION_PROJECT_REF,
  STAGING_PROJECT_REF,
  ProductionTargetError,
  assertProductionCommand,
  assertProductionTarget,
} from '../production-target';

describe('production target', () => {
  it('keeps the same project refs as the staging guard', () => {
    expect(PRODUCTION_PROJECT_REF).toBe(STAGING_GUARD_PRODUCTION_REF);
    expect(STAGING_PROJECT_REF).toBe(STAGING_GUARD_STAGING_REF);
  });

  it('accepts only the production project', () => {
    expect(() => assertProductionTarget(PRODUCTION_PROJECT_REF)).not.toThrow();
    expect(() =>
      assertProductionTarget(`https://${PRODUCTION_PROJECT_REF}.supabase.co`),
    ).not.toThrow();
  });

  it('rejects staging, another project, and an empty target', () => {
    for (const target of [
      '',
      '   ',
      STAGING_PROJECT_REF,
      `https://${STAGING_PROJECT_REF}.supabase.co`,
      'outro-projeto',
      `${PRODUCTION_PROJECT_REF} ${STAGING_PROJECT_REF}`,
    ]) {
      expect(() => assertProductionTarget(target)).toThrow(ProductionTargetError);
    }
  });

  it('requires the explicit confirmation and refuses any other destination', () => {
    expect(() =>
      assertProductionCommand([`--remote=${PRODUCTION_PROJECT_REF}`, PRODUCTION_CONFIRMATION], {}),
    ).not.toThrow();
    expect(() => assertProductionCommand([PRODUCTION_PROJECT_REF], {})).toThrow(
      ProductionTargetError,
    );
    expect(() => assertProductionCommand([PRODUCTION_CONFIRMATION], {})).toThrow(
      ProductionTargetError,
    );
    expect(() =>
      assertProductionCommand([STAGING_PROJECT_REF, PRODUCTION_CONFIRMATION], {}),
    ).toThrow(ProductionTargetError);
    expect(() =>
      assertProductionCommand([`--remote=${PRODUCTION_PROJECT_REF}`, PRODUCTION_CONFIRMATION], {
        EXPO_PUBLIC_SUPABASE_URL: `https://${STAGING_PROJECT_REF}.supabase.co`,
      }),
    ).toThrow(ProductionTargetError);
  });
});
