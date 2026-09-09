import { ipcMain } from 'electron'
import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'
import { getTranscriptionModel } from './settings'

const WS_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/'
const START_TIMEOUT_MS = 12000

let ws: WebSocket | null = null
let taskId: string | null = null
let isTranscribing = false
let taskStarted = false
let accumulatedText = ''
let currentPartial = ''
let startTimer: ReturnType<typeof setTimeout> | null = null
let startWaiters: {
  resolve: () => void
  reject: (error: Error) => void
} | null = null

function sendToRenderer(channel: string, ...args: unknown[]) {
  const mainWindow = global.mainWindow
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

function clearStartTimer() {
  if (startTimer) {
    clearTimeout(startTimer)
    startTimer = null
  }
}

function resolveStart() {
  clearStartTimer()
  if (!startWaiters) return
  const waiters = startWaiters
  startWaiters = null
  waiters.resolve()
}

function rejectStart(error: Error) {
  clearStartTimer()
  if (!startWaiters) return
  const waiters = startWaiters
  startWaiters = null
  waiters.reject(error)
}

function cleanup() {
  clearStartTimer()
  if (ws) {
    ws.removeAllListeners()
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
    }
    ws = null
  }
  taskId = null
  isTranscribing = false
  taskStarted = false
}

function failTranscription(message: string) {
  const error = new Error(message)
  console.error('Transcription failed:', message)
  sendToRenderer('transcription-error', message)
  cleanup()
  sendToRenderer('transcription-stopped')
  rejectStart(error)
}

function startTranscription(apiKey: string): Promise<void> {
  if (isTranscribing && ws && ws.readyState === WebSocket.OPEN && taskStarted) {
    return Promise.resolve()
  }

  cleanup()
  isTranscribing = true
  taskId = randomUUID()
  sendToRenderer('transcription-status', 'connecting')

  return new Promise((resolve, reject) => {
    startWaiters = { resolve, reject }
    startTimer = setTimeout(() => {
      failTranscription('语音识别连接超时。请确认百炼 Key 有效，并已开通 fun-asr-realtime。')
    }, START_TIMEOUT_MS)

    ws = new WebSocket(WS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` }
    })

    ws.on('open', () => {
      const runTask = {
        header: {
          action: 'run-task',
          task_id: taskId,
          streaming: 'duplex'
        },
        payload: {
          task_group: 'audio',
          task: 'asr',
          function: 'recognition',
          model: getTranscriptionModel(),
          parameters: {
            format: 'pcm',
            sample_rate: 16000
          },
          input: {}
        }
      }
      ws!.send(JSON.stringify(runTask))
    })

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString())
        const event = msg.header?.event

        if (event === 'task-started') {
          taskStarted = true
          sendToRenderer('transcription-status', 'listening')
          resolveStart()
          return
        }

        if (event === 'result-generated') {
          const sentence = msg.payload?.output?.sentence
          if (!sentence) return

          const text: string = sentence.text || ''
          const sentenceEnd: boolean = sentence.sentence_end === true

          if (sentenceEnd) {
            if (text) {
              accumulatedText = accumulatedText ? `${accumulatedText}\n${text}` : text
            }
            currentPartial = ''
          } else {
            currentPartial = text
          }

          sendToRenderer('transcription-text', {
            text: getTranscriptionText(),
            isPartial: !sentenceEnd
          })
          return
        }

        if (event === 'task-failed') {
          const errorMsg = msg.header?.error_message || msg.header?.error_code || '语音识别失败'
          failTranscription(String(errorMsg))
          return
        }

        if (event === 'task-finished') {
          cleanup()
          sendToRenderer('transcription-stopped')
        }
      } catch (e) {
        console.error('Failed to parse transcription message:', e)
      }
    })

    ws.on('error', (err) => {
      failTranscription(err.message || 'WebSocket 连接失败')
    })

    ws.on('close', () => {
      if (isTranscribing) {
        isTranscribing = false
        sendToRenderer('transcription-stopped')
        rejectStart(new Error('语音识别连接已关闭'))
      }
      ws = null
      taskStarted = false
    })
  })
}

function stopTranscription() {
  if (!isTranscribing && !ws) return

  if (ws && ws.readyState === WebSocket.OPEN && taskId && taskStarted) {
    const finishTask = {
      header: {
        action: 'finish-task',
        task_id: taskId,
        streaming: 'duplex'
      },
      payload: {
        input: {}
      }
    }
    ws.send(JSON.stringify(finishTask))
  }

  resolveStart()
  isTranscribing = false
  cleanup()
  sendToRenderer('transcription-stopped')
}

function handleAudioChunk(chunk: ArrayBuffer) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !taskStarted) return
  ws.send(Buffer.from(chunk))
}

export function getTranscriptionText(): string {
  return [accumulatedText, currentPartial].filter(Boolean).join('\n')
}

export function clearTranscriptionText() {
  accumulatedText = ''
  currentPartial = ''
}

const MAX_QUESTION_CHARS = 400

export function consumeLatestQuestion(): string {
  const full = getTranscriptionText().trim()
  clearTranscriptionText()
  if (!full) return ''

  const parts = full
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  let latest = parts.slice(-2).join('\n')
  if (latest.length > MAX_QUESTION_CHARS) {
    latest = latest.slice(-MAX_QUESTION_CHARS)
    const cut = latest.search(/[。！？!?\n]/)
    if (cut >= 0 && cut < latest.length - 1) {
      latest = latest.slice(cut + 1).trim()
    }
  }
  return latest
}

ipcMain.handle('start-transcription', (_event, apiKey: string) => {
  return startTranscription(apiKey)
})

ipcMain.handle('stop-transcription', () => {
  stopTranscription()
})

ipcMain.on('transcription-audio-chunk', (_event, chunk: ArrayBuffer) => {
  handleAudioChunk(chunk)
})

ipcMain.handle('get-transcription-text', () => {
  return getTranscriptionText()
})

ipcMain.handle('clear-transcription-text', () => {
  clearTranscriptionText()
})

ipcMain.handle('consume-latest-question', () => {
  return consumeLatestQuestion()
})
