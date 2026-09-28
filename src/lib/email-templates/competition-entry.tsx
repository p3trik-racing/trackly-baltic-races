import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, P, SITE, pickLang } from './_layout'

const C = {
  en: { subject: (t: string) => `We got your entry for ${t}`, title: 'Entry received', body: (t: string) => `We got your entry for ${t} — Majorka will contact you within 48 h with the next steps.`, btn: 'View competition' },
  ru: { subject: (t: string) => `Мы получили вашу заявку: ${t}`, title: 'Заявка получена', body: (t: string) => `Мы получили вашу заявку на ${t} — Majorka свяжется с вами в течение 48 часов и расскажет о следующих шагах.`, btn: 'Открыть соревнование' },
  lv: { subject: (t: string) => `Saņēmām tavu pieteikumu: ${t}`, title: 'Pieteikums saņemts', body: (t: string) => `Saņēmām tavu pieteikumu ${t} — Majorka sazināsies ar tevi 48 stundu laikā par nākamajiem soļiem.`, btn: 'Skatīt sacensības' },
}

interface Props { lang?: string; competition?: string; slug?: string }

const Email = (p: Props) => {
  const l = pickLang(p.lang); const c = C[l]
  return (
    <Layout lang={l} preview={c.body(p.competition ?? '')} title={c.title}>
      <P>{c.body(p.competition ?? '')}</P>
      {p.slug && <Btn href={`${SITE}/competitions/${p.slug}`}>{c.btn}</Btn>}
    </Layout>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => C[pickLang(d.lang)].subject(d.competition ?? 'Majorka Racing'),
  displayName: 'Competition entry',
  previewData: { competition: 'Latvian Drift Series', slug: 'latvian-drift-series' },
} satisfies TemplateEntry
