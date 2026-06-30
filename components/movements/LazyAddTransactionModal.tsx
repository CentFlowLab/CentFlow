import { useEffect, useState, type ComponentType } from 'react';

type AddTransactionModalModule = typeof import('./AddTransactionModal');
type AddTransactionModalProps = AddTransactionModalModule['AddTransactionModal'] extends ComponentType<
  infer P
>
  ? P
  : never;

export function LazyAddTransactionModal(props: AddTransactionModalProps) {
  const [Modal, setModal] = useState<ComponentType<AddTransactionModalProps> | null>(null);

  useEffect(() => {
    if (!props.visible || Modal) return;
    void import('./AddTransactionModal').then((module) => {
      setModal(() => module.AddTransactionModal);
    });
  }, [Modal, props.visible]);

  if (!Modal) return null;
  return <Modal {...props} />;
}
