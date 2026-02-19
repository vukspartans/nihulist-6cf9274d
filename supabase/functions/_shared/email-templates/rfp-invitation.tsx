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
  senderOrganizationName: string
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
  senderOrganizationName,
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
        נשמח לקבל ממכם הצעת מחיר. להלן פרטי הפרויקט:
      </Text>

      <Section style={detailsBox}>
        <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td style={labelCell}>מזמין</td>
            <td style={valueCell}>{senderOrganizationName}</td>
          </tr>
          <tr>
            <td style={labelCell}>פרויקט</td>
            <td style={valueCell}>{projectName}</td>
          </tr>
          <tr>
            <td style={labelCell}>סוג</td>
            <td style={valueCell}>{projectType}</td>
          </tr>
          <tr>
            <td style={labelCell}>מיקום</td>
            <td style={valueCell}>{projectLocation}</td>
          </tr>
          <tr>
            <td style={labelCell}>מועד אחרון</td>
            <td style={deadlineCell}>{deadlineDate}</td>
          </tr>
        </table>
      </Section>
      
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
            <span key={index}>
              <Link href={file.url} style={fileLink}>{file.name}</Link>
              {index < requestFiles.length - 1 ? ', ' : ''}
            </span>
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

const detailsBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
}

const labelCell = {
  fontSize: '14px',
  color: '#6b7280',
  padding: '6px 0',
  textAlign: 'right' as const,
  width: '100px',
  verticalAlign: 'top' as const,
}

const valueCell = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '600' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
}

const deadlineCell = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '700' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
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
  padding: '14px 40px',
  minWidth: '200px',
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
