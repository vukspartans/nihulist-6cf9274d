import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
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
            src="https://aazakceyruefejeyhkbk.supabase.co/storage/v1/object/public/advisor-assets/nihulist-logo.png"
            width="120"
            height="40"
            alt="Nihulist"
            style={logo}
          />
        </Section>
        
        {children}
        
        <Section style={footerSection}>
          {footer || (
            <>
              <Text style={footerText}>
                צוות ניהוליסט - הפלטפורמה המובילה לניהול פרויקטי בנייה
              </Text>
              <Text style={footerText}>
                <Link href="https://www.nihulist.co.il" style={footerLink}>
                  nihulist.co.il
                </Link>
                {' | '}
                <Link href="mailto:support@nihulist.co.il" style={footerLink}>
                  support@nihulist.co.il
                </Link>
              </Text>
            </>
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
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '24px 24px 0',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6ebf1',
  marginBottom: '24px',
}

const logo = {
  margin: '0 auto 16px',
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
