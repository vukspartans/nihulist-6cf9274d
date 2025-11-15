import { AdvisorProposal } from '@/hooks/advisor/useAdvisorProposals';
import { WinningProposalCard } from '@/components/advisor/shared/WinningProposalCard';
import { EmptyState } from '@/components/advisor/shared/EmptyState';
import { Trophy } from 'lucide-react';

interface WinningProposalsTabProps {
  proposals: AdvisorProposal[];
  onViewProject: (projectId: string) => void;
}

export const WinningProposalsTab = ({
  proposals,
  onViewProject,
}: WinningProposalsTabProps) => {
  const winningProposals = proposals.filter(
    p => p.status === 'accepted' && p.project_advisors && p.project_advisors.length > 0
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">
        הצעות זוכות ({winningProposals.length})
      </h3>

      {winningProposals.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="אין הצעות זוכות"
          description="עדיין לא זכית בפרויקטים. המשך להגיש הצעות מחיר איכותיות!"
        />
      ) : (
        <div className="grid gap-4">
          {winningProposals.map((proposal) => (
            <WinningProposalCard
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
