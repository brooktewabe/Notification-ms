import { render } from '@react-email/render';
import React from 'react';
import { logger } from '../config/logger';
import { AccountBannedEmail, AccountBannedEmailProps } from '../templates/email/AccountBannedEmail';
import { WelcomeEmail,  WelcomeEmailProps } from '../templates/email/WelcomeEmail';

export interface EmailTemplateDefinition {
  id: string;
  name: string;
  description: string;
  defaultSubject: string;
  requiredVariables: string[];
  optionalVariables?: string[];
}

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  defaultSubject: string;
  requiredVariables: string[];
  optionalVariables?: string[];
}

class EmailTemplateService {
  private templates: Map<string, EmailTemplateDefinition> = new Map();

  constructor() {
    this.registerTemplates();
  }

  private registerTemplates() {
    this.templates.set('account-banned', {
      id: 'account-banned',
      name: 'Account Banned',
      description: 'Notifies users when their account has been suspended',
      defaultSubject: 'Important: Your account has been suspended',
      requiredVariables: ['userName','reason'],
      // optionalVariables: [ 'appealLink'],
    });
    this.templates.set('welcome', {
      id: 'welcome',
      name: 'Welcome Email',
      description: 'Welcomes users',
      defaultSubject: 'Important: Your account has been created',
      requiredVariables: ['userName'],
    });
    //**
    //  Add more templates here
    //  */
  }

  // Get all available email templates
  getAvailableTemplates(): TemplateMetadata[] {
    return Array.from(this.templates.values()).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      defaultSubject: template.defaultSubject,
      requiredVariables: template.requiredVariables,
      optionalVariables: template.optionalVariables,
    }));
  }

   // Get template definition by ID
  getTemplateDefinition(templateId: string): EmailTemplateDefinition | null {
    return this.templates.get(templateId) || null;
  }

  // Render an email template to HTML
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<{ html: string; text: string }> {
    const templateDef = this.templates.get(templateId);

    if (!templateDef) {
      throw new Error(`Template with ID "${templateId}" not found`);
    }

    // Validate required variables
    for (const requiredVar of templateDef.requiredVariables) {
      if (!(requiredVar in variables)) {
        throw new Error(`Missing required variable: ${requiredVar}`);
      }
    }

    let component: React.ReactElement;

    // Render the appropriate template component
    switch (templateId) {
      case 'account-banned':
        component = React.createElement(AccountBannedEmail, variables as AccountBannedEmailProps);
        break;
      case 'welcome':
        component = React.createElement(WelcomeEmail, variables as WelcomeEmailProps);
        break;

        //**
        //  Add more templates here
        //  */
      
      default:
        throw new Error(`Template renderer for "${templateId}" not implemented`);
    }

    try {
      const html = await render(component);
      // Generate plain text version (you can enhance this)
      const text = this.htmlToText(html);

      logger.info(`Email template "${templateId}" rendered successfully`);
      return { html, text };
    } catch (error) {
      logger.error(`Failed to render email template "${templateId}":`, error);
      throw new Error(`Failed to render template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

export const emailTemplateService = new EmailTemplateService();

