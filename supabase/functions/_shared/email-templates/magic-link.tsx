/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandedEmail, paragraphStyle } from './branded-email.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <BrandedEmail
    preview={`Seu link de acesso ao ${siteName}`}
    title="Seu link de acesso"
    actionLabel="Acessar minha conta"
    actionUrl={confirmationUrl}
    note="Este link expira em 1 hora e só pode ser usado uma vez. Se você não solicitou este acesso, ignore este email."
  >
    <Text style={paragraphStyle}>
      Olá! Aqui está seu link de acesso rápido ao Gerir+. Clique no botão abaixo
      para entrar diretamente na sua conta.
    </Text>
  </BrandedEmail>
)

export default MagicLinkEmail

