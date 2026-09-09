import { app, dialog, ipcMain } from 'electron'
import { setToolbarOpacity, syncToolbarSettings } from './toolbar-window'

function normalizeApiBaseURL(url: string) {
  return url.trim()
}

export const DEFAULT_TRANSCRIPTION_MODEL = 'fun-asr-realtime'

export function getTranscriptionModel() {
  return settings.transcriptionModel?.trim() || DEFAULT_TRANSCRIPTION_MODEL
}

ipcMain.handle('getAppVersion', () => {
  return app.getVersion()
})

ipcMain.handle('getAppSettings', () => {
  return settings
})

ipcMain.handle('updateAppSettings', (_event, _settings) => {
  const nextSettings = { ..._settings }
  if (typeof nextSettings.apiBaseURL === 'string') {
    nextSettings.apiBaseURL = normalizeApiBaseURL(nextSettings.apiBaseURL)
  }
  if (typeof nextSettings.visionApiBaseURL === 'string') {
    nextSettings.visionApiBaseURL = normalizeApiBaseURL(nextSettings.visionApiBaseURL)
  }
  Object.assign(settings, nextSettings)
  if ('hideDockIcon' in nextSettings) {
    applyDockVisibility(settings.hideDockIcon)
  }
  if ('opacity' in nextSettings) {
    setToolbarOpacity(settings.opacity)
  }
  if ('toolbarHoverDelay' in nextSettings) {
    syncToolbarSettings(settings.toolbarHoverDelay)
  }
})

/** Show/hide the macOS dock icon. No-op on other platforms. */
export function applyDockVisibility(hidden: boolean): void {
  if (process.platform !== 'darwin') return
  if (hidden) {
    app.dock?.hide()
  } else {
    app.dock?.show()
  }
}

ipcMain.handle('selectScreenshotDir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择截图保存目录'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('selectRecordDir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择录音保存目录'
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

export const settings = {
  apiBaseURL: normalizeApiBaseURL(process.env.API_BASE_URL || ''),
  apiKey: process.env.API_KEY || '',
  model: process.env.MODEL || '',
  codeLanguage: process.env.CODE_LANGUAGE || 'typescript',
  customPrompt: '',
  codeIdeaPrompt: '',
  opacity: 0.8,
  toolbarHoverDelay: 0,
  screenshotAutoSave: false,
  screenshotDir: '',
  dashscopeApiKey: '',
  hideDockIcon: false,
  transcriptionModel: '',
  ttsProvider: 'web-speech' as 'web-speech' | 'dashscope',
  ttsEnabled: false,
  audioSource: 'system' as 'system' | 'microphone',
  systemAudioDeviceId: '',
  micDeviceId: '',
  recordDir: '',
  recordEnabled: false,
  recordSaveScreenshots: true,
  useSeparateVisionModel: false,
  visionApiBaseURL: '',
  visionApiKey: '',
  visionModel: '',
  responseMode: 'interview' as 'interview' | 'core-code' | 'acm' | 'custom',
  voiceWordLimit: 500,
  aiAnswerFontSize: 12,
  statusBarShortcutHints: [
    'appendScreenshot',
    'takeScreenshot',
    'toggleResponseMode',
    'codeIdea',
    'alternativeSolution',
    'voiceQuery'
  ] as Array<
    | 'hideOrShowMainWindow'
    | 'ignoreOrEnableMouse'
    | 'appendScreenshot'
    | 'takeScreenshot'
    | 'stopSolutionStream'
    | 'toggleResponseMode'
    | 'codeIdea'
    | 'alternativeSolution'
    | 'toggleTranscription'
    | 'clearTranscription'
    | 'pageUp'
    | 'pageDown'
    | 'contentScrollUp'
    | 'contentScrollDown'
    | 'resetAnswerFontSize'
    | 'decreaseAnswerFontSize'
    | 'increaseAnswerFontSize'
    | 'increaseOpacity'
    | 'decreaseOpacity'
    | 'moveMainWindowUp'
    | 'moveMainWindowDown'
    | 'moveMainWindowLeft'
    | 'moveMainWindowRight'
    | 'voiceQuery'
    | 'startRecording'
    | 'stopRecording'
  >
}

export type AppSettings = typeof settings
