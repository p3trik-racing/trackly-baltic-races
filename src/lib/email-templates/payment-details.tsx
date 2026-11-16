import * as React from 'react'
import { Row, pickLang } from './_layout'

export const PLATFORM_LINE = 'SIA "Trackly Studio", reg. no. 40203795568, Ūnijas iela 12A-8, Rīga, LV-1084, hello@trackly.racing'

const C = {
  en: { title: 'Payment details', seller: 'Event provided and sold by', platform: 'Booking platform', fee: 'Booking fee', vat: 'SIA Trackly Studio is not a VAT payer' },
  ru: { title: 'Детали оплаты', seller: 'Мероприятие предоставляет и продаёт', platform: 'Платформа бронирования', fee: 'Сервисный сбор', vat: 'SIA Trackly Studio не является плательщиком НДС' },
  lv: { title: 'Maksājuma informācija', seller: 'Pasākumu nodrošina un pārdod', platform: 'Rezervācijas platforma', fee: 'Rezervācijas maksa', vat: 'SIA Trackly Studio nav PVN maksātājs' },
}

/** Receipt block: organiser is the seller, Trackly only the platform. No VAT number. */
export function PaymentDetails({ lang, seller, fee }: { lang?: string; seller?: string | null; fee?: string | null }) {
  const c = C[pickLang(lang)]
  return (
    <>
      <Row label={c.title} value=" " />
      <Row label={c.seller} value={seller || '—'} />
      <Row label={c.platform} value={PLATFORM_LINE} />
      <Row label={c.fee} value={fee ?? undefined} />
      <Row label=" " value={c.vat} />
    </>
  )
}
