/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandedEmail, paragraphStyle } from './branded-email.tsx'

interface InviteEmailProps {
  siteName: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  confirmationUrl,
}: InviteEmailProps) => (
  <BrandedEmail
    preview={`Você foi convidado para o ${siteName}`}
    title="Você foi convidado"
    actionLabel="Aceitar convite"
    actionUrl={confirmationUrl}
    note="Se você não esperava este convite, pode ignorar este email com segurança."
  >
    <Text style={paragraphStyle}>
      Olá! Você foi convidado para fazer parte de uma equipe no Gerir+. Clique
      no botão abaixo para aceitar o convite e começar a colaborar.
    </Text>
  </BrandedEmail>
)

export default InviteEmail

