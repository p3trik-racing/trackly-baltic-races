import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Btn, Layout, P, pickLang } from './_layout'

const C = {
  en: { subject: (t: string) => `Photos from ${t} are ready`, body: (t: string) => `The organiser has shared the photos from ${t}. Thanks for driving with us!`, btn: 'View photos' },
  ru: { subject: (t: string) => `Фото с события ${t} готовы`, body: (t: string) => `Организатор поделился фото с события ${t}. Спасибо, что был с нами на треке!`, btn: 'Смотреть фото' },
  lv: { subject: (t: string) => `Foto no ${t} ir gatavi`, body: (t: string) => `Organizators ir dalījies ar foto no ${t}. Paldies, ka brauci kopā ar mums!`, btn: 'Skatīt foto' },
}

interface Props { lang?: string; eventTitle?: string; url?: string }

const Email = (p: Props) => {
  const l = pickLang(p.lang); const c = C[l]
  const title = c.subject(p.eventTitle ?? '')
  return (
    <Layout lang={l} preview={title} title={title}>
      <P>{c.body(p.eventTitle ?? '')}</P>
      {p.url && <Btn href={p.url}>{c.btn}</Btn>}
    </Layout>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => C[pickLang(d.lang)].subject(d.eventTitle ?? 'Majorka Racing'),
  displayName: 'Event photos',
  previewData: { eventTitle: 'Biķernieki Track Day', url: 'https://photos.google.com' },
} satisfies TemplateEntry
