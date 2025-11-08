import {
  Section,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
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
  const getUrgencyLevel = (hours: number) => {
    if (hours <= 24) return 'critical';
    if (hours <= 48) return 'high';
    return 'medium';
  };

  const urgency = getUrgencyLevel(hoursRemaining);

  const urgencyStyles = {
    critical: {
      backgroundColor: '#fef2f2',
      borderColor: '#fca5a5',
      textColor: '#991b1b',
    },
    high: {
      backgroundColor: '#fff7ed',
      borderColor: '#fdba74',
      textColor: '#9a3412',
    },
    medium: {
      backgroundColor: '#fefce8',
      borderColor: '#fde047',
      textColor: '#854d0e',
    },
  };

  const currentStyle = urgencyStyles[urgency];

  return (
    <EmailLayout preview={`תזכורת: ${hoursRemaining} שעות נותרו להגשת הצעה`}>
      <Section style={content}>
        <Text style={heading}>⏰ תזכורת: המועד להגשת הצעה מתקרב</Text>
        
        <Text style={paragraph}>
          שלום {advisorCompany},
        </Text>
        
        <Text style={paragraph}>
          זוהי תזכורת שהמועד להגשת הצעת מחיר עבור פרויקט <strong>"{projectName}"</strong> מתקרב.
        </Text>

        <Section 
          style={{
            ...urgencyBox,
            backgroundColor: currentStyle.backgroundColor,
            borderColor: currentStyle.borderColor,
          }}
        >
          <Text style={{ ...urgencyText, color: currentStyle.textColor }}>
            <strong>⏱️ נותרו: {hoursRemaining} שעות</strong>
          </Text>
          <Text style={{ ...urgencySubtext, color: currentStyle.textColor }}>
            מועד אחרון: {new Date(deadlineDate).toLocaleString('he-IL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Section>

        <Section style={detailsBox}>
          <Text style={detailsTitle}>פרטי ההזמנה:</Text>
          <Text style={detailItem}>
            <strong>פרויקט:</strong> {projectName}
          </Text>
          <Text style={detailItem}>
            <strong>סוג היועץ:</strong> {advisorType}
          </Text>
          <Text style={detailItem}>
            <strong>זמן נותר:</strong> {hoursRemaining} שעות
          </Text>
        </Section>

        <Section style={actionBox}>
          <Text style={actionTitle}>אפשרויות זמינות:</Text>
          <Text style={actionItem}>
            ✅ <strong>הגש הצעת מחיר</strong> - לחץ על הכפתור למטה
          </Text>
          <Text style={actionItem}>
            ❌ <strong>דחה את ההזמנה</strong> - אם אינך יכול להגיש הצעה
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Button href={submitUrl} style={button}>
            הגש הצעת מחיר עכשיו
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          אם כבר הגשת הצעה או דחית את ההזמנה, התעלם מהודעה זו.
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
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '16px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
};

const urgencyBox = {
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '2px solid',
  textAlign: 'center' as const,
};

const urgencyText = {
  fontSize: '20px',
  fontWeight: 'bold',
  marginBottom: '8px',
};

const urgencySubtext = {
  fontSize: '15px',
  lineHeight: '20px',
};

const detailsBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #e6ebf1',
};

const detailsTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '12px',
};

const detailItem = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#333',
  margin: '8px 0',
};

const actionBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #86efac',
};

const actionTitle = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#166534',
  marginBottom: '12px',
};

const actionItem = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#166534',
  margin: '8px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

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
};

const divider = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

const footer = {
  fontSize: '14px',
  color: '#666',
  lineHeight: '20px',
  textAlign: 'center' as const,
};
