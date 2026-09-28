import * as React from 'react'
import type { TemplateEntry } from './registry'
import { A, Btn, Code, Layout, P, Qr, Row, mapsUrl, pickLang } from './_layout'

const C = {
  en: { subject: (t: string) => `You're booked: ${t}`, title: "You're booked!", hi: (n: string) => `Hi ${n},`, intro: 'Your spot is confirmed. Here are your details.', event: 'Event', when: 'Date & time', where: 'Location', maps: 'Open in Google Maps', spots: 'Spots', paid: 'Paid now', balance: 'Balance to pay at the track', req: 'Requirements', ref: 'Booking reference', code: 'Check-in code', btn: 'Open my check-in pass', shot: 'Show your pass at the track. Tip: take a screenshot in case there is no signal.', there: 'there' },
  ru: { subject: (t: string) => `Бронь подтверждена: ${t}`, title: 'Бронь подтверждена!', hi: (n: string) => `Привет, ${n}!`, intro: 'Ваше место подтверждено. Вот детали.', event: 'Событие', when: 'Дата и время', where: 'Место', maps: 'Открыть в Google Maps', spots: 'Мест', paid: 'Оплачено сейчас', balance: 'Остаток к оплате на треке', req: 'Требования', ref: 'Номер брони', code: 'Код регистрации', btn: 'Открыть пропуск', shot: 'Покажите пропуск на треке. Совет: сделайте скриншот на случай, если не будет связи.', there: 'друг' },
  lv: { subject: (t: string) => `Rezervācija apstiprināta: ${t}`, title: 'Rezervācija apstiprināta!', hi: (n: string) => `Sveiki, ${n}!`, intro: 'Tava vieta ir apstiprināta. Lūk, detaļas.', event: 'Pasākums', when: 'Datums un laiks', where: 'Vieta', maps: 'Atvērt Google Maps', spots: 'Vietas', paid: 'Samaksāts tagad', balance: 'Atlikums maksājams trasē', req: 'Prasības', ref: 'Rezervācijas numurs', code: 'Reģistrācijas kods', btn: 'Atvērt manu caurlaidi', shot: 'Parādi caurlaidi trasē. Padoms: uztaisi ekrānuzņēmumu, ja nebūs zonas.', there: 'draugs' },
}

export interface BookingConfirmedProps {
  lang?: string; name?: string; eventTitle?: string; when?: string; location?: string; spots?: number
  paidNow?: string; balance?: string | null; requirements?: string[]; reference?: string; code?: string
  passUrl?: string; qrUrl?: string
}

const Email = (p: BookingConfirmedProps) => {
  const l = pickLang(p.lang); const c = C[l]
  const maps = mapsUrl(p.location)
  return (
    <Layout lang={l} preview={c.intro} title={c.title}>
      <P>{c.hi(p.name || c.there)} {c.intro}</P>
      <Row label={c.event} value={p.eventTitle} />
      <Row label={c.when} value={p.when} />
      <Row label={c.where} value={p.location ? <>{p.location}{maps && <><br /><A href={maps}>{c.maps}</A></>}</> : undefined} />
      <Row label={c.spots} value={p.spots != null ? String(p.spots) : undefined} />
      <Row label={c.paid} value={p.paidNow} />
      <Row label={c.balance} value={p.balance ?? undefined} />
      <Row label={c.req} value={p.requirements?.length ? p.requirements.join(' · ') : undefined} />
      <Row label={c.ref} value={p.reference} />
      {p.code && (<><Row label={c.code} value=" " /><Code>{p.code}</Code></>)}
      {p.qrUrl && <Qr src={p.qrUrl} />}
      {p.passUrl && <Btn href={p.passUrl}>{c.btn}</Btn>}
      <P>{c.shot}</P>
    </Layout>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => C[pickLang(d.lang)].subject(d.eventTitle ?? 'Majorka Racing'),
  displayName: 'Booking confirmed',
  previewData: { name: 'Jane', eventTitle: 'Biķernieki Track Day', when: '12 October 2026 · 09:00', location: 'Biķernieki, Riga', spots: 1, paidNow: '€52.50', balance: '€100.00', requirements: ['Helmet'], reference: 'AB12CD34', code: '3F9A2C7B', passUrl: 'https://majorkaracing.com/booking/x' },
} satisfies TemplateEntry
