import {
  Button,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { EmailLayout } from './layout.tsx';

interface NegotiationResponseEmailProps {
  entrepreneurName: string;
  advisorCompany: string;
  projectName: string;
  previousPrice: number;
  newPrice: number;
  consultantMessage?: string;
  proposalUrl: string;
  locale?: 'he' | 'en';
}

export const NegotiationResponseEmail = ({
  entrepreneurName = "יזם",
  advisorCompany = "משרד יועצים",
  projectName = "פרויקט",
  previousPrice = 0,
  newPrice = 0,
  consultantMessage,
  proposalUrl = "https://billding.ai",
  locale = 'he',
}: NegotiationResponseEmailProps) => {
  const isHebrew = locale === 'he';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isHebrew ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const priceDiff = previousPrice - newPrice;
  const percentChange = previousPrice > 0 ? Math.round((priceDiff / previousPrice) * 100) : 0;

  const content = isHebrew ? {
    preview: `הצעה מעודכנת - ${projectName}`,
    heading: 'הצעה מעודכנת התקבלה',
    greeting: `שלום ${entrepreneurName},`,
    intro: `${advisorCompany} שלח הצעה מעודכנת לפרויקט "${projectName}".`,
    ctaButton: 'צפה בהצעה',
  } : {
    preview: `Updated Proposal - ${projectName}`,
    heading: 'Updated Proposal Received',
    greeting: `Hello ${entrepreneurName},`,
    intro: `${advisorCompany} has submitted an updated proposal for "${projectName}".`,
    ctaButton: 'View Proposal',
  };

  return (
    <EmailLayout preview={content.preview}>
      <Section style={contentStyle}>
        <Text style={heading}>{content.heading}</Text>

        <Text style={paragraph}>{content.greeting}</Text>
        <Text style={paragraph}>{content.intro}</Text>

        <Text style={detailText}>
          {isHebrew ? 'מחיר קודם' : 'Previous'}: {formatCurrency(previousPrice)}<br />
          {isHebrew ? 'מחיר חדש' : 'New'}: {formatCurrency(newPrice)}
          {priceDiff > 0 && <><br />{isHebrew ? 'חיסכון' : 'Savings'}: {formatCurrency(priceDiff)} ({percentChange}%)</>}
        </Text>

        {consultantMessage && (
          <Text style={commentText}>
            {isHebrew ? 'הודעה' : 'Message'}: {consultantMessage}
          </Text>
        )}

        <Section style={buttonContainer}>
          <Button style={button} href={proposalUrl}>
            {content.ctaButton}
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  );
};

export default NegotiationResponseEmail;

const contentStyle = {
  padding: '24px',
};

const heading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#2563eb',
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
