import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, Row, SITE } from './_layout'

const ADMIN = 'hello@trackly.racing'

interface FieldsProps { heading?: string; fields?: [string, string][]; link?: string }

const Fields = ({ heading, fields = [], link }: FieldsProps) => (
  <Layout lang="en" preview={heading ?? 'Admin notice'} title={heading ?? 'Admin notice'}>
    {fields.map(([k, v]) => <Row key={k} label={k} value={v} />)}
    <Btn href={link ?? `${SITE}/admin`}>Open admin panel</Btn>
  </Layout>
)

export const applicationNewTemplate = {
  component: Fields,
  to: ADMIN,
  subject: (d: Record<string, any>) => `New organiser application — ${d.fullName ?? ''}${d.company ? ` (${d.company})` : ''}`,
  displayName: 'Organiser application (admin)',
  previewData: { heading: 'New organiser application', fullName: 'Jane Doe', company: 'Track Co', fields: [['Full name', 'Jane Doe'], ['Company', 'Track Co']] },
} satisfies TemplateEntry

export const competitionEntryAdminTemplate = {
  component: Fields,
  to: ADMIN,
  subject: (d: Record<string, any>) => `New competition entry — ${d.competition ?? ''} — ${d.fullName ?? ''}`,
  displayName: 'Competition entry (admin)',
  previewData: { heading: 'New competition entry', competition: 'Latvian Drift Series', fullName: 'Jane Doe', fields: [['Name', 'Jane Doe'], ['Car', 'BMW E36']] },
} satisfies TemplateEntry

export const disputeAdminTemplate = {
  component: Fields,
  to: ADMIN,
  subject: (d: Record<string, any>) => `Stripe dispute opened — ${d.amount ?? ''} — ${d.item ?? ''}`,
  displayName: 'Stripe dispute (admin)',
  previewData: { heading: 'Stripe dispute opened', amount: '€52.50', item: 'Booking AB12CD34', fields: [['Dispute', 'dp_123'], ['Reason', 'fraudulent']] },
} satisfies TemplateEntry
