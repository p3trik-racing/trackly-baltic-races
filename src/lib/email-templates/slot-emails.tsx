import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Code, Layout, P, Row, SITE, pickLang, type EmailLang } from './_layout'

type D = Record<string, any>

const L = {
  en: {
    date: 'Date', time: 'Time', venue: 'Track', driver: 'Driver', email: 'Email', phone: 'Phone', cars: 'Cars / spots',
    amount: 'Amount', share: 'Your share', payment: 'Payment', pending: 'pending (online payments not live yet)',
    split: 'Split group', code: 'Check-in code', type: 'Type', ref: 'Booking',
    splitLine: (d: D) => `${d.taken ?? 0}/${d.maxCars ?? '?'} cars · min ${d.minCars ?? '?'} · deadline ${d.deadline ?? ''}`,
    types: { whole: 'Whole track', split_start: 'Split group started', split_join: 'Driver joined split', cancelled: 'Booking cancelled' } as D,
    ownerSubject: (d: D) => `New track booking — ${d.venue ?? ''} ${d.date ?? ''}`,
    openTracks: 'Open My tracks', openPass: 'Open my pass',
    confSubject: (d: D) => `Track time booked — ${d.venue ?? ''} ${d.date ?? ''}`,
    confTitle: { whole: 'You booked the whole track', split_start: 'You started a split group', split_join: 'You joined a split group' } as D,
    rules: (d: D) => `Deadline ${d.deadline ?? ''}. If at least ${d.minCars ?? '?'} cars join by then, it goes ahead and the host covers any empty spots. If not, it's cancelled and nobody pays.`,
    cancSubject: (d: D) => `Track booking cancelled — ${d.venue ?? ''} ${d.date ?? ''}`,
    cancBody: 'Your track booking has been cancelled. Nothing to pay.',
    hostSubject: (d: D) => `Split group cancelled — ${d.venue ?? ''} ${d.date ?? ''}`,
    hostBody: 'The host cancelled this split group, so your spot is cancelled too. Nothing to pay.',
    onSubject: (d: D) => `Your track time is ON — ${d.cars ?? ''} cars`,
    failSubject: () => 'Not enough drivers — cancelled, nothing to pay',
    onBody: (d: D) => `${d.cars} cars joined — your track time at ${d.venue} is going ahead.`,
    failBody: (d: D) => `Only ${d.cars ?? 0} of the minimum ${d.minCars} cars joined by the deadline, so the session is cancelled. Nobody pays.`,
    hostGap: (d: D) => `You cover €${d.hostGap} for empty spots.`,
    ownerOn: (d: D) => `Split group ON — ${d.venue ?? ''} ${d.date ?? ''}`,
    ownerFail: (d: D) => `Split group cancelled — ${d.venue ?? ''} ${d.date ?? ''}`,
    total: 'Total price',
  },
  ru: {
    date: 'Дата', time: 'Время', venue: 'Трасса', driver: 'Водитель', email: 'Email', phone: 'Телефон', cars: 'Машины / места',
    amount: 'Сумма', share: 'Твоя доля', payment: 'Оплата', pending: 'ожидается (онлайн-оплата ещё не работает)',
    split: 'Сплит-группа', code: 'Код чек-ина', type: 'Тип', ref: 'Бронь',
    splitLine: (d: D) => `${d.taken ?? 0}/${d.maxCars ?? '?'} машин · мин. ${d.minCars ?? '?'} · дедлайн ${d.deadline ?? ''}`,
    types: { whole: 'Вся трасса', split_start: 'Создана сплит-группа', split_join: 'Водитель присоединился к сплиту', cancelled: 'Бронь отменена' } as D,
    ownerSubject: (d: D) => `Новая бронь трассы — ${d.venue ?? ''} ${d.date ?? ''}`,
    openTracks: 'Открыть Мои трассы', openPass: 'Открыть пропуск',
    confSubject: (d: D) => `Время на трассе забронировано — ${d.venue ?? ''} ${d.date ?? ''}`,
    confTitle: { whole: 'Ты забронировал всю трассу', split_start: 'Ты создал сплит-группу', split_join: 'Ты присоединился к сплит-группе' } as D,
    rules: (d: D) => `Дедлайн ${d.deadline ?? ''}. Если к этому времени наберётся минимум ${d.minCars ?? '?'} машин, заезд состоится, а организатор группы покроет пустые места. Если нет — отмена, никто не платит.`,
    cancSubject: (d: D) => `Бронь трассы отменена — ${d.venue ?? ''} ${d.date ?? ''}`,
    cancBody: 'Твоя бронь трассы отменена. Платить ничего не нужно.',
    hostSubject: (d: D) => `Сплит-группа отменена — ${d.venue ?? ''} ${d.date ?? ''}`,
    hostBody: 'Организатор группы отменил сплит, поэтому твоё место тоже отменено. Платить ничего не нужно.',
    onSubject: (d: D) => `Твоё время на трассе состоится — ${d.cars ?? ''} машин`,
    failSubject: () => 'Недостаточно водителей — отмена, платить не нужно',
    onBody: (d: D) => `Набралось ${d.cars} машин — заезд на ${d.venue} состоится.`,
    failBody: (d: D) => `К дедлайну набралось только ${d.cars ?? 0} из минимальных ${d.minCars} машин, поэтому заезд отменён. Никто не платит.`,
    hostGap: (d: D) => `Ты покрываешь €${d.hostGap} за пустые места.`,
    ownerOn: (d: D) => `Сплит-группа состоится — ${d.venue ?? ''} ${d.date ?? ''}`,
    ownerFail: (d: D) => `Сплит-группа отменена — ${d.venue ?? ''} ${d.date ?? ''}`,
    total: 'Полная цена',
  },
  lv: {
    date: 'Datums', time: 'Laiks', venue: 'Trase', driver: 'Braucējs', email: 'E-pasts', phone: 'Tālrunis', cars: 'Auto / vietas',
    amount: 'Summa', share: 'Tava daļa', payment: 'Maksājums', pending: 'gaida (tiešsaistes maksājumi vēl nedarbojas)',
    split: 'Dalītā grupa', code: 'Ierašanās kods', type: 'Veids', ref: 'Rezervācija',
    splitLine: (d: D) => `${d.taken ?? 0}/${d.maxCars ?? '?'} auto · min. ${d.minCars ?? '?'} · termiņš ${d.deadline ?? ''}`,
    types: { whole: 'Visa trase', split_start: 'Izveidota dalītā grupa', split_join: 'Braucējs pievienojās dalītajai grupai', cancelled: 'Rezervācija atcelta' } as D,
    ownerSubject: (d: D) => `Jauna trases rezervācija — ${d.venue ?? ''} ${d.date ?? ''}`,
    openTracks: 'Atvērt Manas trases', openPass: 'Atvērt caurlaidi',
    confSubject: (d: D) => `Trases laiks rezervēts — ${d.venue ?? ''} ${d.date ?? ''}`,
    confTitle: { whole: 'Tu rezervēji visu trasi', split_start: 'Tu izveidoji dalīto grupu', split_join: 'Tu pievienojies dalītajai grupai' } as D,
    rules: (d: D) => `Termiņš ${d.deadline ?? ''}. Ja līdz tam pievienojas vismaz ${d.minCars ?? '?'} auto, brauciens notiek un grupas veidotājs sedz tukšās vietas. Ja nē — tas tiek atcelts un neviens nemaksā.`,
    cancSubject: (d: D) => `Trases rezervācija atcelta — ${d.venue ?? ''} ${d.date ?? ''}`,
    cancBody: 'Tava trases rezervācija ir atcelta. Nekas nav jāmaksā.',
    hostSubject: (d: D) => `Dalītā grupa atcelta — ${d.venue ?? ''} ${d.date ?? ''}`,
    hostBody: 'Grupas veidotājs atcēla dalīto grupu, tāpēc arī tava vieta ir atcelta. Nekas nav jāmaksā.',
    onSubject: (d: D) => `Tavs trases laiks notiek — ${d.cars ?? ''} auto`,
    failSubject: () => 'Nepietiek braucēju — atcelts, nekas nav jāmaksā',
    onBody: (d: D) => `Pievienojās ${d.cars} auto — tavs trases laiks ${d.venue} notiek.`,
    failBody: (d: D) => `Līdz termiņam pievienojās tikai ${d.cars ?? 0} no minimālajiem ${d.minCars} auto, tāpēc brauciens atcelts. Neviens nemaksā.`,
    hostGap: (d: D) => `Tu sedz €${d.hostGap} par tukšajām vietām.`,
    ownerOn: (d: D) => `Dalītā grupa notiek — ${d.venue ?? ''} ${d.date ?? ''}`,
    ownerFail: (d: D) => `Dalītā grupa atcelta — ${d.venue ?? ''} ${d.date ?? ''}`,
    total: 'Pilna cena',
  },
}
const c = (d: D) => L[pickLang(d.lang) as EmailLang]
const time = (d: D) => (d.start ? `${d.start}–${d.end ?? ''}` : '')
const money = (v: any) => (v == null || v === '' ? '' : String(v).startsWith('€') ? String(v) : `€${v}`)
const url = (d: D, fallback: string) => d.slotUrl || (d.slotId ? `${SITE}/track-slot/${d.slotId}` : fallback)

