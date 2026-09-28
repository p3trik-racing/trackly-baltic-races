import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, P, SITE, pickLang } from './_layout'

const A = {
  en: { subject: "You're approved as a Majorka Racing organiser", title: "You're approved!", body: "You're approved as a Majorka Racing organiser. Open Profile → Organiser Dashboard to post events. You set your own prices, spots and rules. Majorka Special events stay Majorka-only.", btn: 'Open Organiser Dashboard' },
  ru: { subject: 'Вы одобрены как организатор Majorka Racing', title: 'Вы одобрены!', body: 'Вы одобрены как организатор Majorka Racing. Откройте Профиль → Панель организатора, чтобы публиковать события. Цены, места и правила устанавливаете вы. События Majorka Special остаются только за Majorka.', btn: 'Открыть панель организатора' },
  lv: { subject: 'Tu esi apstiprināts kā Majorka Racing organizators', title: 'Tu esi apstiprināts!', body: 'Tu esi apstiprināts kā Majorka Racing organizators. Atver Profils → Organizatora panelis, lai publicētu pasākumus. Cenas, vietas un noteikumus nosaki tu. Majorka Special pasākumi paliek tikai Majorka.', btn: 'Atvērt organizatora paneli' },
}
const R = {
  en: { subject: 'Your Majorka Racing organiser application', title: 'About your application', body: "Thanks for applying. We can't approve your organiser account right now.", note: 'Note from our team:' },
  ru: { subject: 'Ваша заявка организатора Majorka Racing', title: 'О вашей заявке', body: 'Спасибо за заявку. Сейчас мы не можем одобрить ваш аккаунт организатора.', note: 'Комментарий команды:' },
  lv: { subject: 'Tavs Majorka Racing organizatora pieteikums', title: 'Par tavu pieteikumu', body: 'Paldies par pieteikumu. Pašlaik nevaram apstiprināt tavu organizatora kontu.', note: 'Komandas piezīme:' },
}

const Approved = ({ lang }: { lang?: string }) => {
  const l = pickLang(lang); const c = A[l]
  return (
    <Layout lang={l} preview={c.subject} title={c.title}>
      <P>{c.body}</P>
      <Btn href={`${SITE}/organiser`}>{c.btn}</Btn>
    </Layout>
  )
}

const Rejected = ({ lang, note }: { lang?: string; note?: string | null }) => {
  const l = pickLang(lang); const c = R[l]
  return (
    <Layout lang={l} preview={c.body} title={c.title}>
      <P>{c.body}</P>
      {note ? <P>{c.note}{'\n'}{note}</P> : null}
    </Layout>
  )
}

export const approvedTemplate = {
  component: Approved,
  subject: (d: Record<string, any>) => A[pickLang(d.lang)].subject,
  displayName: 'Organiser approved',
  previewData: {},
} satisfies TemplateEntry

export const rejectedTemplate = {
  component: Rejected,
  subject: (d: Record<string, any>) => R[pickLang(d.lang)].subject,
  displayName: 'Organiser not approved',
  previewData: { note: 'Please add your insurance details and reapply.' },
} satisfies TemplateEntry
