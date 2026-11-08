import {
  STAGING_PROJECT_REF,
  StagingTargetError,
  assertStagingCommand,
  assertStagingTarget,
} from '../staging-target';

describe('staging target', () => {
  it('accepts only the staging project', () => {
    expect(() => assertStagingTarget(STAGING_PROJECT_REF)).not.toThrow();
    expect(() => assertStagingTarget(`https://${STAGING_PROJECT_REF}.supabase.co`)).not.toThrow();
  });

  it('rejects production, another project, and an empty target', () => {
    for (const target of [
      '',
      '   ',
      'slfgslfzolfvqavuccom',
      'https://slfgslfzolfvqavuccom.supabase.co',
      'db.slfgslfzolfvqavuccom.supabase.co',
      'outro-projeto',
      `${STAGING_PROJECT_REF} slfgslfzolfvqavuccom`,
    ]) {
      expect(() => assertStagingTarget(target)).toThrow(StagingTargetError);
    }
  });

  it('rejects a staging argument when the inherited app URL is production', () => {
    expect(() => assertStagingCommand([STAGING_PROJECT_REF], {})).not.toThrow();
    expect(() =>
      assertStagingCommand([STAGING_PROJECT_REF], {
        EXPO_PUBLIC_SUPABASE_URL: 'https://slfgslfzolfvqavuccom.supabase.co',
      }),
    ).toThrow(StagingTargetError);
    expect(() => assertStagingCommand([], {})).toThrow(StagingTargetError);
  });
});
