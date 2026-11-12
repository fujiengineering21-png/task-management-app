import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** テストの間だけ、API の代わりに作り物の返事を返すサーバー */
export const server = setupServer(...handlers)
