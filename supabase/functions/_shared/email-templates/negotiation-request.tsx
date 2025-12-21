import {
  Button,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { EmailLayout } from './layout.tsx';

interface NegotiationRequestEmailProps {
  advisorCompany: string;
  entrepreneurName: string;
  projectName: string;
  originalPrice: number;
  targetPrice?: number;
  targetReductionPercent?: number;
  globalComment?: string;
  responseUrl: string;
  locale?: 'he' | 'en';
}

export const NegotiationRequestEmail = ({
  advisorCompany = "משרד יועצים",
  entrepreneurName = "יזם",
  projectName = "פרויקט",
  originalPrice = 0,
  targetPrice,
  targetReductionPercent,
  globalComment,
  responseUrl = "https://billding.ai",
  locale = 'he',
}: NegotiationRequestEmailProps) => {
  const isHebrew = locale === 'he';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isHebrew ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const content = isHebrew ? {
    preview: `בקשה לעדכון הצעה - ${projectName}`,
    heading: 'בקשה לעדכון הצעה',
    greeting: `שלום ${advisorCompany},`,
    intro: `${entrepreneurName} מבקש עדכון להצעה לפרויקט "${projectName}".`,
    ctaButton: 'עדכון הצעה',
  } : {
    preview: `Revision Request - ${projectName}`,
    heading: 'Revision Request',
    greeting: `Hello ${advisorCompany},`,
    intro: `${entrepreneurName} is requesting an update to your proposal for "${projectName}".`,
    ctaButton: 'Update Proposal',
  };

  return (
    <EmailLayout preview={content.preview}>
      <Section style={contentStyle}>
        <Text style={heading}>{content.heading}</Text>

        <Text style={paragraph}>{content.greeting}</Text>
        <Text style={paragraph}>{content.intro}</Text>

        <Text style={detailText}>
          {isHebrew ? 'מחיר מקורי' : 'Original'}: {formatCurrency(originalPrice)}
          {targetPrice && <><br />{isHebrew ? 'מחיר יעד' : 'Target'}: {formatCurrency(targetPrice)}</>}
          {targetReductionPercent && <><br />{isHebrew ? 'הפחתה מבוקשת' : 'Reduction'}: {targetReductionPercent}%</>}
        </Text>

        {globalComment && (
          <Text style={commentText}>
            {isHebrew ? 'הערות' : 'Comments'}: {globalComment}
          </Text>
        )}

        <Section style={buttonContainer}>
          <Button style={button} href={responseUrl}>
            {content.ctaButton}
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  );
};

export default NegotiationRequestEmail;

const contentStyle = {
  padding: '24px',
};

const heading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
};

const detailText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#525252',
  margin: '16px 0',
};

const commentText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#64748b',
  margin: '12px 0',
  fontStyle: 'italic' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};
