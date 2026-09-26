/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandedEmail, paragraphStyle } from './branded-email.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <BrandedEmail
    preview={`Redefinir senha do ${siteName}`}
    title="Redefinir sua senha"
    actionLabel="Redefinir minha senha"
    actionUrl={confirmationUrl}
    note="Este link expira em 24 horas. Se você não solicitou a redefinição, ignore este email — sua senha permanece a mesma."
  >
    <Text style={paragraphStyle}>
      Olá! Recebemos uma solicitação para redefinir a senha da sua conta no
      Gerir+. Clique no botão abaixo para criar uma nova senha.
    </Text>
  </BrandedEmail>
)

export default RecoveryEmail

