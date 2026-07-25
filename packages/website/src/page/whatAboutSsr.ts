import { proseDocPage } from '../markdown'
import raw from './whatAboutSsr.md'

export const { view, tableOfContents } = proseDocPage(raw, 'what-about-ssr')