const OwnerNew = (d: D) => {
  const t = c(d); const l = pickLang(d.lang)
  return (
    <Layout lang={l} preview={t.ownerSubject(d)} title={t.ownerSubject(d)}>
      <Row label={t.type} value={t.types[d.kind] ?? d.kind} />
      <Row label={t.date} value={`${d.date ?? ''} · ${time(d)}`} />
      <Row label={t.driver} value={d.name} />
      <Row label={t.email} value={d.email} />
      <Row label={t.phone} value={d.phone} />
      <Row label={t.cars} value={d.spots} />
      <Row label={t.amount} value={money(d.amount)} />
      <Row label={t.payment} value={t.pending} />
      {d.isSplit ? <Row label={t.split} value={t.splitLine(d)} /> : null}
      <Btn href={`${SITE}/organiser/tracks`}>{t.openTracks}</Btn>
    </Layout>
  )
}

const Confirmed = (d: D) => {
  const t = c(d); const l = pickLang(d.lang)
  return (
    <Layout lang={l} preview={t.confSubject(d)} title={t.confTitle[d.kind] ?? t.confSubject(d)}>
      <Row label={t.venue} value={d.venue} />
      <Row label={t.date} value={`${d.date ?? ''} · ${time(d)}`} />
      <Row label={t.cars} value={d.spots} />
      <Row label={t.share} value={money(d.amount)} />
      <Row label={t.payment} value={t.pending} />
      {d.isSplit ? <><Row label={t.split} value={t.splitLine(d)} /><P>{t.rules(d)}</P></> : null}
      {d.code ? <><Row label={t.code} value=" " /><Code>{d.code}</Code></> : null}
      <Btn href={url(d, SITE)}>{t.openPass}</Btn>
    </Layout>
  )
}

