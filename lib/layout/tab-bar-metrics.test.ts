import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTabBarBottomInset } from '@/lib/layout/tab-bar-metrics';

test('resolveTabBarBottomInset usa insets.bottom no iOS', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'ios',
      insetsBottom: 34,
      screenHeight: 844,
      windowHeight: 844,
    }),
    34,
  );
});

test('resolveTabBarBottomInset usa gap screen-window no Android', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 752,
    }),
    48,
  );
});

test('resolveTabBarBottomInset prefere insets.bottom quando maior que gap', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 48,
      screenHeight: 800,
      windowHeight: 776,
    }),
    48,
  );
});

test('resolveTabBarBottomInset fallback mínimo 8px quando sem medição', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 800,
    }),
    8,
  );
});

test('resolveTabBarBottomInset não usa constante fixa 64px', () => {
  const inset = resolveTabBarBottomInset({
    platform: 'android',
    insetsBottom: 24,
    screenHeight: 800,
    windowHeight: 776,
  });
  assert.equal(inset, 24);
  assert.notEqual(inset, 64);
});
