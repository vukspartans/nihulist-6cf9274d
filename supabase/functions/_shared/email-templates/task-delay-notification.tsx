import {
  Section,
  Text,
  Link,
  Hr,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface TaskDelayNotificationProps {
  taskName: string
  projectName: string
  plannedEndDate: string
  advisorCompanyName: string
  taskUrl: string
}

export const TaskDelayNotification = ({
  taskName,
  projectName,
  plannedEndDate,
  advisorCompanyName,
  taskUrl,
}: TaskDelayNotificationProps) => (
  <EmailLayout preview={`עיכוב במשימה: ${taskName}`}>
    <Section style={content}>
      <Text style={heading}>⚠️ עיכוב במשימה</Text>

      <Text style={paragraph}>
        שלום,
      </Text>

      <Text style={paragraph}>
        משימה בפרויקט <strong>{projectName}</strong> סומנה כמעוכבת:
      </Text>

      <Section style={detailsBox}>
        <Text style={detailRow}>
          <strong>שם המשימה:</strong> {taskName}
        </Text>
        <Text style={detailRow}>
          <strong>תאריך יעד מקורי:</strong> {plannedEndDate}
        </Text>
        <Text style={detailRow}>
          <strong>יועץ מטפל:</strong> {advisorCompanyName}
        </Text>
      </Section>

      <Hr style={divider} />

      <Text style={paragraph}>
        מומלץ לבדוק את סטטוס המשימה וליצור קשר עם היועץ המטפל לקבלת עדכון.
      </Text>

      <Section style={buttonContainer}>
        <Link href={taskUrl} style={button}>
          צפייה במשימה
        </Link>
      </Section>
    </Section>
  </EmailLayout>
)

const content = {
  padding: '24px',
}

const heading = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  textAlign: 'right' as const,
  margin: '0 0 16px 0',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333333',
  textAlign: 'right' as const,
  margin: '0 0 12px 0',
}

const detailsBox = {
  backgroundColor: '#fef3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const detailRow = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#333333',
  textAlign: 'right' as const,
  margin: '4px 0',
}

const divider = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#e65100',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '12px 32px',
  textDecoration: 'none',
}

export default TaskDelayNotification
