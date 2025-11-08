import {
  Section,
  Text,
  Link,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface ProposalSubmittedEmailProps {
  entrepreneurName: string
  projectName: string
  advisorCompany: string
  advisorType: string
  price: number
  timelineDays: number
  filesCount: number
  projectUrl: string
}

export const ProposalSubmittedEmail = ({
  entrepreneurName,
  projectName,
  advisorCompany,
  advisorType,
  price,
  timelineDays,
  filesCount,
  projectUrl,
}: ProposalSubmittedEmailProps) => (
  <EmailLayout preview={`הצעה חדשה התקבלה לפרויקט ${projectName}`}>
    <Section style={content}>
      <Text style={heading}>הצעה חדשה התקבלה!</Text>
      
      <Text style={paragraph}>
        שלום {entrepreneurName},
      </Text>
      
      <Text style={paragraph}>
        קיבלת הצעת מחיר חדשה לפרויקט <strong>"{projectName}"</strong> מאת {advisorCompany}.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailsTitle}>פרטי ההצעה:</Text>
        <Text style={detailItem}>
          <strong>סוג היועץ:</strong> {advisorType}
        </Text>
        <Text style={detailItem}>
          <strong>שם המשרד:</strong> {advisorCompany}
        </Text>
        <Text style={detailItem}>
          <strong>מחיר מוצע:</strong> ₪{price.toLocaleString('he-IL')}
        </Text>
        <Text style={detailItem}>
          <strong>לוח זמנים:</strong> {timelineDays} ימים
        </Text>
        {filesCount > 0 && (
          <Text style={detailItem}>
            <strong>קבצים מצורפים:</strong> {filesCount}
          </Text>
        )}
      </Section>

      <Section style={buttonContainer}>
        <Button href={projectUrl} style={button}>
          צפה בהצעה ואשר
        </Button>
      </Section>

      <Hr style={divider} />

      <Text style={footer}>
        מומלץ לבחון את ההצעה ולהשוות עם הצעות אחרות לפני קבלת החלטה.
      </Text>
    </Section>
  </EmailLayout>
)

export default ProposalSubmittedEmail

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

const detailsBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #e6ebf1',
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
