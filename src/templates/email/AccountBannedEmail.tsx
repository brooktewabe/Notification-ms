import React from 'react';
import {
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';
import { Card } from './components/Card';

export interface AccountBannedEmailProps {
  userName?: string;
  reason?: string;
  appealLink?: string;
}

export const AccountBannedEmail = ({
  userName,
  reason,
  appealLink = 'https://url.app/appeal',
}: AccountBannedEmailProps) => {
  return (
    <EmailLayout preview="Important: Your OrgName account has been suspended">
      <Section>
        <Heading style={heading}>
          Account Suspended ⛔
        </Heading>

        <Text style={text}>Hi {userName},</Text>

        <Text style={text}>
          We’re writing to inform you that your OrgName account has been suspended
          due to a violation of our Terms of Service.
        </Text>

        <Card>
          <Text style={reasonTitle}>Reason for Suspension:</Text>
          <Text style={reasonText}>{reason}</Text>
        </Card>

        <Text style={text}>
          During this suspension, you will not be able to:
        </Text>

        <Section style={list}>
          <Text style={listItem}>• Access your account</Text>
          <Text style={listItem}>• Make transactions</Text>
          <Text style={listItem}>• Receive payments</Text>
          <Text style={listItem}>• Use any OrgName services</Text>
        </Section>

        <Text style={text}>
          If you believe this suspension is a mistake, you have the right to appeal
          this decision. Please submit an appeal with any relevant information or documentation.
        </Text>

        <Section style={buttonSection}>
          <a href={appealLink} style={link}>
            Submit an Appeal
          </a>
        </Section>

        <Text style={text}>
          Our team will review your appeal within <strong>5–7 business days</strong>.
          You will receive an email notification once a decision has been made.
        </Text>

        <Text style={text}>
          If you have any questions, please contact our support team.
        </Text>

        <Text style={signature}>
          Best regards,<br />
          <strong>The OrgName Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default AccountBannedEmail;
const heading = {
  color: '#065f46',
  fontSize: '26px',
  fontWeight: '700',
  margin: '0 0 20px',
};

const text = {
  color: '#065f46',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const reasonTitle = {
  color: '#065f46',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const reasonText = {
  color: '#065f46',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const list = {
  margin: '16px 0',
  paddingLeft: '16px',
};

const listItem = {
  color: '#065f46',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 6px',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const link = {
  color: '#065f46',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'underline',
};

const signature = {
  color: '#065f46',
  fontSize: '15px',
  lineHeight: '22px',
  marginTop: '24px',
};
