import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, P, Row, SITE, pickLang } from './_layout'

const C = {
  en: { subject: (t: string) => `Booking cancelled: ${t}`, title: 'Your booking is cancelled', body: 'You cancelled your booking at least 48 hours before the event.', refund: (a: string) => `Refunded: ${a} to your card (the 5% platform fee is non-refundable). Card refunds usually take 5–10 days.`, free: 'This was a free booking, so there is nothing to refund.', event: 'Event', ref: 'Booking reference', btn: 'Find another event' },
  ru: { subject: (t: string) => `Бронь отменена: ${t}`, title: 'Ваша бронь отменена', body: 'Вы отменили бронь минимум за 48 часов до события.', refund: (a: string) => `Возврат: ${a} на вашу карту (сервисный сбор 5% не возвращается). Обычно возврат занимает 5–10 дней.`, free: 'Бронь была бесплатной, возвращать нечего.', event: 'Событие', ref: 'Номер брони', btn: 'Найти другое событие' },
  lv: { subject: (t: string) => `Rezervācija atcelta: ${t}`, title: 'Tava rezervācija ir atcelta', body: 'Tu atcēli rezervāciju vismaz 48 stundas pirms pasākuma.', refund: (a: string) => `Atmaksāts: ${a} uz tavu karti (5% platformas maksa netiek atmaksāta). Parasti atmaksa aizņem 5–10 dienas.`, free: 'Rezervācija bija bezmaksas, nav ko atmaksāt.', event: 'Pasākums', ref: 'Rezervācijas numurs', btn: 'Atrast citu pasākumu' },
}

interface Props { lang?: string; eventTitle?: string; refunded?: string | null; reference?: string }

const Email = (p: Props) => {
  const l = pickLang(p.lang); const c = C[l]
  return (
    <Layout lang={l} preview={c.title} title={c.title}>
      <P>{c.body}</P>
      <P>{p.refunded ? c.refund(p.refunded) : c.free}</P>
      <Row label={c.event} value={p.eventTitle} />
      <Row label={c.ref} value={p.reference} />
      <Btn href={`${SITE}/explore`}>{c.btn}</Btn>
    </Layout>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => C[pickLang(d.lang)].subject(d.eventTitle ?? 'Majorka Racing'),
  displayName: 'Booking cancelled',
  previewData: { eventTitle: 'Biķernieki Track Day', refunded: '€50.00', reference: 'AB12CD34' },
} satisfies TemplateEntry
