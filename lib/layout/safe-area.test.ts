import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANDROID_MIN_BOTTOM_INSET,
  ANDROID_NAV_BUFFER,
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

test('resolveTabBarBottomInset adiciona buffer Android', () => {
  assert.equal(
    resolveTabBarBottomInset({
      platform: 'android',
      insetsBottom: 24,
      screenHeight: 800,
      windowHeight: 776,
    }),
    24 + ANDROID_NAV_BUFFER,
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
    ANDROID_MIN_BOTTOM_INSET,
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
