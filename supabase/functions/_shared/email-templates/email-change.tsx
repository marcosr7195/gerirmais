/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandedEmail, paragraphStyle } from './branded-email.tsx'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <BrandedEmail
    preview={`Confirme a alteração do seu email no ${siteName}`}
    title="Confirme seu novo email"
    actionLabel="Confirmar novo email"
    actionUrl={confirmationUrl}
    note="Se você não solicitou esta alteração, proteja sua conta imediatamente."
  >
    <Text style={paragraphStyle}>
      Olá! Recebemos uma solicitação para alterar o email da sua conta de{' '}
      <strong>{oldEmail}</strong> para <strong>{newEmail}</strong>. Clique no
      botão abaixo para confirmar a alteração.
    </Text>
  </BrandedEmail>
)

export default EmailChangeEmail

