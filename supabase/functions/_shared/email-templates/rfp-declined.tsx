import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface RFPDeclinedEmailProps {
  entrepreneurName: string
  projectName: string
  advisorCompany: string
  advisorType: string
  declineReason?: string
  declineNote?: string
  projectUrl: string
}

export const RFPDeclinedEmail = ({
  entrepreneurName,
  projectName,
  advisorCompany,
  advisorType,
  declineReason,
  declineNote,
  projectUrl,
}: RFPDeclinedEmailProps) => {
  const getReasonText = (reason?: string) => {
    switch (reason) {
      case 'no_capacity':
        return 'אין זמינות כרגע';
      case 'outside_expertise':
        return 'מחוץ לתחום ההתמחות';
      case 'timeline_conflict':
        return 'קונפליקט בלוחות זמנים';
      case 'budget_mismatch':
        return 'אי התאמה תקציבית';
      case 'other':
        return 'סיבה אחרת';
      default:
        return 'לא צוין';
    }
  };

  return (
    <EmailLayout preview={`עדכון לפרויקט ${projectName}`}>
      <Section style={content}>
        <Text style={heading}>עדכון הזמנה</Text>
        
        <Text style={paragraph}>
          שלום {entrepreneurName},
        </Text>
        
        <Text style={paragraph}>
          {advisorCompany} ({advisorType}) דחה את ההזמנה לפרויקט "{projectName}".
        </Text>

        <Text style={detailText}>
          סיבה: {getReasonText(declineReason)}
          {declineNote && declineNote.trim() && <><br />הערה: {declineNote}</>}
        </Text>

        <Text style={encourageText}>
          ישנם יועצים נוספים זמינים לפרויקט.
        </Text>

        <Section style={buttonContainer}>
          <Button href={projectUrl} style={button}>
            שלח הזמנות
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  );
};

export default RFPDeclinedEmail;

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

const encourageText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#525252',
  margin: '12px 0',
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
