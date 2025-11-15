import { AdvisorProposal } from '@/hooks/advisor/useAdvisorProposals';
import { ProposalCard } from '@/components/advisor/shared/ProposalCard';
import { EmptyState } from '@/components/advisor/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { ProposalFilterType } from '@/hooks/shared/useProposalFilters';

interface ProposalsTabProps {
  proposals: AdvisorProposal[];
  filter: ProposalFilterType;
  onFilterChange: (filter: ProposalFilterType) => void;
  counts: {
    all: number;
    submitted: number;
    under_review: number;
    rejected: number;
  };
  onViewProject: (projectId: string) => void;
}

export const ProposalsTab = ({
  proposals,
  filter,
  onFilterChange,
  counts,
  onViewProject,
}: ProposalsTabProps) => {
  const filterButtons: { label: string; value: ProposalFilterType; count: number }[] = [
    { label: 'הכל', value: 'all', count: counts.all },
    { label: 'הוגשו', value: 'submitted', count: counts.submitted },
    { label: 'בבדיקה', value: 'under_review', count: counts.under_review },
    { label: 'נדחו', value: 'rejected', count: counts.rejected },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            variant={filter === btn.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(btn.value)}
          >
            {btn.label} ({btn.count})
          </Button>
        ))}
      </div>

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="אין הצעות מחיר"
          description={
            filter === 'all'
              ? 'עדיין לא הגשת הצעות מחיר.'
              : `אין הצעות מחיר עם סטטוס "${filterButtons.find(b => b.value === filter)?.label}".`
          }
        />
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              onViewProject={onViewProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};
