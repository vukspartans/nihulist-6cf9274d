import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
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
        הצעת המחיר שלך לפרויקט "{projectName}" אושרה על ידי {entrepreneurName}.
      </Text>

      <Text style={detailText}>
        מחיר: ₪{price.toLocaleString('he-IL')}<br />
        לוח זמנים: {timelineDays} ימים
      </Text>

      {entrepreneurNotes && entrepreneurNotes.trim() && (
        <Text style={notesText}>
          הערות: {entrepreneurNotes}
        </Text>
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
  color: '#059669',
  marginBottom: '16px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#333',
  marginBottom: '12px',
}

const detailText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#525252',
  margin: '16px 0',
}

const notesText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#64748b',
  margin: '12px 0',
  fontStyle: 'italic' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const button = {
  backgroundColor: '#059669',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}
