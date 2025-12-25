import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
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
        היזם החליט שלא לקבל את הצעת המחיר לפרויקט "{projectName}".
      </Text>

      {rejectionReason && rejectionReason.trim() && (
        <Text style={reasonText}>
          סיבה: {rejectionReason}
        </Text>
      )}

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
}

const reasonText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#64748b',
  margin: '16px 0',
}

const encourageText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#525252',
  margin: '16px 0',
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
  padding: '12px 32px',
}
