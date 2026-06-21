import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANDROID_MIN_BOTTOM_INSET,
  ANDROID_TAB_BAR_GESTURE_MAX,
  ANDROID_TAB_BAR_INSET_MAX,
  ANDROID_TAB_BAR_INSET_MIN,
  resolveBottomActionPadding,
  resolveModalBottomPadding,
  resolveNavigationBarInset,
  resolveSheetBottomPadding,
  resolveTabBarBottomInset,
} from '@/lib/layout/safe-area';

test('resolveNavigationBarInset usa insets.bottom no iOS', () => {
  assert.equal(
    resolveNavigationBarInset({
      platform: 'ios',
      insetsBottom: 34,
      screenHeight: 844,
      windowHeight: 844,
    }),
    34,
  );
});

test('resolveNavigationBarInset usa gap screen-window no Android', () => {
  assert.equal(
    resolveNavigationBarInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 752,
    }),
    48,
  );
});

test('resolveTabBarBottomInset faz clamp no Android', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 48,
      screenHeight: 800,
      windowHeight: 752,
    }),
    ANDROID_TAB_BAR_INSET_MAX,
  );
});

test('resolveTabBarBottomInset respeita inset moderado', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 16,
      screenHeight: 800,
      windowHeight: 784,
    }),
    16,
  );
});

test('resolveTabBarBottomInset fallback mínimo Android', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 800,
    }),
    ANDROID_TAB_BAR_INSET_MIN,
  );
});

test('resolveTabBarBottomInset prefere insets.bottom e não soma gap', () => {
  // inset 20 é tratado como gestos (< limiar 3 botões) e clampado ao máx de
  // gestos (18). O importante: não soma o gap (não devolve 20+48).
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 20,
      screenHeight: 800,
      windowHeight: 752,
    }),
    ANDROID_TAB_BAR_GESTURE_MAX,
  );
});

test('resolveBottomActionPadding inclui extra acima da nav bar', () => {
  assert.equal(resolveBottomActionPadding(48, 16), 64);
});

test('resolveModalBottomPadding garante margem para botões', () => {
  const padding = resolveModalBottomPadding(48);
  assert.ok(padding >= 48 + 20);
});

test('resolveSheetBottomPadding respeita navigation bar', () => {
  const padding = resolveSheetBottomPadding(48);
  assert.ok(padding >= 48 + 8);
});

test('resolveNavigationBarInset fallback mínimo Android', () => {
  assert.equal(
    resolveNavigationBarInset({
      platform: 'android',
      insetsBottom: 0,
      screenHeight: 800,
      windowHeight: 800,
    }),
    ANDROID_MIN_BOTTOM_INSET,
  );
});
