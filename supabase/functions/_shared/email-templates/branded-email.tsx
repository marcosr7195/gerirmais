/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface BrandedEmailProps {
  preview: string
  title: string
  children: React.ReactNode
  actionLabel?: string
  actionUrl?: string
  note: string
}

const APP_URL = 'https://app.gerirmais.com.br'
const LOGO_URL = `${APP_URL}/__l5e/assets-v1/276c683e-dd7e-4bef-a918-f524d3539150/logo-gerirmais-oficial.png`

export const BrandedEmail = ({
  preview,
  title,
  children,
  actionLabel,
  actionUrl,
  note,
}: BrandedEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Section style={logoPanel}>
            <Img
              src={LOGO_URL}
              width="190"
              height="60"
              alt="Gerir+"
              style={logo}
            />
          </Section>
          <Text style={headerText}>Seu negócio na palma da mão</Text>
        </Section>

        <Section style={content}>
          <Text style={heading}>{title}</Text>
          {children}
          {actionLabel && actionUrl ? (
            <Section style={buttonSection}>
              <Button style={button} href={actionUrl}>
                {actionLabel}
              </Button>
            </Section>
          ) : null}
          <Text style={noteText}>{note}</Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>Gerir+ — Seu negócio na palma da mão</Text>
          <Link href={APP_URL} style={footerLink}>
            app.gerirmais.com.br
          </Link>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#F1F5F9',
  fontFamily: 'Arial, Helvetica, sans-serif',
  margin: '0',
  padding: '24px 12px',
}
const container = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  overflow: 'hidden' as const,
}
const header = {
  backgroundColor: '#2563EB',
  padding: '28px 24px 24px',
  textAlign: 'center' as const,
}
const logoPanel = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  display: 'inline-block',
  padding: '8px 16px',
}
const logo = {
  display: 'block',
  height: 'auto',
  margin: '0 auto',
  maxWidth: '190px',
  width: '100%',
}
const headerText = {
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: '600' as const,
  lineHeight: '20px',
  margin: '16px 0 0',
}
const content = { padding: '34px 38px 30px' }
const heading = {
  color: '#1E293B',
  fontSize: '24px',
  fontWeight: '700' as const,
  lineHeight: '32px',
  margin: '0 0 18px',
}
export const paragraphStyle = {
  color: '#1E293B',
  fontSize: '16px',
  lineHeight: '25px',
  margin: '0 0 24px',
}
const buttonSection = { margin: '30px 0', textAlign: 'center' as const }
const button = {
  backgroundColor: '#10B981',
  borderRadius: '8px',
  color: '#FFFFFF',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '700' as const,
  lineHeight: '20px',
  padding: '14px 24px',
  textDecoration: 'none',
}
const noteText = {
  borderTop: '1px solid #E2E8F0',
  color: '#64748B',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '28px 0 0',
  paddingTop: '20px',
}
const footer = {
  backgroundColor: '#F8FAFC',
  borderTop: '1px solid #E2E8F0',
  padding: '20px 24px',
  textAlign: 'center' as const,
}
const footerText = {
  color: '#94A3B8',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '0 0 4px',
}
const footerLink = {
  color: '#94A3B8',
  fontSize: '12px',
  lineHeight: '18px',
  textDecoration: 'underline',
}