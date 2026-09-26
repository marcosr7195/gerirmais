import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { BrandedEmail, paragraphStyle } from '../email-templates/branded-email.tsx'

const ROLES: Record<string, string> = {
  manager: 'gerente',
  collaborator: 'colaborador',
  viewer: 'visualizador',
}

interface Props {
  unitName?: string
  role?: string
  inviteUrl?: string
}

const TeamInvite = ({ unitName, role, inviteUrl }: Props) => (
  <BrandedEmail
    preview={`Você foi convidado para ${unitName || 'uma equipe'} no Gerir+`}
    title="Você foi convidado"
    actionLabel="Aceitar convite"
    actionUrl={inviteUrl || 'https://app.gerirmais.com.br'}
    note="O convite é válido por 7 dias. Se você não esperava este convite, pode ignorar este email com segurança."
  >
    <Text style={paragraphStyle}>
      Olá! Você foi convidado para fazer parte da equipe de{' '}
      <strong>{unitName || 'um negócio'}</strong> no Gerir+
      {role && ROLES[role] ? ` como ${ROLES[role]}` : ''}. Clique no botão abaixo
      para aceitar o convite. Se ainda não tem conta, crie com este mesmo email.
    </Text>
  </BrandedEmail>
)

export const template = {
  component: TeamInvite,
  subject: (d: Record<string, any>) =>
    `Você foi convidado para ${d.unitName || 'uma equipe'} no Gerir+`,
  displayName: 'Convite de equipe',
  previewData: { unitName: 'Negócio Teste', role: 'manager', inviteUrl: 'https://app.gerirmais.com.br/convite/exemplo' },
} satisfies TemplateEntry
