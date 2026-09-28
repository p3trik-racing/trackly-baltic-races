import * as React from 'react'
import type { TemplateEntry } from './registry'
import { A, Btn, Code, Layout, P, Row, mapsUrl, pickLang } from './_layout'

const C = {
  en: { subject: (t: string) => `Tomorrow: ${t}`, title: 'See you tomorrow!', intro: (t: string) => `A quick reminder — ${t} is tomorrow.`, when: 'Time', where: 'Location', maps: 'Open in Google Maps', req: 'Bring / requirements', code: 'Check-in code', btn: 'Open my check-in pass', shot: 'Take a screenshot of your pass now — there may be no signal at the track.' },
  ru: { subject: (t: string) => `Завтра: ${t}`, title: 'До встречи завтра!', intro: (t: string) => `Напоминаем — ${t} уже завтра.`, when: 'Время', where: 'Место', maps: 'Открыть в Google Maps', req: 'Взять с собой / требования', code: 'Код регистрации', btn: 'Открыть пропуск', shot: 'Сделайте скриншот пропуска сейчас — на треке может не быть связи.' },
  lv: { subject: (t: string) => `Rīt: ${t}`, title: 'Tiekamies rīt!', intro: (t: string) => `Atgādinājums — ${t} ir jau rīt.`, when: 'Laiks', where: 'Vieta', maps: 'Atvērt Google Maps', req: 'Paņem līdzi / prasības', code: 'Reģistrācijas kods', btn: 'Atvērt manu caurlaidi', shot: 'Uztaisi caurlaides ekrānuzņēmumu jau tagad — trasē var nebūt zonas.' },
}

interface Props { lang?: string; eventTitle?: string; when?: string; location?: string; requirements?: string[]; code?: string; passUrl?: string }

const Email = (p: Props) => {
  const l = pickLang(p.lang); const c = C[l]
  const maps = mapsUrl(p.location)
  return (
    <Layout lang={l} preview={c.intro(p.eventTitle ?? '')} title={c.title}>
      <P>{c.intro(p.eventTitle ?? '')}</P>
      <Row label={c.when} value={p.when} />
      <Row label={c.where} value={p.location ? <>{p.location}{maps && <><br /><A href={maps}>{c.maps}</A></>}</> : undefined} />
      <Row label={c.req} value={p.requirements?.length ? p.requirements.join(' · ') : undefined} />
      {p.code && (<><Row label={c.code} value=" " /><Code>{p.code}</Code></>)}
      {p.passUrl && <Btn href={p.passUrl}>{c.btn}</Btn>}
      <P>{c.shot}</P>
    </Layout>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => C[pickLang(d.lang)].subject(d.eventTitle ?? 'Majorka Racing'),
  displayName: 'Event reminder (24 h)',
  previewData: { eventTitle: 'Biķernieki Track Day', when: '12 October 2026 · 09:00', location: 'Biķernieki, Riga', requirements: ['Helmet'], code: '3F9A2C7B', passUrl: 'https://majorkaracing.com/booking/x' },
} satisfies TemplateEntry
