import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton, TextField } from '@/ui/components';

type Props = Omit<ComponentProps<typeof TextField>, 'secureTextEntry' | 'trailing'>;

/** Campo de palavra-passe com botão para a mostrar. */
export function PasswordField(props: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <IconButton
          icon={visible ? 'eye-off-outline' : 'eye-outline'}
          accessibilityLabel={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
          onPress={() => setVisible((current) => !current)}
        />
      }
    />
  );
}
