import {
  Button,
  Link,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.31'
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
  <EmailLayout preview={`הזמנה להגשת הצעה - ${projectName}`}>
    <Section style={content}>
      <Text style={greeting}>
        שלום {advisorName ? advisorName : companyName},
      </Text>
      
      <Text style={text}>
        נשמח לקבל ממכם הצעת מחיר לפרויקט <strong>{projectName}</strong> ({projectType}, {projectLocation}).
      </Text>
      
      <Text style={text}>
        מועד אחרון להגשה: <strong>{deadlineDate}</strong>
      </Text>
      
      {requestTitle && (
        <Text style={requestTitleStyle}>
          {requestTitle}
        </Text>
      )}
      
      {requestContent && (
        <Text style={requestText}>
          {requestContent}
        </Text>
      )}
      
      {requestFiles && requestFiles.length > 0 && (
        <Text style={filesText}>
          קבצים מצורפים: {requestFiles.map((file, index) => (
            <React.Fragment key={index}>
              <Link href={file.url} style={fileLink}>{file.name}</Link>
              {index < requestFiles.length - 1 ? ', ' : ''}
            </React.Fragment>
          ))}
        </Text>
      )}
      
      <Section style={ctaSection}>
        <Button href={loginUrl} style={button}>
          התחברו למתן הצעה
        </Button>
      </Section>
      
      <Text style={declineText}>
        <Link href={loginUrl} style={link}>לסירוב מנומק</Link>
      </Text>
    </Section>
  </EmailLayout>
)

const content = {
  padding: '0 24px',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
}

const greeting = {
  color: '#1a1a1a',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '24px 0 12px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const text = {
  color: '#525252',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '12px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const requestTitleStyle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '600',
  margin: '20px 0 8px',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const requestText = {
  color: '#525252',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px',
  whiteSpace: 'pre-wrap' as const,
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const filesText = {
  color: '#64748b',
  fontSize: '14px',
  margin: '12px 0',
  textAlign: 'right' as const,
  direction: 'rtl' as const,
}

const fileLink = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '28px 0 16px',
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
  display: 'inline-block',
  padding: '12px 32px',
  direction: 'rtl' as const,
}

const declineText = {
  color: '#64748b',
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
  direction: 'rtl' as const,
}

const link = {
  color: '#64748b',
  textDecoration: 'underline',
}

export default RFPInvitationEmail
