import {
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.31'
import * as React from 'npm:react@18.3.1'
import { EmailLayout } from './layout.tsx'

interface ProposalResubmittedEmailProps {
  entrepreneurName: string
  projectName: string
  advisorCompany: string
  advisorType: string
  previousPrice: number
  newPrice: number
  projectUrl: string
}

export const ProposalResubmittedEmail = ({
  entrepreneurName,
  projectName,
  advisorCompany,
  advisorType,
  previousPrice,
  newPrice,
  projectUrl,
}: ProposalResubmittedEmailProps) => {
  const priceDiff = previousPrice - newPrice;
  const priceChange = priceDiff > 0 
    ? `ירידה של ₪${priceDiff.toLocaleString('he-IL')}` 
    : priceDiff < 0 
      ? `עלייה של ₪${Math.abs(priceDiff).toLocaleString('he-IL')}` 
      : 'ללא שינוי במחיר';

  return (
    <EmailLayout preview={`הצעה נגדית לפרויקט ${projectName}`}>
      <Section style={content}>
        <Text style={heading}>הצעה נגדית התקבלה</Text>
        
        <Text style={paragraph}>
          שלום {entrepreneurName},
        </Text>
        
        <Text style={paragraph}>
          קיבלת הצעה נגדית (מעודכנת) לפרויקט "{projectName}" מאת {advisorCompany} ({advisorType}).
        </Text>

        <Text style={detailText}>
          מחיר קודם: ₪{previousPrice.toLocaleString('he-IL')}<br />
          מחיר חדש: ₪{newPrice.toLocaleString('he-IL')}<br />
          <strong>{priceChange}</strong>
        </Text>

        <Section style={buttonContainer}>
          <Button href={projectUrl} style={button}>
            צפה בהצעה המעודכנת
          </Button>
        </Section>
      </Section>
    </EmailLayout>
  )
}

export default ProposalResubmittedEmail

const content = {
  padding: '24px',
}

const heading = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
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
  backgroundColor: '#f5f5f5',
  padding: '12px',
  borderRadius: '6px',
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
  padding: '12px 32px',
}
