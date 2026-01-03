import {
  Section,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface RFPUnopenedReminderEmailProps {
  advisorCompany: string
  projectName: string
  projectLocation?: string
  advisorType: string
  deadlineDate: string
  daysRemaining: number
  loginUrl: string
}

export const RFPUnopenedReminderEmail = ({
  advisorCompany,
  projectName,
  projectLocation,
  advisorType,
  deadlineDate,
  daysRemaining,
  loginUrl,
}: RFPUnopenedReminderEmailProps) => {
  return (
    <EmailLayout preview={`יש לך בקשה חדשה להצעת מחיר - ${projectName}`}>
      <Section style={content}>
        {/* Icon */}
        <Section style={iconContainer}>
          <Text style={icon}>📬</Text>
        </Section>

        <Text style={heading}>יש לך בקשה חדשה להצעת מחיר</Text>
        
        <Text style={paragraph}>
          שלום <strong>{advisorCompany}</strong>,
        </Text>
        
        <Text style={paragraph}>
          שמנו לב שעוד לא צפית בבקשה להצעת מחיר שנשלחה אליך. 
          זו הזדמנות מצוינת לפרויקט חדש!
        </Text>

        <Hr style={divider} />

        {/* Project Card */}
        <Section style={projectCard}>
          <Text style={projectLabel}>פרטי הפרויקט</Text>
          <Text style={projectName}>{projectName}</Text>
          {projectLocation && (
            <Text style={projectDetail}>📍 {projectLocation}</Text>
          )}
          <Text style={projectDetail}>👷 תפקיד: {advisorType}</Text>
          <Section style={deadlineBox}>
            <Text style={deadlineLabel}>מועד אחרון להגשה</Text>
            <Text style={deadlineValue}>
              {new Date(deadlineDate).toLocaleDateString('he-IL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Text style={daysRemainingText}>
              נותרו <strong style={daysHighlight}>{daysRemaining}</strong> ימים
            </Text>
          </Section>
        </Section>

        <Hr style={divider} />

        {/* CTA Button */}
        <Section style={buttonContainer}>
          <Button href={loginUrl} style={button}>
            צפה בבקשה
          </Button>
        </Section>

        <Text style={helpText}>
          לחץ על הכפתור כדי להתחבר למערכת ולצפות בפרטי הבקשה המלאים
        </Text>

        <Text style={footer}>
          הודעה זו נשלחה אוטומטית. אם אינך מעוניין בפרויקט זה, תוכל לסרב דרך המערכת.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export default RFPUnopenedReminderEmail

// Styles
const content = {
  padding: '24px',
  direction: 'rtl' as const,
  textAlign: 'right' as const,
}

const iconContainer = {
  textAlign: 'center' as const,
  marginBottom: '8px',
}

const icon = {
  fontSize: '48px',
  lineHeight: '1',
  margin: '0',
}

const heading = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: '20px',
  textAlign: 'center' as const,
  lineHeight: '1.4',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '26px',
  color: '#525252',
  marginBottom: '16px',
  textAlign: 'right' as const,
}

const divider = {
  borderTop: '1px solid #e6ebf1',
  margin: '24px 0',
}

const projectCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid #e2e8f0',
}

const projectLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
}

const projectName = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 12px 0',
  lineHeight: '1.4',
}

const projectDetail = {
  fontSize: '14px',
  color: '#475569',
  margin: '4px 0',
  lineHeight: '1.5',
}

const deadlineBox = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '12px',
  marginTop: '16px',
  border: '1px solid #e2e8f0',
  textAlign: 'center' as const,
}

const deadlineLabel = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px 0',
}

const deadlineValue = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1e293b',
  margin: '0 0 4px 0',
}

const daysRemainingText = {
  fontSize: '13px',
  color: '#64748b',
  margin: '0',
}

const daysHighlight = {
  color: '#2563eb',
  fontSize: '15px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
  border: 'none',
}

const helpText = {
  fontSize: '13px',
  color: '#64748b',
  textAlign: 'center' as const,
  marginBottom: '20px',
  lineHeight: '1.5',
}

const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: '20px',
  textAlign: 'center' as const,
  marginTop: '16px',
  fontStyle: 'italic' as const,
}
