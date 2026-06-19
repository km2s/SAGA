import { cookies } from 'next/headers'
import { translations, type Locale } from './translations'

export function getServerT() {
  const locale = (cookies().get('saga-locale')?.value ?? 'pt') as Locale
  return translations[locale]
}
