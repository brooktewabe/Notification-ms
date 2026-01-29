import React from 'react';
import { config } from '../../../config/envConfig';
import {
  Html,
  Head,
  Body,
  Container,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface EmailLayoutProps {
  preview?: string;
  children: React.ReactNode;
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      {preview && <Preview>{preview}</Preview>}

      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <img
              src={`${config.baseUrl}/assets/logo.svg`} 
              width="48"
              height="48"
              alt="OrgName"
              style={logo}
            />
            <Text style={brand}>OrgName</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} OrgName. All rights reserved.
            </Text>
            <Text style={footerText}>
              Privacy Policy | Terms of Service
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};
const body = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
};

const header = {
  padding: '24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #fdba74',
};

const logo = {
  display: 'block',
  margin: '0 auto 8px',
};

const brand = {
  color: '#065f46',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0',
};

const content = {
  padding: '24px',
};

const footer = {
  padding: '24px',
  borderTop: '1px solid #e5e7eb',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '11px',
  color: '#9ca3af',
  margin: '4px 0',
};
