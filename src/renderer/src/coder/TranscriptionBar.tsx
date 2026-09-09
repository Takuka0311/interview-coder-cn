import { useEffect, useRef } from 'react'
import { Mic } from 'lucide-react'
import { useTranscriptionStore } from '@/lib/store/transcription'
import { useShortcutsStore } from '@/lib/store/shortcuts'

function formatShortcut(key: string) {
  return key
    .replace('CommandOrControl', 'Ctrl')
    .replace('Command', 'Ctrl')
    .replace('Control', 'Ctrl')
}

export function TranscriptionBar() {
  const { isTranscribing, status, transcriptionText } = useTranscriptionStore()
  const takeScreenshotKey = useShortcutsStore((state) => state.shortcuts.takeScreenshot?.key)
  const voiceQueryKey = useShortcutsStore((state) => state.shortcuts.voiceQuery?.key)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasText = Boolean(transcriptionText.trim())

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [transcriptionText])

  if (!isTranscribing && !transcriptionText) return null

  const waitingText =
    status === 'connecting' ? '正在连接百炼语音识别...' : '正在听面试官，说话后文字会出现在这里'
  const screenshotHint = formatShortcut(takeScreenshotKey || 'Alt+Enter')
  const textHint = formatShortcut(voiceQueryKey || 'Ctrl+Q')

  return (
    <div className="absolute top-10 left-0 right-0 px-6 pb-2 z-10">
      <div className="flex flex-col gap-1 bg-gray-700/80 rounded-lg px-2 py-1">
        <div className="flex items-start gap-2">
          {isTranscribing && (
            <Mic className="w-4 h-4 mt-0.5 text-green-400 flex-shrink-0 animate-pulse" />
          )}
          <div
            ref={scrollRef}
            className="transcription-scroll text-sm text-gray-300 max-h-[4.2em] overflow-y-auto leading-[1.4em] flex-1 whitespace-pre-wrap break-words"
          >
            {transcriptionText || (isTranscribing ? waitingText : '')}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pl-6">
          <span className="text-[11px] text-gray-400">
            只发文字只带最新一句，不会把整场面试官的话都送走。快捷键 {textHint}，看屏幕用 {screenshotHint}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="text-[11px] text-green-300 hover:text-green-200 disabled:text-gray-500"
              disabled={!hasText}
              onClick={() => {
                void window.api.triggerTextAnswer()
              }}
            >
              只发文字
            </button>
            <button
              type="button"
              className="text-[11px] text-blue-300 hover:text-blue-200"
              onClick={() => {
                void window.api.triggerTakeScreenshot()
              }}
            >
              结合屏幕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
