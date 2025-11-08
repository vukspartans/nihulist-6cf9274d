import {
  Section,
  Text,
  Button,
  Hr,
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
        היזם החליט שלא לקבל את הצעת המחיר עבור פרויקט <strong>"{projectName}"</strong>.
      </Text>

      {rejectionReason && rejectionReason.trim() && (
        <Section style={reasonBox}>
          <Text style={reasonTitle}>סיבת הדחייה:</Text>
          <Text style={reasonText}>{rejectionReason}</Text>
        </Section>
      )}

      <Section style={messageBox}>
        <Text style={messageText}>
          אנו מעריכים את ההשקעה שלך בהכנת ההצעה ונשמח לעבוד איתך בפרויקטים עתידיים.
          המשך להציע הצעות מקצועיות ואיכותיות - ההזדמנות הבאה בדרך!
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <Button href={dashboardUrl} style={button}>
          חזור לפרויקטים פעילים
        </Button>
      </Section>

      <Hr style={divider} />

      <Text style={footer}>
        יש לך משוב על תהליך ההצעות? נשמח לשמוע ממך.
      </Text>
    </Section>
  </EmailLayout>
)

export default ProposalRejectedEmail

const content = {
  padding: '24px',
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '16px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
}

const reasonBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  border: '1px solid #fecaca',
}

const reasonTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#991b1b',
  marginBottom: '8px',
}

const reasonText = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#7f1d1d',
  whiteSpace: 'pre-wrap' as const,
}

const messageBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #e6ebf1',
}

const messageText = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#333',
  textAlign: 'center' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#6772e5',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const divider = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const footer = {
  fontSize: '14px',
  color: '#666',
  lineHeight: '20px',
  textAlign: 'center' as const,
}
