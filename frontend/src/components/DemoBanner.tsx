import { DEMO_NOTICE } from '../lib/constants'

/** 画面の一番上に常に出す、公開デモの案内（F-54） */
export function DemoBanner() {
  return <p className="m-0 bg-banner px-4 py-2 text-center text-sm text-white">{DEMO_NOTICE}</p>
}
