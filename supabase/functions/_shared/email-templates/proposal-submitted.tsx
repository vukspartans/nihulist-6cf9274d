import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface ProposalSubmittedEmailProps {
  entrepreneurName: string
  projectName: string
  advisorCompany: string
  advisorType: string
  price: number
  filesCount: number
  projectUrl: string
}

export const ProposalSubmittedEmail = ({
  entrepreneurName,
  projectName,
  advisorCompany,
  advisorType,
  price,
  filesCount,
  projectUrl,
}: ProposalSubmittedEmailProps) => (
  <EmailLayout preview={`הצעה חדשה לפרויקט ${projectName}`}>
    <Section style={content}>
      <Text style={heading}>הצעה חדשה התקבלה</Text>
      
      <Text style={paragraph}>
        שלום {entrepreneurName},
      </Text>
      
      <Text style={paragraph}>
        {'התקבלה הצעת מחיר חדשה. להלן הפרטים:'}
      </Text>

      <Section style={detailsBox}>
        <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td style={labelCell}>פרויקט</td>
            <td style={valueCell}>{projectName}</td>
          </tr>
          <tr>
            <td style={labelCell}>משרד</td>
            <td style={valueCell}>{advisorCompany}</td>
          </tr>
          <tr>
            <td style={labelCell}>תחום</td>
            <td style={valueCell}>{advisorType}</td>
          </tr>
          <tr>
            <td style={labelCell}>מחיר</td>
            <td style={valueCell}>{price?.toLocaleString('he-IL')} &#8362;</td>
          </tr>
          {filesCount > 0 ? (
            <tr>
              <td style={labelCell}>קבצים מצורפים</td>
              <td style={valueCell}>{filesCount}</td>
            </tr>
          ) : null}
        </table>
      </Section>

      <Section style={buttonContainer}>
        <Button href={projectUrl} style={button}>
          צפה בהצעה
        </Button>
      </Section>
    </Section>
  </EmailLayout>
)

export default ProposalSubmittedEmail

const content = {
  padding: '24px',
}

const heading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '16px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
  textAlign: 'right' as const,
}

const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const labelCell = {
  fontSize: '14px',
  color: '#6b7280',
  padding: '6px 0',
  textAlign: 'right' as const,
  width: '120px',
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
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
}
