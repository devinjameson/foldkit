import { docPage } from '../markdown'
import raw from './whyNoJsx.md'

export const { view, tableOfContents } = docPage(raw, 'why-no-jsx')