const Cancelled = (d: D) => {
  const t = c(d); const l = pickLang(d.lang)
  return (
    <Layout lang={l} preview={t.cancSubject(d)} title={t.cancSubject(d)}>
      <P>{t.cancBody}</P>
      <Row label={t.venue} value={d.venue} />
      <Row label={t.date} value={`${d.date ?? ''} · ${time(d)}`} />
      <Row label={t.ref} value={d.reference} />
    </Layout>
  )
}

const HostCancelled = (d: D) => {
  const t = c(d); const l = pickLang(d.lang)
  return (
    <Layout lang={l} preview={t.hostSubject(d)} title={t.hostSubject(d)}>
      <P>{t.hostBody}</P>
      <Row label={t.venue} value={d.venue} />
      <Row label={t.date} value={`${d.date ?? ''} · ${time(d)}`} />
    </Layout>
  )
}

const SplitResult = (d: D) => {
  const t = c(d); const l = pickLang(d.lang); const on = d.outcome === 'confirmed'
  const subj = on ? t.onSubject(d) : t.failSubject()
  return (
    <Layout lang={l} preview={subj} title={subj}>
      <P>{on ? t.onBody(d) : t.failBody(d)}</P>
      <Row label={t.venue} value={d.venue} />
      <Row label={t.date} value={`${d.date ?? ''} · ${time(d)}`} />
      <Row label={t.cars} value={d.spots} />
      {on ? <Row label={t.share} value={money(d.perSpot != null && d.spots ? (Number(d.perSpot) * Number(d.spots)).toFixed(2) : '')} /> : null}
      {on && d.isHost && Number(d.hostGap) > 0 ? <P>{t.hostGap(d)}</P> : null}
      {on ? <Btn href={url(d, SITE)}>{t.openPass}</Btn> : null}
    </Layout>
  )
}

