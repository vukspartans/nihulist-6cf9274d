import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

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
  const direction = isHebrew ? 'rtl' : 'ltr';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isHebrew ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const content = isHebrew ? {
    preview: `בקשה לעדכון הצעת מחיר - ${projectName}`,
    heading: '📋 בקשה לעדכון הצעת מחיר',
    greeting: `שלום ${advisorCompany},`,
    intro: `${entrepreneurName} מבקש עדכון להצעת המחיר שהגשת עבור פרויקט "${projectName}".`,
    originalPriceLabel: 'מחיר מקורי:',
    targetPriceLabel: 'מחיר יעד:',
    reductionLabel: 'הפחתה מבוקשת:',
    commentsLabel: 'הערות היזם:',
    ctaButton: 'צפה בבקשה ועדכן הצעה',
    footer: 'צוות Billding',
  } : {
    preview: `Request for Revised Proposal - ${projectName}`,
    heading: '📋 Request for Revised Proposal',
    greeting: `Hello ${advisorCompany},`,
    intro: `${entrepreneurName} is requesting an update to your proposal for the project "${projectName}".`,
    originalPriceLabel: 'Original Price:',
    targetPriceLabel: 'Target Price:',
    reductionLabel: 'Requested Reduction:',
    commentsLabel: 'Initiator Comments:',
    ctaButton: 'View Request and Update Proposal',
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

          <Section style={priceBox}>
            <Text style={priceRow}>
              <span style={priceLabel}>{content.originalPriceLabel}</span>
              <span style={priceValue}>{formatCurrency(originalPrice)}</span>
            </Text>
            {targetPrice && (
              <Text style={priceRow}>
                <span style={priceLabel}>{content.targetPriceLabel}</span>
                <span style={targetPriceValue}>{formatCurrency(targetPrice)}</span>
              </Text>
            )}
            {targetReductionPercent && (
              <Text style={priceRow}>
                <span style={priceLabel}>{content.reductionLabel}</span>
                <span style={reductionValue}>{targetReductionPercent}%</span>
              </Text>
            )}
          </Section>

          {globalComment && (
            <>
              <Text style={commentsHeading}>{content.commentsLabel}</Text>
              <Section style={commentsBox}>
                <Text style={commentText}>{globalComment}</Text>
              </Section>
            </>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={responseUrl}>
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

export default NegotiationRequestEmail;

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

const priceBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  margin: '20px 30px',
  padding: '20px',
};

const priceRow = {
  display: 'flex',
  justifyContent: 'space-between',
  margin: '8px 0',
  fontSize: '16px',
};

const priceLabel = {
  color: '#64748b',
};

const priceValue = {
  color: '#1e293b',
  fontWeight: '600',
};

const targetPriceValue = {
  color: '#059669',
  fontWeight: '700',
  fontSize: '18px',
};

const reductionValue = {
  color: '#dc2626',
  fontWeight: '600',
};

const commentsHeading = {
  color: '#1e293b',
  fontSize: '14px',
  fontWeight: '600',
  padding: '0 30px',
  marginTop: '20px',
  marginBottom: '8px',
};

const commentsBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  margin: '0 30px',
  padding: '16px',
};

const commentText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '22px',
  margin: 0,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#2563eb',
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
