import {
  Section,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.22'
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
      case 'not_available':
        return 'אין זמינות כרגע';
      case 'outside_expertise':
        return 'מחוץ לתחום ההתמחות';
      case 'budget_mismatch':
        return 'אי התאמה תקציבית';
      case 'other':
        return 'סיבה אחרת';
      default:
        return 'לא צוין';
    }
  };

  return (
    <EmailLayout preview={`יועץ דחה הזמנה לפרויקט ${projectName}`}>
      <Section style={content}>
        <Text style={heading}>עדכון לגבי הזמנת RFP</Text>
        
        <Text style={paragraph}>
          שלום {entrepreneurName},
        </Text>
        
        <Text style={paragraph}>
          {advisorCompany} ({advisorType}) דחה את ההזמנה להציע הצעת מחיר עבור פרויקט <strong>"{projectName}"</strong>.
        </Text>

        <Section style={detailsBox}>
          <Text style={detailsTitle}>פרטי הדחייה:</Text>
          <Text style={detailItem}>
            <strong>יועץ:</strong> {advisorCompany}
          </Text>
          <Text style={detailItem}>
            <strong>סוג היועץ:</strong> {advisorType}
          </Text>
          <Text style={detailItem}>
            <strong>סיבה:</strong> {getReasonText(declineReason)}
          </Text>
        </Section>

        {declineNote && declineNote.trim() && (
          <Section style={noteBox}>
            <Text style={noteTitle}>הערת היועץ:</Text>
            <Text style={noteText}>{declineNote}</Text>
          </Section>
        )}

        <Section style={messageBox}>
          <Text style={messageText}>
            אל דאגה - ישנם יועצים נוספים זמינים לפרויקט שלך.
            מומלץ לשלוח הזמנות נוספות ליועצים אחרים כדי לקבל הצעות מחיר.
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Button href={projectUrl} style={button}>
            שלח הזמנות נוספות
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          צוות ניהוליסט כאן לעזור במציאת היועצים המתאימים לפרויקט שלך.
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default RFPDeclinedEmail;

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

const detailsBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #fecaca',
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

const noteBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '16px',
  margin: '20px 0',
  border: '1px solid #fcd34d',
};

const noteTitle = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#92400e',
  marginBottom: '8px',
};

const noteText = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#78350f',
  whiteSpace: 'pre-wrap' as const,
};

const messageBox = {
  backgroundColor: '#f0f9ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  border: '1px solid #bae6fd',
};

const messageText = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#0c4a6e',
  textAlign: 'center' as const,
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

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
