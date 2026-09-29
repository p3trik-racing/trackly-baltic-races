import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, P, SITE, pickLang } from './_layout'

const G = {
  en: { subject: "You're now a Majorka Racing organiser", title: "You're an organiser!", body: "Good news — we've added you as an organiser on Majorka Racing. You can now post events from your Organiser Dashboard.", btn: 'Open dashboard' },
  ru: { subject: 'Теперь вы организатор Majorka Racing', title: 'Вы организатор!', body: 'Хорошие новости — мы добавили вас как организатора на Majorka Racing. Теперь вы можете публиковать события в Панели организатора.', btn: 'Открыть панель' },
  lv: { subject: 'Tu tagad esi Majorka Racing organizators', title: 'Tu esi organizators!', body: 'Labas ziņas — mēs tevi pievienojām kā organizatoru Majorka Racing. Tagad vari publicēt pasākumus savā Organizatora panelī.', btn: 'Atvērt paneli' },
}
const R = {
  en: { subject: 'Your Majorka Racing organiser access', title: 'Organiser access', body: "Sorry, your organiser status on Majorka Racing has been revoked, so you can no longer post new events. Your existing bookings as a participant aren't affected. If you think this is a mistake, just reply to this email." },
  ru: { subject: 'Ваш доступ организатора Majorka Racing', title: 'Доступ организатора', body: 'К сожалению, ваш статус организатора на Majorka Racing отозван, поэтому вы больше не можете публиковать новые события. Ваши бронирования как участника не затронуты. Если вы считаете это ошибкой, просто ответьте на это письмо.' },
  lv: { subject: 'Tava Majorka Racing organizatora piekļuve', title: 'Organizatora piekļuve', body: 'Diemžēl tavs organizatora statuss Majorka Racing ir atsaukts, tāpēc vairs nevari publicēt jaunus pasākumus. Tavas esošās rezervācijas kā dalībniekam netiek ietekmētas. Ja domā, ka tā ir kļūda, vienkārši atbildi uz šo e-pastu.' },
}

const Granted = ({ lang }: { lang?: string }) => {
  const l = pickLang(lang); const c = G[l]
  return (
    <Layout lang={l} preview={c.subject} title={c.title}>
      <P>{c.body}</P>
      <Btn href={`${SITE}/organiser`}>{c.btn}</Btn>
    </Layout>
  )
}

const Revoked = ({ lang }: { lang?: string }) => {
  const l = pickLang(lang); const c = R[l]
  return (
    <Layout lang={l} preview={c.subject} title={c.title}>
      <P>{c.body}</P>
    </Layout>
  )
}

export const grantedTemplate = {
  component: Granted,
  subject: (d: Record<string, any>) => G[pickLang(d.lang)].subject,
  displayName: 'Organiser role granted',
  previewData: {},
} satisfies TemplateEntry

export const revokedTemplate = {
  component: Revoked,
  subject: (d: Record<string, any>) => R[pickLang(d.lang)].subject,
  displayName: 'Organiser role revoked',
  previewData: {},
} satisfies TemplateEntry
