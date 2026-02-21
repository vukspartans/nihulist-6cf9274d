import {
  Button,
  Section,
  Text,
} from "npm:@react-email/components@0.0.31";
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

  return (
    <EmailLayout preview={isHebrew ? `הצעה מעודכנת - ${projectName}` : `Updated Proposal - ${projectName}`}>
      <Section style={contentStyle}>
        <Text style={heading}>{isHebrew ? 'הצעה מעודכנת התקבלה' : 'Updated Proposal Received'}</Text>

        <Text style={paragraph}>
          {isHebrew ? `שלום ${entrepreneurName},` : `Hello ${entrepreneurName},`}
        </Text>
        <Text style={paragraph}>
          {isHebrew ? 'התקבלה הצעה מעודכנת. להלן הפרטים:' : 'An updated proposal has been received. Details below:'}
        </Text>

        <Section style={detailsBox}>
          <table dir={isHebrew ? "rtl" : "ltr"} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tr>
              <td style={labelCell}>{isHebrew ? 'פרויקט' : 'Project'}</td>
              <td style={valueCell}>{projectName}</td>
            </tr>
            <tr>
              <td style={labelCell}>{isHebrew ? 'משרד' : 'Firm'}</td>
              <td style={valueCell}>{advisorCompany}</td>
            </tr>
            <tr>
              <td style={labelCell}>{isHebrew ? 'מחיר קודם' : 'Previous'}</td>
              <td style={valueCell}>{formatCurrency(previousPrice)}</td>
            </tr>
            <tr>
              <td style={labelCell}>{isHebrew ? 'מחיר חדש' : 'New'}</td>
              <td style={newPriceCell}>{formatCurrency(newPrice)}</td>
            </tr>
            {priceDiff > 0 ? (
              <tr>
                <td style={labelCell}>{isHebrew ? 'חיסכון' : 'Savings'}</td>
                <td style={savingsCell}>{formatCurrency(priceDiff)} ({percentChange}%)</td>
              </tr>
            ) : null}
          </table>
        </Section>

        {consultantMessage && (
          <Section style={commentBox}>
            <Text style={commentLabel}>{isHebrew ? 'הודעת היועץ:' : 'Message:'}</Text>
            <Text style={commentText}>{consultantMessage}</Text>
          </Section>
        )}

        <Section style={buttonContainer}>
          <Button style={button} href={proposalUrl}>
            {isHebrew ? 'צפה בהצעה' : 'View Proposal'}
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  );
};

export default NegotiationResponseEmail;

const contentStyle = {
  padding: '24px',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
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
  textAlign: 'right' as const,
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const labelCell = {
  fontSize: '14px',
  color: '#6b7280',
  padding: '6px 0',
  textAlign: 'right' as const,
  width: '100px',
  verticalAlign: 'top' as const,
};

const valueCell = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '600' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
};

const newPriceCell = {
  fontSize: '14px',
  color: '#059669',
  fontWeight: '700' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
};

const savingsCell = {
  fontSize: '14px',
  color: '#059669',
  fontWeight: '600' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
};

const commentBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0',
  borderRight: '4px solid #f59e0b',
};

const commentLabel = {
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#92400e',
  marginBottom: '6px',
  textAlign: 'right' as const,
};

const commentText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#78350f',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
  textAlign: 'right' as const,
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
  padding: '14px 40px',
  minWidth: '200px',
};
