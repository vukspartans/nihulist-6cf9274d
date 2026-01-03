import {
  Section,
  Text,
  Button,
  Hr,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface RFPFinalDeadlineReminderEmailProps {
  advisorCompany: string
  projectName: string
  projectLocation?: string
  advisorType: string
  deadlineDate: string
  hoursRemaining: number
  loginUrl: string
}

export const RFPFinalDeadlineReminderEmail = ({
  advisorCompany,
  projectName,
  projectLocation,
  advisorType,
  deadlineDate,
  hoursRemaining,
  loginUrl,
}: RFPFinalDeadlineReminderEmailProps) => {
  const isVeryUrgent = hoursRemaining <= 12
  
  return (
    <EmailLayout preview={`⚠️ תזכורת אחרונה: ${hoursRemaining} שעות להגשה - ${projectName}`}>
      <Section style={content}>
        {/* Urgent Icon */}
        <Section style={iconContainer}>
          <Text style={icon}>{isVeryUrgent ? '🚨' : '⚠️'}</Text>
        </Section>

        <Text style={heading}>תזכורת אחרונה להגשת הצעה!</Text>
        
        <Text style={paragraph}>
          שלום <strong>{advisorCompany}</strong>,
        </Text>
        
        <Text style={paragraph}>
          זו תזכורת אחרונה - המועד האחרון להגשת הצעה מתקרב במהירות!
          {isVeryUrgent && ' פעלו עכשיו כדי לא לפספס.'}
        </Text>

        {/* Urgent Countdown */}
        <Section style={urgentCountdownContainer}>
          <Section style={urgentCountdownBox(isVeryUrgent)}>
            <Text style={urgentCountdownNumber(isVeryUrgent)}>{hoursRemaining}</Text>
            <Text style={urgentCountdownLabel}>שעות נותרו</Text>
            <Text style={deadlineTime}>
              עד {new Date(deadlineDate).toLocaleString('he-IL', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Section>
        </Section>

        <Hr style={divider} />

        {/* Project Summary */}
        <Section style={projectCard}>
          <Text style={projectNameText}>📋 {projectName}</Text>
          {projectLocation && (
            <Text style={projectDetail}>📍 {projectLocation}</Text>
          )}
          <Text style={projectDetail}>👷 {advisorType}</Text>
        </Section>

        {/* Warning Box */}
        <Section style={warningBox}>
          <Text style={warningText}>
            ⏳ לאחר סיום המועד לא ניתן יהיה להגיש הצעה לפרויקט זה
          </Text>
        </Section>

        {/* CTA Button */}
        <Section style={buttonContainer}>
          <Button href={loginUrl} style={button(isVeryUrgent)}>
            הגש הצעה עכשיו
          </Button>
        </Section>

        <Text style={helpText}>
          אם כבר הגשת הצעה או סירבת לבקשה - התעלם מהודעה זו
        </Text>

        <Text style={footer}>
          הודעה אוטומטית זו נשלחת כתזכורת אחרונה לפני סיום המועד להגשה.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export default RFPFinalDeadlineReminderEmail

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
  color: '#dc2626',
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

const urgentCountdownContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const urgentCountdownBox = (isVeryUrgent: boolean) => ({
  display: 'inline-block',
  backgroundColor: isVeryUrgent ? '#fef2f2' : '#fffbeb',
  borderRadius: '16px',
  padding: '24px 40px',
  border: `3px solid ${isVeryUrgent ? '#dc2626' : '#f59e0b'}`,
})

const urgentCountdownNumber = (isVeryUrgent: boolean) => ({
  fontSize: '56px',
  fontWeight: 'bold',
  color: isVeryUrgent ? '#dc2626' : '#d97706',
  margin: '0',
  lineHeight: '1',
})

const urgentCountdownLabel = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#64748b',
  margin: '8px 0 4px 0',
}

const deadlineTime = {
  fontSize: '13px',
  color: '#94a3b8',
  margin: '0',
}

const divider = {
  borderTop: '1px solid #e6ebf1',
  margin: '24px 0',
}

const projectCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  padding: '16px 20px',
  border: '1px solid #e2e8f0',
}

const projectNameText = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 8px 0',
  lineHeight: '1.4',
}

const projectDetail = {
  fontSize: '14px',
  color: '#475569',
  margin: '4px 0',
  lineHeight: '1.5',
}

const warningBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '12px 16px',
  marginTop: '16px',
  border: '1px solid #fcd34d',
}

const warningText = {
  fontSize: '13px',
  color: '#92400e',
  margin: '0',
  textAlign: 'center' as const,
  fontWeight: '500',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

const button = (isVeryUrgent: boolean) => ({
  backgroundColor: isVeryUrgent ? '#dc2626' : '#f59e0b',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '17px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 44px',
  border: 'none',
})

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
