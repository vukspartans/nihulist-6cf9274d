import {
  Section,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface RFPNoSubmissionReminderEmailProps {
  advisorCompany: string
  projectName: string
  projectLocation?: string
  advisorType: string
  deadlineDate: string
  daysRemaining: number
  loginUrl: string
}

export const RFPNoSubmissionReminderEmail = ({
  advisorCompany,
  projectName,
  projectLocation,
  advisorType,
  deadlineDate,
  daysRemaining,
  loginUrl,
}: RFPNoSubmissionReminderEmailProps) => {
  const urgencyLevel = daysRemaining <= 3 ? 'high' : daysRemaining <= 5 ? 'medium' : 'low'
  
  return (
    <EmailLayout preview={`אל תפספס: ${daysRemaining} ימים להגשת הצעה - ${projectName}`}>
      <Section style={content}>
        {/* Icon */}
        <Section style={iconContainer}>
          <Text style={icon}>⏰</Text>
        </Section>

        <Text style={heading}>אל תפספסו את ההזדמנות!</Text>
        
        <Text style={paragraph}>
          שלום <strong>{advisorCompany}</strong>,
        </Text>
        
        <Text style={paragraph}>
          ראינו שפתחת את הבקשה להצעת מחיר אבל עוד לא הגשת הצעה. 
          הזמן רץ ואנחנו רוצים לוודא שלא תפספסו את ההזדמנות הזו!
        </Text>

        {/* Countdown Box */}
        <Section style={countdownContainer}>
          <Section style={countdownBox(urgencyLevel)}>
            <Text style={countdownNumber(urgencyLevel)}>{daysRemaining}</Text>
            <Text style={countdownLabel}>ימים נותרו</Text>
          </Section>
        </Section>

        <Hr style={divider} />

        {/* Project Card */}
        <Section style={projectCard}>
          <Text style={projectLabelText}>פרטי הפרויקט</Text>
          <Text style={projectNameText}>{projectName}</Text>
          {projectLocation && (
            <Text style={projectDetail}>📍 {projectLocation}</Text>
          )}
          <Text style={projectDetail}>👷 תפקיד: {advisorType}</Text>
          <Text style={deadlineText}>
            🗓️ מועד אחרון: {new Date(deadlineDate).toLocaleDateString('he-IL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </Section>

        <Hr style={divider} />

        {/* Benefits List */}
        <Section style={benefitsSection}>
          <Text style={benefitsTitle}>למה כדאי להגיש הצעה?</Text>
          <Text style={benefitItem}>✓ פרויקט חדש עם פוטנציאל עסקי</Text>
          <Text style={benefitItem}>✓ יזם פעיל המחפש יועצים איכותיים</Text>
          <Text style={benefitItem}>✓ תהליך הגשה פשוט ומהיר</Text>
        </Section>

        {/* CTA Button */}
        <Section style={buttonContainer}>
          <Button href={loginUrl} style={button}>
            הגש הצעה עכשיו
          </Button>
        </Section>

        <Text style={helpText}>
          מעדיפים לא להשתתף? תוכלו לסרב לבקשה דרך המערכת
        </Text>

        <Text style={footer}>
          הודעה זו נשלחה אוטומטית כתזכורת. זו תזכורת נוספת לפני המועד האחרון.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export default RFPNoSubmissionReminderEmail

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

const countdownContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const countdownBox = (urgency: string) => ({
  display: 'inline-block',
  backgroundColor: urgency === 'high' ? '#fef2f2' : urgency === 'medium' ? '#fffbeb' : '#f0f9ff',
  borderRadius: '16px',
  padding: '20px 32px',
  border: `2px solid ${urgency === 'high' ? '#fecaca' : urgency === 'medium' ? '#fde68a' : '#bae6fd'}`,
})

const countdownNumber = (urgency: string) => ({
  fontSize: '48px',
  fontWeight: 'bold',
  color: urgency === 'high' ? '#dc2626' : urgency === 'medium' ? '#d97706' : '#2563eb',
  margin: '0',
  lineHeight: '1',
})

const countdownLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#64748b',
  margin: '8px 0 0 0',
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

const projectLabelText = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 8px 0',
}

const projectNameText = {
  fontSize: '18px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 12px 0',
  lineHeight: '1.4',
}

const projectDetail = {
  fontSize: '14px',
  color: '#475569',
  margin: '6px 0',
  lineHeight: '1.5',
}

const deadlineText = {
  fontSize: '14px',
  color: '#475569',
  margin: '6px 0',
  lineHeight: '1.5',
  fontWeight: '600',
}

const benefitsSection = {
  backgroundColor: '#f0fdf4',
  borderRadius: '12px',
  padding: '16px 20px',
  border: '1px solid #bbf7d0',
}

const benefitsTitle = {
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '0 0 12px 0',
}

const benefitItem = {
  fontSize: '13px',
  color: '#15803d',
  margin: '6px 0',
  lineHeight: '1.5',
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
