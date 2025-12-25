import {
  Section,
  Text,
  Button,
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
  <EmailLayout preview={`הצעה חדשה לפרויקט ${projectName}`}>
    <Section style={content}>
      <Text style={heading}>הצעה חדשה התקבלה</Text>
      
      <Text style={paragraph}>
        שלום {entrepreneurName},
      </Text>
      
      <Text style={paragraph}>
        קיבלת הצעת מחיר חדשה לפרויקט "{projectName}" מאת {advisorCompany} ({advisorType}).
      </Text>

      <Text style={detailText}>
        מחיר: ₪{price.toLocaleString('he-IL')}<br />
        לוח זמנים: {timelineDays} ימים
        {filesCount > 0 && <><br />קבצים: {filesCount}</>}
      </Text>

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
}

const detailText = {
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
