import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface RFPInvitationEmailProps {
  advisorName: string
  companyName: string
  projectName: string
  projectType: string
  projectLocation: string
  deadlineDate: string
  requestTitle?: string
  requestContent?: string
  requestFiles?: Array<{ name: string; url: string }>
  loginUrl: string
}

export const RFPInvitationEmail = ({
  advisorName,
  companyName,
  projectName,
  projectType,
  projectLocation,
  deadlineDate,
  requestTitle,
  requestContent,
  requestFiles,
  loginUrl,
}: RFPInvitationEmailProps) => (
  <EmailLayout preview={`הזמנה להגשת הצעת מחיר עבור ${projectName}`}>
    <Section style={content}>
      <Heading style={h1}>הזמנה להגשת הצעת מחיר</Heading>
      
      <Text style={text}>
        שלום {advisorName ? advisorName : companyName},
      </Text>
      
      <Text style={text}>
        נשמח לקבל ממכם הצעת מחיר עבור הפרויקט הבא:
      </Text>
      
      <Section style={projectCard}>
        <Heading as="h2" style={h2}>
          {projectName}
        </Heading>
        <Text style={projectDetail}>
          <strong>סוג הפרויקט:</strong> {projectType}
        </Text>
        <Text style={projectDetail}>
          <strong>מיקום:</strong> {projectLocation}
        </Text>
        <Text style={projectDetail}>
          <strong>מועד אחרון להגשה:</strong> {deadlineDate}
        </Text>
      </Section>
      
      {requestTitle && (
        <Heading as="h3" style={h3}>
          {requestTitle}
        </Heading>
      )}
      
      {requestContent && (
        <Section style={requestSection}>
          <Text style={requestText}>
            {requestContent}
          </Text>
        </Section>
      )}
      
      {requestFiles && requestFiles.length > 0 && (
        <Section style={filesSection}>
          <Text style={filesHeader}>קבצים מצורפים:</Text>
          {requestFiles.map((file, index) => (
            <Text key={index} style={fileItem}>
              <Link href={file.url} style={fileLink}>{file.name}</Link>
            </Text>
          ))}
        </Section>
      )}
      
      <Hr style={hr} />
      
      <Section style={ctaSection}>
        <Text style={ctaText}>
          להגשת ההצעה, נא להיכנס למערכת:
        </Text>
        <Button
          href={loginUrl}
          style={button}
        >
          כניסה למערכת להגשת הצעה
        </Button>
      </Section>
      
      <Text style={helpText}>
        לא מעוניינים להגיש הצעה?{' '}
        <Link href={loginUrl} style={link}>
          לסירוב מנומק
        </Link>
      </Text>
      
      <Hr style={hr} />
      
      <Text style={footerNote}>
        <strong>לתשומת לבכם:</strong> הצעה שתוגש לאחר המועד האחרון לא תובא בחשבון.
      </Text>
    </Section>
  </EmailLayout>
)

const content = {
  padding: '0 24px',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '24px 0',
  textAlign: 'center' as const,
  direction: 'rtl' as const,
}

const h2 = {
  color: '#1a1a1a',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '8px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const h3 = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '20px 0 12px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const text = {
  color: '#525252',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '12px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const projectCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const projectDetail = {
  color: '#525252',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '8px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const requestSection = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const requestText = {
  color: '#78350f',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const filesSection = {
  margin: '20px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const filesHeader = {
  color: '#1a1a1a',
  fontSize: '15px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const fileItem = {
  color: '#525252',
  fontSize: '14px',
  margin: '4px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const fileLink = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
  direction: 'rtl' as const,
}

const ctaText = {
  color: '#525252',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 16px',
  textAlign: 'center' as const,
  direction: 'rtl' as const,
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '14px 28px',
  direction: 'rtl' as const,
}

const helpText = {
  color: '#64748b',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '16px 0',
  direction: 'rtl' as const,
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const footerNote = {
  color: '#64748b',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '16px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

export default RFPInvitationEmail
