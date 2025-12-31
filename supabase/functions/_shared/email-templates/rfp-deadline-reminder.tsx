import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface RFPDeadlineReminderEmailProps {
  advisorCompany: string
  projectName: string
  advisorType: string
  deadlineDate: string
  hoursRemaining: number
  submitUrl: string
}

export const RFPDeadlineReminderEmail = ({
  advisorCompany,
  projectName,
  advisorType,
  deadlineDate,
  hoursRemaining,
  submitUrl,
}: RFPDeadlineReminderEmailProps) => {
  return (
    <EmailLayout preview={`תזכורת: ${hoursRemaining} שעות להגשת הצעה - ${projectName}`}>
      <Section style={content}>
        <Text style={heading}>תזכורת להגשת הצעה</Text>
        
        <Text style={paragraph}>
          שלום {advisorCompany},
        </Text>
        
        <Text style={paragraph}>
          נותרו <strong>{hoursRemaining} שעות</strong> להגשת הצעת מחיר עבור פרויקט "{projectName}".
        </Text>

        <Text style={detailText}>
          סוג יועץ: {advisorType}<br />
          מועד אחרון: {new Date(deadlineDate).toLocaleString('he-IL', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        <Section style={buttonContainer}>
          <Button href={submitUrl} style={button}>
            הגשת הצעה
          </Button>
        </Section>

        <Text style={footer}>
          אם כבר הגשת הצעה, התעלם מהודעה זו.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default RFPDeadlineReminderEmail;

const content = {
  padding: '24px',
};

const heading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
};

const detailText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#64748b',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

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
};

const footer = {
  fontSize: '13px',
  color: '#666',
  lineHeight: '20px',
  textAlign: 'center' as const,
};
