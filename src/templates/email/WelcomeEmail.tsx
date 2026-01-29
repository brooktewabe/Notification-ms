import React from 'react';
import {
  Heading,
  Section,
  Text,
} from '@react-email/components';
import { EmailLayout } from './components/EmailLayout';
import { Card } from './components/Card';

export interface WelcomeEmailProps {
  userName?: string;
}

export const WelcomeEmail = ({ userName }: WelcomeEmailProps) => {
  return (
    <EmailLayout preview="Welcome! We're excited to have you join us.">
      <Section>
        <Heading style={heading}>
          Hi {userName}! 👋
        </Heading>

        <Text style={text}>
          Welcome, We're thrilled to have you join our community. We make it easy to manage your payments, send money to friends, and handle all your financial transactions seamlessly.
        </Text>

        <Text style={text}>
          Get started by adding your first payment card or exploring the app to see all the amazing features we have to offer.
        </Text>

        <Section style={buttonSection}>
          <a href="https://url.app/get-started" style={link}>
            Get Started
          </a>
        </Section>

        <Text style={text}>
          If you have any questions, feel free to reach out to our support team. We're here to help!
        </Text>

        <Text style={signature}>
          Best regards,<br />
          <strong>The dev Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
};

export default WelcomeEmail;

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
