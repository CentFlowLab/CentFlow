# Permissões — CentFlow

Permissões declaradas e justificações para revisão App Store / Play Store.

> **Aviso legal:** Textos de permissão e políticas legais requerem revisão jurídica.

---

## iOS (Info.plist / plugins Expo)

| Permissão | Plugin / origem | Texto ao utilizador | Uso na app |
|-----------|-----------------|---------------------|------------|
| **Câmara** | `expo-image-picker` | «A CentFlow precisa de acesso à câmara para digitalizar talões.» | Capturar fotos de talões para OCR e anexos |
| **Fotos** | `expo-image-picker` | «A CentFlow precisa de acesso às tuas fotos para anexar talões e faturas.» | Seleccionar imagens da galeria para OCR/anexos |
| **Face ID** | `expo-local-authentication` | «A CentFlow usa Face ID para proteger os teus dados financeiros.» | Desbloqueio da app com biometria (opcional) |
| **Notificações** | `expo-notifications` | Pedido runtime ao activar lembretes | Lembretes de créditos, calendário, sync Open Banking |
| **Sign in with Apple** | `expo-apple-authentication` | Sheet nativo Apple | Autenticação (iOS) |

### iOS — não declarado / não usado

- Microfone / gravação de áudio
- Localização
- Bluetooth
- Contactos
- Calendário do sistema (a app tem calendário financeiro interno, não acede ao calendário iOS)

---

## Android (`app.json` + plugins)

| Permissão | Origem | Uso na app |
|-----------|--------|------------|
| `android.permission.CAMERA` | `app.json` + `expo-image-picker` | Digitalizar talões |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | `expo-local-authentication` (automático) | Desbloqueio biométrico |
| Notificações | `expo-notifications` | Lembretes e sync |

### Android — removido

| Permissão | Estado |
|-----------|--------|
| `RECORD_AUDIO` | **Removido** — não presente em `app.json` actual; sem uso no código |

---

## Permissões implícitas (sem prompt)

| Capacidade | Detalhe |
|------------|---------|
| Internet | Comunicação Supabase, OCR, Open Banking, assistente |
| Armazenamento seguro | SecureStore / Keychain para token, biometria, consentimento |
| Partilha de ficheiros | `expo-sharing` para export PDF/JSON |

---

## Declarações para revisores

1. **Câmara e fotos** — só activadas quando o utilizador inicia digitalização de talão ou escolhe anexo; não há captura em segundo plano.
2. **Face ID** — opcional, activável em Definições → Segurança; pode usar PIN como alternativa.
3. **Notificações** — opcionais; gates específicos (créditos, calendário, Open Banking) pedem permissão no momento relevante.
4. **Microfone** — não utilizado; permissão `RECORD_AUDIO` removida do manifest Android.

---

## Encriptação (App Store)

`ITSAppUsesNonExemptEncryption: false` — apenas TLS standard; sem criptografia proprietária sujeita a export compliance adicional.

## Contacto

privacy@centflow.app
