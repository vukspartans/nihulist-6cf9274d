import { useMemo, useState } from 'react';
import { AdvisorProposal } from '@/hooks/advisor/useAdvisorProposals';

export type ProposalFilterType = 'all' | 'submitted' | 'under_review' | 'rejected';

export const useProposalFilters = (proposals: AdvisorProposal[]) => {
  const [filter, setFilter] = useState<ProposalFilterType>('all');

  const filteredProposals = useMemo(() => {
    if (filter === 'all') return proposals;
    return proposals.filter(p => p.status === filter);
  }, [proposals, filter]);

  const counts = useMemo(() => {
    return {
      all: proposals.length,
      submitted: proposals.filter(p => p.status === 'submitted').length,
      under_review: proposals.filter(p => p.status === 'under_review').length,
      rejected: proposals.filter(p => p.status === 'rejected').length,
    };
  }, [proposals]);

  return {
    filter,
    setFilter,
    filteredProposals,
    counts,
  };
};
