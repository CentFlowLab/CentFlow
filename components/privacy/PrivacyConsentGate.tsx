import { useCallback, useEffect, useState } from 'react';

import { PrivacyConsentModal } from '@/components/privacy/PrivacyConsentModal';
import {
  hasPrivacyConsentDecision,
  loadPrivacyConsent,
  savePrivacyConsent,
} from '@/lib/privacy/consent.storage';
import { bootstrapSentryFromConsent } from '@/lib/sentry/init';

type PrivacyConsentGateProps = {
  children: React.ReactNode;
};

/**
 * Primeira abertura: pede consentimento para telemetria opcional.
 * Essencial (sessão, sync, Doctor beta) não depende deste modal.
 */
export function PrivacyConsentGate({ children }: PrivacyConsentGateProps) {
  const [ready, setReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productAnalytics, setProductAnalytics] = useState(false);
  const [crashReporting, setCrashReporting] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const record = await loadPrivacyConsent();
      if (!mounted) return;

      if (record) {
        setProductAnalytics(record.productAnalytics);
        setCrashReporting(record.crashReporting);
        bootstrapSentryFromConsent();
        setReady(true);
        return;
      }

      setShowModal(true);
      setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    try {
      await savePrivacyConsent({ productAnalytics, crashReporting });
      bootstrapSentryFromConsent();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }, [crashReporting, productAnalytics]);

  if (!ready) {
    return null;
  }

  return (
    <>
      {children}
      <PrivacyConsentModal
        visible={showModal && !hasPrivacyConsentDecision()}
        productAnalytics={productAnalytics}
        crashReporting={crashReporting}
        onProductAnalyticsChange={setProductAnalytics}
        onCrashReportingChange={setCrashReporting}
        onConfirm={() => void handleConfirm()}
        saving={saving}
      />
    </>
  );
}
