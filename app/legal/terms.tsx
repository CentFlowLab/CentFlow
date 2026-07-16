import { termsDocument } from '@/lib/legal/terms.content';

import { LegalDocumentScreen } from '@/components/legal/LegalDocumentScreen';

export default function LegalTermsScreen() {
  return <LegalDocumentScreen document={termsDocument} />;
}
