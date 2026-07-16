import { privacyPolicyDocument } from '@/lib/legal/privacy-policy.content';

import { LegalDocumentScreen } from '@/components/legal/LegalDocumentScreen';

export default function LegalPrivacyScreen() {
  return <LegalDocumentScreen document={privacyPolicyDocument} />;
}
