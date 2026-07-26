import { docPage } from '../markdown'
import raw from './gettingStarted.md'

export const { view, tableOfContents } = docPage(raw, 'getting-started')
