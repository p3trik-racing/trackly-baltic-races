import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, P, Row, pickLang } from './_layout'

const C = {
  en: { subject: (t: string) => `New booking: ${t}`, title: 'You have a new booking', intro: (t: string) => `Someone just booked ${t}.`, name: 'Name', spots: 'Spots', email: 'Email', phone: 'Phone', btn: 'View bookings' },
  ru: { subject: (t: string) => `Новая бронь: ${t}`, title: 'У вас новая бронь', intro: (t: string) => `Только что забронировали ${t}.`, name: 'Имя', spots: 'Мест', email: 'Email', phone: 'Телефон', btn: 'Смотреть брони' },
  lv: { subject: (t: string) => `Jauna rezervācija: ${t}`, title: 'Tev ir jauna rezervācija', intro: (t: string) => `Kāds tikko rezervēja ${t}.`, name: 'Vārds', spots: 'Vietas', email: 'E-pasts', phone: 'Tālrunis', btn: 'Skatīt rezervācijas' },
}

interface Props { lang?: string; eventTitle?: string; name?: string; spots?: number; email?: string; phone?: string; url?: string }

const Email = (p: Props) => {
  const l = pickLang(p.lang); const c = C[l]
  return (
    <Layout lang={l} preview={c.intro(p.eventTitle ?? '')} title={c.title}>
      <P>{c.intro(p.eventTitle ?? '')}</P>
      <Row label={c.name} value={p.name} />
      <Row label={c.spots} value={p.spots != null ? String(p.spots) : undefined} />
      <Row label={c.email} value={p.email} />
      <Row label={c.phone} value={p.phone} />
      {p.url && <Btn href={p.url}>{c.btn}</Btn>}
    </Layout>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => C[pickLang(d.lang)].subject(d.eventTitle ?? 'Majorka Racing'),
  displayName: 'New booking (organiser)',
  previewData: { eventTitle: 'Biķernieki Track Day', name: 'Jane Doe', spots: 2, email: 'jane@example.com', phone: '+371 20000000', url: 'https://majorkaracing.com/organiser' },
} satisfies TemplateEntry
