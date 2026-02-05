import {
  Button,
  Section,
  Text,
} from "npm:@react-email/components@0.0.31";
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
    heading: 'בקשה לעדכון הצעת מחיר',
    greeting: `שלום ${advisorCompany},`,
    intro: `היזם ${entrepreneurName} מבקש עדכון להצעת המחיר שלכם לפרויקט "${projectName}".`,
    originalLabel: 'מחיר נוכחי',
    targetLabel: 'מחיר מבוקש',
    reductionLabel: 'אחוז הפחתה מבוקש',
    commentsLabel: 'הערות היזם:',
    ctaButton: 'צפייה ועדכון ההצעה',
    urgency: 'נא להגיב בהקדם האפשרי',
  } : {
    preview: `Revision Request - ${projectName}`,
    heading: 'Proposal Revision Request',
    greeting: `Hello ${advisorCompany},`,
    intro: `${entrepreneurName} is requesting an update to your proposal for "${projectName}".`,
    originalLabel: 'Current Price',
    targetLabel: 'Target Price',
    reductionLabel: 'Requested Reduction',
    commentsLabel: 'Comments:',
    ctaButton: 'View & Update Proposal',
    urgency: 'Please respond as soon as possible',
  };

  return (
    <EmailLayout preview={content.preview}>
      <Section style={contentStyle}>
        {/* Heading */}
        <Text style={heading}>{content.heading}</Text>

        {/* Greeting */}
        <Text style={paragraph}>{content.greeting}</Text>
        
        {/* Intro */}
        <Text style={paragraph}>{content.intro}</Text>

        {/* Details Box */}
        <Section style={detailsBox}>
          <Text style={detailLabel}>{content.originalLabel}</Text>
          <Text style={detailValue}>{formatCurrency(originalPrice)}</Text>
          
          {targetPrice !== undefined && targetPrice !== null && (
            <Section>
              <Text style={detailLabel}>{content.targetLabel}</Text>
              <Text style={targetValue}>{formatCurrency(targetPrice)}</Text>
            </Section>
          )}
          
          {targetReductionPercent !== undefined && targetReductionPercent !== null && (
            <Section>
              <Text style={detailLabel}>{content.reductionLabel}</Text>
              <Text style={reductionValue}>{String(targetReductionPercent)}%</Text>
            </Section>
          )}
        </Section>

        {/* Comments Box */}
        {globalComment && (
          <Section style={commentBox}>
            <Text style={commentLabel}>{content.commentsLabel}</Text>
            <Text style={commentText}>{globalComment}</Text>
          </Section>
        )}

        {/* CTA Button */}
        <Section style={buttonContainer}>
          <Button style={button} href={responseUrl}>
            {content.ctaButton}
          </Button>
        </Section>

        {/* Urgency Text */}
        <Text style={urgencyText}>{content.urgency}</Text>
      </Section>
    </EmailLayout>
  );
};

export default NegotiationRequestEmail;

// Styles
const contentStyle = {
  padding: '24px',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
};

const heading = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '20px',
  textAlign: 'center' as const,
  direction: 'rtl' as const,
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '26px',
  color: '#333',
  marginBottom: '12px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};

const detailsBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '20px 0',
  border: '1px solid #e2e8f0',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
};

const detailLabel = {
  fontSize: '12px',
  color: '#64748b',
  marginBottom: '4px',
  textTransform: 'uppercase' as const,
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};

const detailValue = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e293b',
  marginBottom: '16px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};

const targetValue = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#059669',
  marginBottom: '16px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};

const reductionValue = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#dc2626',
  marginBottom: '8px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};

const commentBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0',
  borderRight: '4px solid #f59e0b',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
};

const commentLabel = {
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#92400e',
  marginBottom: '6px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};

const commentText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#78350f',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
  textAlign: 'right' as const,
  direction: 'rtl' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0 16px',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
  minWidth: '200px',
};

const urgencyText = {
  fontSize: '13px',
  color: '#64748b',
  textAlign: 'center' as const,
  margin: '0 0 8px',
  direction: 'rtl' as const,
};
