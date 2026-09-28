import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, P, Row, SITE, pickLang } from './_layout'

const C = {
  en: { subject: (t: string) => `Event cancelled: ${t}`, title: 'This event has been cancelled', body: (t: string) => `Sorry — the organiser has cancelled ${t}. Your booking is cancelled and any payment will be refunded to your card.`, when: 'Date', ref: 'Booking reference', btn: 'Find another event' },
  ru: { subject: (t: string) => `Событие отменено: ${t}`, title: 'Событие отменено', body: (t: string) => `К сожалению, организатор отменил событие ${t}. Ваша бронь отменена, оплата будет возвращена на карту.`, when: 'Дата', ref: 'Номер брони', btn: 'Найти другое событие' },
  lv: { subject: (t: string) => `Pasākums atcelts: ${t}`, title: 'Pasākums ir atcelts', body: (t: string) => `Atvaino — organizators ir atcēlis pasākumu ${t}. Tava rezervācija ir atcelta, un maksājums tiks atmaksāts uz karti.`, when: 'Datums', ref: 'Rezervācijas numurs', btn: 'Atrast citu pasākumu' },
}

interface Props { lang?: string; eventTitle?: string; when?: string; reference?: string }

const Email = (p: Props) => {
  const l = pickLang(p.lang); const c = C[l]
  return (
    <Layout lang={l} preview={c.title} title={c.title}>
      <P>{c.body(p.eventTitle ?? '')}</P>
      <Row label={c.when} value={p.when} />
      <Row label={c.ref} value={p.reference} />
      <Btn href={`${SITE}/explore`}>{c.btn}</Btn>
    </Layout>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => C[pickLang(d.lang)].subject(d.eventTitle ?? 'Majorka Racing'),
  displayName: 'Event cancelled',
  previewData: { eventTitle: 'Biķernieki Track Day', when: '12 October 2026', reference: 'AB12CD34' },
} satisfies TemplateEntry