const OwnerSplitResult = (d: D) => {
  const t = c(d); const l = pickLang(d.lang); const on = d.outcome === 'confirmed'
  const subj = on ? t.ownerOn(d) : t.ownerFail(d)
  return (
    <Layout lang={l} preview={subj} title={subj}>
      <P>{on ? t.onBody(d) : t.failBody(d)}</P>
      <Row label={t.date} value={`${d.date ?? ''} · ${time(d)}`} />
      <Row label={t.cars} value={`${d.cars ?? 0}/${d.maxCars ?? '?'} · min ${d.minCars ?? '?'}`} />
      {on ? <Row label={t.total} value={money(d.priceTotal)} /> : null}
      <Btn href={d.manageUrl || `${SITE}/organiser/tracks`}>{t.openTracks}</Btn>
    </Layout>
  )
}

const pv = { lang: 'en', venue: 'Biķernieki', date: '12 Oct 2026', start: '10:00', end: '12:00', name: 'Jānis', email: 'j@example.com', phone: '+371 2000000', spots: 2, amount: '120.00', kind: 'split_start', isSplit: true, taken: 2, maxCars: 8, minCars: 4, deadline: '10 Oct 10:00', code: 'AB12CD', slotId: 'x' }

export const slotOwnerNewBooking = { component: OwnerNew, subject: (d: D) => c(d).ownerSubject(d), displayName: 'Track: owner new booking', previewData: pv } satisfies TemplateEntry
export const slotBookingConfirmed = { component: Confirmed, subject: (d: D) => c(d).confSubject(d), displayName: 'Track: booking confirmed', previewData: pv } satisfies TemplateEntry
export const slotBookingCancelled = { component: Cancelled, subject: (d: D) => c(d).cancSubject(d), displayName: 'Track: booking cancelled', previewData: pv } satisfies TemplateEntry
export const slotSplitCancelledByHost = { component: HostCancelled, subject: (d: D) => c(d).hostSubject(d), displayName: 'Track: split cancelled by host', previewData: pv } satisfies TemplateEntry
export const slotSplitResult = { component: SplitResult, subject: (d: D) => (d.outcome === 'confirmed' ? c(d).onSubject(d) : c(d).failSubject()), displayName: 'Track: split result', previewData: { ...pv, outcome: 'confirmed', cars: 6, perSpot: 50, isHost: true, hostGap: 100 } } satisfies TemplateEntry
export const slotOwnerSplitResult = { component: OwnerSplitResult, subject: (d: D) => (d.outcome === 'confirmed' ? c(d).ownerOn(d) : c(d).ownerFail(d)), displayName: 'Track: owner split result', previewData: { ...pv, outcome: 'confirmed', cars: 6, priceTotal: 400 } } satisfies TemplateEntry
