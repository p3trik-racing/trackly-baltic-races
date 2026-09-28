import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components'

export type EmailLang = 'en' | 'ru' | 'lv'
export const SITE = 'https://majorkaracing.com'

export function pickLang(l?: string): EmailLang {
  return l === 'ru' || l === 'lv' ? l : 'en'
}

export function Layout({ lang = 'en', preview, title, children }: {
  lang?: EmailLang; preview: string; title: string; children: React.ReactNode
}) {
  return (
    <Html lang={lang} dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>MAJORKA RACING</Text>
          <Heading style={h1}>{title}</Heading>
          {children}
          <Hr style={hr} />
          <Text style={footer}>
            Majorka Racing · <Link href={SITE} style={link}>majorkaracing.com</Link> · admin@majorkariga.com
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const P = ({ children }: { children: React.ReactNode }) => <Text style={text}>{children}</Text>

export function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null
  return (
    <Text style={rowText}>
      <span style={rowLabel}>{label}</span><br />{value}
    </Text>
  )
}

export const Btn = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={{ margin: '8px 0 24px' }}>
    <Button href={href} style={button}>{children}</Button>
  </Section>
)

export const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} style={link}>{children}</Link>
)

export const Qr = ({ src }: { src: string }) => (
  <Section style={{ margin: '0 0 16px' }}>
    <Img src={src} width="220" height="220" alt="QR" style={{ border: '1px solid #e5e5e5', borderRadius: '8px' }} />
  </Section>
)

export const Code = ({ children }: { children: React.ReactNode }) => (
  <Text style={code}>{children}</Text>
)

export function mapsUrl(q?: string | null) {
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : undefined
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 25px', maxWidth: '560px' }
const brand = { fontSize: '12px', letterSpacing: '3px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 18px', whiteSpace: 'pre-wrap' as const }
const rowText = { fontSize: '14px', color: '#000000', lineHeight: '1.4', margin: '0 0 12px' }
const rowLabel = { fontSize: '12px', color: '#999999' }
const link = { color: '#000000', textDecoration: 'underline' }
const button = {
  backgroundColor: '#000000', color: '#ffffff', fontSize: '14px', border: '1px solid #000000',
  borderRadius: '8px', padding: '14px 22px', textDecoration: 'none', fontWeight: 'bold' as const,
}
const code = { fontFamily: 'Menlo, Consolas, monospace', fontSize: '24px', letterSpacing: '4px', fontWeight: 'bold' as const, color: '#000000', margin: '0 0 8px' }
const hr = { borderColor: '#e5e5e5', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
