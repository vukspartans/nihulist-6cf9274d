import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface ProposalRejectedEmailProps {
  advisorCompany: string
  projectName: string
  rejectionReason?: string
  dashboardUrl: string
}

export const ProposalRejectedEmail = ({
  advisorCompany,
  projectName,
  rejectionReason,
  dashboardUrl,
}: ProposalRejectedEmailProps) => (
  <EmailLayout preview={`עדכון לגבי הצעתך - ${projectName}`}>
    <Section style={content}>
      <Text style={heading}>עדכון לגבי הצעתך</Text>
      
      <Text style={paragraph}>
        שלום {advisorCompany},
      </Text>
      
      <Text style={paragraph}>
        היזם החליט שלא לקבל את הצעת המחיר שלך.
      </Text>

      <Section style={detailsBox}>
        <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td style={labelCell}>פרויקט</td>
            <td style={valueCell}>{projectName}</td>
          </tr>
          {rejectionReason && rejectionReason.trim() && (
            <tr>
              <td style={labelCell}>סיבה</td>
              <td style={valueCell}>{rejectionReason}</td>
            </tr>
          )}
        </table>
      </Section>

      <Text style={encourageText}>
        נשמח לעבוד איתך בפרויקטים עתידיים.
      </Text>

      <Section style={buttonContainer}>
        <Button href={dashboardUrl} style={button}>
          לפרויקטים שלי
        </Button>
      </Section>
    </Section>
  </EmailLayout>
)

export default ProposalRejectedEmail

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
  width: '80px',
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

const encourageText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#525252',
  margin: '16px 0',
  textAlign: 'right' as const,
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
