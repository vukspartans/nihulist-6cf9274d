import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export const EmailLayout = ({ preview, children, footer }: EmailLayoutProps) => (
  <Html dir="rtl" lang="he">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://aazakceyruefejeyhkbk.supabase.co/storage/v1/object/public/email-assets/billding-logo.png"
            width="180"
            alt="Billding"
            style={logo}
          />
        </Section>
        
        {children}
        
        <Section style={footerSection}>
          {footer || (
            <React.Fragment>
              <Text style={footerText}>
                צוות Billding - הפלטפורמה המובילה לניהול פרויקטי בנייה
              </Text>
              <Text style={footerText}>
                <Link href="https://billding.ai" style={footerLink}>
                  billding.ai
                </Link>
                {' | '}
                <Link href="mailto:support@billding.ai" style={footerLink}>
                  support@billding.ai
                </Link>
              </Text>
            </React.Fragment>
          )}
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  direction: 'rtl' as const,
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
}

const header = {
  padding: '24px 24px 0',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6ebf1',
  marginBottom: '24px',
}

const logo = {
  display: 'block' as const,
  margin: '0 auto 16px',
  maxWidth: '180px',
  height: 'auto',
}

const footerSection = {
  padding: '24px',
  borderTop: '1px solid #e6ebf1',
  marginTop: '32px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  margin: '4px 0',
}

const footerLink = {
  color: '#6772e5',
  textDecoration: 'none',
}

export default EmailLayout