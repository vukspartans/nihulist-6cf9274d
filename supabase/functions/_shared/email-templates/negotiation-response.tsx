import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

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
  const direction = isHebrew ? 'rtl' : 'ltr';

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
    preview: `הצעה מעודכנת התקבלה - ${projectName}`,
    heading: '✅ הצעה מעודכנת התקבלה',
    greeting: `שלום ${entrepreneurName},`,
    intro: `${advisorCompany} שלח הצעה מעודכנת עבור פרויקט "${projectName}".`,
    previousPriceLabel: 'מחיר קודם:',
    newPriceLabel: 'מחיר חדש:',
    savingsLabel: 'חיסכון:',
    messageLabel: 'הודעה מהיועץ:',
    ctaButton: 'צפה בהצעה המעודכנת',
    footer: 'צוות Billding',
  } : {
    preview: `Updated Proposal Received - ${projectName}`,
    heading: '✅ Updated Proposal Received',
    greeting: `Hello ${entrepreneurName},`,
    intro: `${advisorCompany} has submitted an updated proposal for the project "${projectName}".`,
    previousPriceLabel: 'Previous Price:',
    newPriceLabel: 'New Price:',
    savingsLabel: 'Savings:',
    messageLabel: 'Message from Consultant:',
    ctaButton: 'View Updated Proposal',
    footer: 'Billding Team',
  };

  return (
    <Html lang={isHebrew ? 'he' : 'en'} dir={direction}>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://billding.ai/lovable-uploads/1e5c97d5-fcff-4d72-8564-66041529e61d.png"
              width="120"
              height="40"
              alt="Billding"
              style={logo}
            />
          </Section>

          <Heading style={heading}>{content.heading}</Heading>

          <Text style={paragraph}>{content.greeting}</Text>
          <Text style={paragraph}>{content.intro}</Text>

          <Section style={priceComparisonBox}>
            <div style={priceColumn}>
              <Text style={priceLabel}>{content.previousPriceLabel}</Text>
              <Text style={previousPriceValue}>{formatCurrency(previousPrice)}</Text>
            </div>
            <div style={arrowColumn}>→</div>
            <div style={priceColumn}>
              <Text style={priceLabel}>{content.newPriceLabel}</Text>
              <Text style={newPriceValue}>{formatCurrency(newPrice)}</Text>
            </div>
          </Section>

          {priceDiff > 0 && (
            <Section style={savingsBox}>
              <Text style={savingsText}>
                {content.savingsLabel} {formatCurrency(priceDiff)} ({percentChange}%)
              </Text>
            </Section>
          )}

          {consultantMessage && (
            <>
              <Text style={messageHeading}>{content.messageLabel}</Text>
              <Section style={messageBox}>
                <Text style={messageText}>{consultantMessage}</Text>
              </Section>
            </>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={proposalUrl}>
              {content.ctaButton}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>{content.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NegotiationResponseEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '20px 30px',
  borderBottom: '1px solid #e6ebf1',
};

const logo = {
  margin: '0 auto',
  display: 'block',
};

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '30px 0 20px',
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'right' as const,
  padding: '0 30px',
};

const priceComparisonBox = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '20px',
  margin: '24px 30px',
  padding: '24px',
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
};

const priceColumn = {
  textAlign: 'center' as const,
};

const arrowColumn = {
  fontSize: '24px',
  color: '#64748b',
};

const priceLabel = {
  color: '#64748b',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const previousPriceValue = {
  color: '#94a3b8',
  fontSize: '20px',
  fontWeight: '500',
  textDecoration: 'line-through',
  margin: 0,
};

const newPriceValue = {
  color: '#059669',
  fontSize: '24px',
  fontWeight: '700',
  margin: 0,
};

const savingsBox = {
  backgroundColor: '#dcfce7',
  border: '1px solid #86efac',
  borderRadius: '8px',
  margin: '0 30px 20px',
  padding: '12px 16px',
  textAlign: 'center' as const,
};

const savingsText = {
  color: '#166534',
  fontSize: '14px',
  fontWeight: '600',
  margin: 0,
};

const messageHeading = {
  color: '#1e293b',
  fontSize: '14px',
  fontWeight: '600',
  padding: '0 30px',
  marginTop: '20px',
  marginBottom: '8px',
};

const messageBox = {
  backgroundColor: '#f1f5f9',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  margin: '0 30px',
  padding: '16px',
};

const messageText = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '22px',
  margin: 0,
  fontStyle: 'italic' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#059669',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 30px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
};
