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
          נותרו <strong>{hoursRemaining} שעות</strong> להגשת הצעת מחיר. להלן הפרטים:
        </Text>

        <Section style={detailsBox}>
          <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tr>
              <td style={labelCell}>פרויקט</td>
              <td style={valueCell}>{projectName}</td>
            </tr>
            <tr>
              <td style={labelCell}>תחום</td>
              <td style={valueCell}>{advisorType}</td>
            </tr>
            <tr>
              <td style={labelCell}>מועד אחרון</td>
              <td style={deadlineValueCell}>
                {new Date(deadlineDate).toLocaleString('he-IL', {
                  day: 'numeric',
                  month: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
            </tr>
          </table>
        </Section>

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
  textAlign: 'right' as const,
};

const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
};

const labelCell = {
  fontSize: '14px',
  color: '#6b7280',
  padding: '6px 0',
  textAlign: 'right' as const,
  width: '100px',
  verticalAlign: 'top' as const,
};

const valueCell = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '600' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
};

const deadlineValueCell = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: '700' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
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
  padding: '14px 40px',
  minWidth: '200px',
};

const footer = {
  fontSize: '13px',
  color: '#666',
  lineHeight: '20px',
  textAlign: 'center' as const,
};
