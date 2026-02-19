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
    ? `ירידה של ${priceDiff.toLocaleString('he-IL')} \u20AA` 
    : priceDiff < 0 
      ? `עלייה של ${Math.abs(priceDiff).toLocaleString('he-IL')} \u20AA` 
      : 'ללא שינוי במחיר';

  return (
    <EmailLayout preview={`הצעה נגדית לפרויקט ${projectName}`}>
      <Section style={content}>
        <Text style={heading}>הצעה נגדית התקבלה</Text>
        
        <Text style={paragraph}>
          שלום {entrepreneurName},
        </Text>
        
        <Text style={paragraph}>
          התקבלה הצעה מעודכנת עבורך. להלן הפרטים:
        </Text>

        <Section style={detailsBox}>
          <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tr>
              <td style={labelCell}>פרויקט</td>
              <td style={valueCell}>{projectName}</td>
            </tr>
            <tr>
              <td style={labelCell}>משרד</td>
              <td style={valueCell}>{advisorCompany}</td>
            </tr>
            <tr>
              <td style={labelCell}>תחום</td>
              <td style={valueCell}>{advisorType}</td>
            </tr>
            <tr>
              <td style={labelCell}>מחיר קודם</td>
              <td style={valueCell}>{previousPrice?.toLocaleString('he-IL')} &#8362;</td>
            </tr>
            <tr>
              <td style={labelCell}>מחיר חדש</td>
              <td style={newPriceCell}>{newPrice?.toLocaleString('he-IL')} &#8362;</td>
            </tr>
            <tr>
              <td style={labelCell}>שינוי</td>
              <td style={changeCell}>{priceChange}</td>
            </tr>
          </table>
        </Section>

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

const newPriceCell = {
  fontSize: '14px',
  color: '#059669',
  fontWeight: '700' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
}

const changeCell = {
  fontSize: '14px',
  color: '#525252',
  fontWeight: '600' as const,
  padding: '6px 8px',
  textAlign: 'right' as const,
  verticalAlign: 'top' as const,
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
