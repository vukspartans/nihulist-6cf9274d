import Logo from '@/components/Logo';
import { UserHeader } from '@/components/UserHeader';

export const AdvisorDashboardHeader = () => {
  return (
    <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Logo />
          <UserHeader />
        </div>
      </div>
    </div>
  );
};