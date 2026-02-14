import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentStatusDefinition, SignatureType } from '@/types/paymentStatus';

export interface NextStep {
  code: string;
  name: string;
  requiresSignature: boolean;
  signatureType: SignatureType;
  color: string;
}

export function useApprovalChain() {
  const [statuses, setStatuses] = useState<PaymentStatusDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('payment_status_definitions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching payment status definitions:', error);
      } else {
        setStatuses((data as PaymentStatusDefinition[]) || []);
      }
      setIsLoading(false);
    };
    fetch();
  }, []);

  const getNextStep = useCallback(
    (currentCode: string): NextStep | null => {
      const currentIndex = statuses.findIndex((s) => s.code === currentCode);
      if (currentIndex === -1) return null;

      // Find the next non-terminal status after the current one
      for (let i = currentIndex + 1; i < statuses.length; i++) {
        const s = statuses[i];
        if (!s.is_terminal) {
          return {
            code: s.code,
            name: s.name,
            requiresSignature: s.requires_signature,
            signatureType: s.signature_type,
            color: s.color,
          };
        }
      }
      return null;
    },
    [statuses],
  );

  const isTerminal = useCallback(
    (code: string): boolean => {
      const s = statuses.find((st) => st.code === code);
      return s?.is_terminal ?? false;
    },
    [statuses],
  );

  const currentStepIndex = useCallback(
    (code: string): number => {
      const nonTerminal = statuses.filter((s) => !s.is_terminal);
      return nonTerminal.findIndex((s) => s.code === code);
    },
    [statuses],
  );

  const totalSteps = useMemo(
    () => statuses.filter((s) => !s.is_terminal).length,
    [statuses],
  );

  const getStatusByCode = useCallback(
    (code: string) => statuses.find((s) => s.code === code) ?? null,
    [statuses],
  );

  return {
    statuses,
    getNextStep,
    isTerminal,
    isLoading,
    currentStepIndex,
    totalSteps,
    getStatusByCode,
  };
}
