import { useEffect, useState, type ComponentType } from 'react';

type QuickExpenseSheetModule = typeof import('./QuickExpenseSheet');
type QuickExpenseSheetProps = QuickExpenseSheetModule['QuickExpenseSheet'] extends ComponentType<infer P>
  ? P
  : never;

export function LazyQuickExpenseSheet(props: QuickExpenseSheetProps) {
  const [Sheet, setSheet] = useState<ComponentType<QuickExpenseSheetProps> | null>(null);

  useEffect(() => {
    if (!props.visible || Sheet) return;
    void import('./QuickExpenseSheet').then((module) => {
      setSheet(() => module.QuickExpenseSheet);
    });
  }, [Sheet, props.visible]);

  if (!Sheet) return null;
  return <Sheet {...props} />;
}
