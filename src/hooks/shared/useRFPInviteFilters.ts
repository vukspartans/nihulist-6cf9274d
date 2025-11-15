import { useMemo, useState } from 'react';
import { RFPInvite } from '@/hooks/advisor/useAdvisorRFPInvites';

export const useRFPInviteFilters = (invites: RFPInvite[]) => {
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const filteredInvites = useMemo(() => {
    if (!showActiveOnly) return invites;
    return invites.filter(
      invite => !['declined', 'submitted', 'expired'].includes(invite.status)
    );
  }, [invites, showActiveOnly]);

  const counts = useMemo(() => {
    const activeStatuses = ['sent', 'opened', 'in_progress'];
    return {
      total: invites.length,
      active: invites.filter(i => activeStatuses.includes(i.status)).length,
      new: invites.filter(i => i.status === 'sent').length,
      unsubmitted: invites.filter(i => 
        activeStatuses.includes(i.status) && 
        !invites.some(p => p.rfp_id === i.rfp_id && p.status === 'submitted')
      ).length,
    };
  }, [invites]);

  return {
    showActiveOnly,
    setShowActiveOnly,
    filteredInvites,
    counts,
  };
};
