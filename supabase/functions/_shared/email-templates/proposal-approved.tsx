import {
  Section,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface ProposalApprovedEmailProps {
  advisorCompany: string
  projectName: string
  entrepreneurName: string
  price: number
  timelineDays: number
  entrepreneurNotes: string
  projectUrl: string
}

export const ProposalApprovedEmail = ({
  advisorCompany,
  projectName,
  entrepreneurName,
  price,
  timelineDays,
  entrepreneurNotes,
  projectUrl,
}: ProposalApprovedEmailProps) => (
  <EmailLayout preview={`🎉 הצעתך אושרה! - ${projectName}`}>
    <Section style={content}>
      <Text style={celebrationHeading}>🎉 מזל טוב! הצעתך אושרה</Text>
      
      <Text style={paragraph}>
        שלום {advisorCompany},
      </Text>
      
      <Text style={paragraph}>
        הצעת המחיר שלך עבור פרויקט <strong>"{projectName}"</strong> אושרה על ידי {entrepreneurName}!
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsTitle}>פרטי הפרויקט המאושר:</Text>
        <Text style={detailItem}>
          <strong>שם הלקוח:</strong> {entrepreneurName}
        </Text>
        <Text style={detailItem}>
          <strong>מחיר מאושר:</strong> ₪{price.toLocaleString('he-IL')}
        </Text>
        <Text style={detailItem}>
          <strong>לוח זמנים:</strong> {timelineDays} ימים
        </Text>
      </Section>

      {entrepreneurNotes && entrepreneurNotes.trim() && (
        <Section style={notesBox}>
          <Text style={notesTitle}>הערות מהיזם:</Text>
          <Text style={notesText}>{entrepreneurNotes}</Text>
        </Section>
      )}

      <Section style={stepsBox}>
        <Text style={stepsTitle}>השלבים הבאים:</Text>
        <Text style={stepItem}>1. צור קשר עם היזם לתיאום פגישת פתיחה</Text>
        <Text style={stepItem}>2. הכן את המסמכים הנדרשים להתחלת הפרויקט</Text>
        <Text style={stepItem}>3. תאם לוח זמנים מפורט עם הלקוח</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button href={projectUrl} style={button}>
          צפה בפרטי הפרויקט
        </Button>
      </Section>

      <Hr style={divider} />

      <Text style={footer}>
        בהצלחה בפרויקט! אנחנו כאן אם תצטרך עזרה.
      </Text>
    </Section>
  </EmailLayout>
)

export default ProposalApprovedEmail

const content = {
  padding: '24px',
}

const celebrationHeading = {
  fontSize: '26px',
  fontWeight: 'bold',
  color: '#10b981',
  marginBottom: '16px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
}

const detailsBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #86efac',
}

const detailsTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '12px',
}

const detailItem = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#333',
  margin: '8px 0',
}

const notesBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  border: '1px solid #fcd34d',
}

const notesTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#92400e',
  marginBottom: '8px',
}

const notesText = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#78350f',
  whiteSpace: 'pre-wrap' as const,
}

const stepsBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #e6ebf1',
}

const stepsTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '12px',
}

const stepItem = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#333',
  margin: '8px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#10b981',
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
