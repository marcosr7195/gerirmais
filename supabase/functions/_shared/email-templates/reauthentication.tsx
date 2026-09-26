/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandedEmail, paragraphStyle } from './branded-email.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandedEmail
    preview="Seu código de verificação do Gerir+"
    title="Confirme sua identidade"
    note="Este código expira em breve. Se você não solicitou esta verificação, ignore este email com segurança."
  >
    <Text style={paragraphStyle}>
      Olá! Use o código abaixo para confirmar sua identidade no Gerir+:
    </Text>
    <Text style={codeStyle}>{token}</Text>
  </BrandedEmail>
)

export default ReauthenticationEmail

const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: '700' as const,
  color: '#1E293B',
  letterSpacing: '4px',
  margin: '0 0 30px',
  textAlign: 'center' as const,
}
