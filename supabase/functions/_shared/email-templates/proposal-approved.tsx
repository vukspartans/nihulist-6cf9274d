import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface ProposalApprovedEmailProps {
  advisorCompany: string
  projectName: string
  entrepreneurName: string
  price: number
  timelineDays: number
  entrepreneurNotes: string
  projectUrl: string
}

export const ProposalApprovedEmail = ({
  advisorCompany,
  projectName,
  entrepreneurName,
  price,
  timelineDays,
  entrepreneurNotes,
  projectUrl,
}: ProposalApprovedEmailProps) => (
  <EmailLayout preview={`הצעתך אושרה - ${projectName}`}>
    <Section style={content}>
      <Text style={heading}>הצעתך אושרה</Text>
      
      <Text style={paragraph}>
        שלום {advisorCompany},
      </Text>
      
      <Text style={paragraph}>
        הצעת המחיר שלך אושרה. להלן הפרטים:
      </Text>

      <Section style={detailsBox}>
        <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td style={labelCell}>פרויקט</td>
            <td style={valueCell}>{projectName}</td>
          </tr>
          <tr>
            <td style={labelCell}>אושר על ידי</td>
            <td style={valueCell}>{entrepreneurName}</td>
          </tr>
          <tr>
            <td style={labelCell}>מחיר</td>
            <td style={valueCell}>{price?.toLocaleString('he-IL')} &#8362;</td>
          </tr>
          <tr>
            <td style={labelCell}>לוח זמנים</td>
            <td style={valueCell}>{timelineDays} ימים</td>
          </tr>
        </table>
      </Section>

      {entrepreneurNotes && entrepreneurNotes.trim() && (
        <Section style={notesBox}>
          <Text style={notesLabel}>הערות היזם:</Text>
          <Text style={notesText}>{entrepreneurNotes}</Text>
        </Section>
      )}

      <Section style={buttonContainer}>
        <Button href={projectUrl} style={button}>
          צפה בפרויקט
        </Button>
      </Section>
    </Section>
  </EmailLayout>
)

export default ProposalApprovedEmail

const content = {
  padding: '24px',
}

const heading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#2563eb',
  marginBottom: '16px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
  textAlign: 'right' as const,
}

const detailsBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '16px 0',
}

const labelCell = {
  fontSize: '14px',
  color: '#6b7280',
  padding: '6px 0',
  textAlign: 'right' as const,
  width: '100px',
  verticalAlign: 'top' as const,
}

const valueCell = {
  fontSize: '14px',
  color: '#1a1a1a',
  fontWeight: '600' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
}

const notesBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '16px 0',
  borderRight: '4px solid #f59e0b',
}

const notesLabel = {
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#92400e',
  marginBottom: '6px',
  textAlign: 'right' as const,
}

const notesText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#78350f',
  margin: '0',
  textAlign: 'right' as const,
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
  padding: '14px 40px',
  minWidth: '200px',
}
