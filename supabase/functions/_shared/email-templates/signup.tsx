/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import { Text } from 'npm:@react-email/components@0.0.22'
import { BrandedEmail, paragraphStyle } from './branded-email.tsx'

interface SignupEmailProps {
  siteName: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  confirmationUrl,
}: SignupEmailProps) => (
  <BrandedEmail
    preview={`Confirme seu cadastro no ${siteName}`}
    title="Confirme seu cadastro"
    actionLabel="Confirmar meu email"
    actionUrl={confirmationUrl}
    note="Se você não criou uma conta no Gerir+, ignore este email com segurança."
  >
    <Text style={paragraphStyle}>
      Olá! Seja bem-vindo ao Gerir+. Estamos felizes em ter você aqui. Clique no
      botão abaixo para confirmar seu email e começar a organizar seu negócio.
    </Text>
  </BrandedEmail>
)

export default SignupEmail

