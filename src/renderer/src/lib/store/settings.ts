import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import codingPrompt from './prompts/coding.md?raw'
import englishExamPrompt from './prompts/english-exam.md?raw'
import aptitudeTestPrompt from './prompts/aptitude-test.md?raw'
import generalQaPrompt from './prompts/general-qa.md?raw'

export const AI_ANSWER_FONT_SIZE_DEFAULT = 12
export const AI_ANSWER_FONT_SIZE_MIN = 10
export const AI_ANSWER_FONT_SIZE_MAX = 20

export const OPACITY_MIN = 0.1
export const OPACITY_MAX = 1
export const OPACITY_STEP = 0.05

export function clampAiAnswerFontSize(value: number) {
  if (!Number.isFinite(value)) return AI_ANSWER_FONT_SIZE_DEFAULT
  return Math.min(AI_ANSWER_FONT_SIZE_MAX, Math.max(AI_ANSWER_FONT_SIZE_MIN, Math.round(value)))
}

export interface PromptScene {
  id: string
  name: string
  prompt: string
  isPreset: boolean
}

export const CODING_SCENE_ID = 'coding'

/** Default prompts for all preset scenes, maintained as Markdown files under ./prompts */
export const PRESET_SCENE_PROMPTS: Record<string, string> = {
  [CODING_SCENE_ID]: codingPrompt,
  'english-exam': englishExamPrompt,
  'aptitude-test': aptitudeTestPrompt,
  'general-qa': generalQaPrompt
}

const createPresetScenes = (): PromptScene[] => [
  {
    id: CODING_SCENE_ID,
    name: '解算法题',
    prompt: PRESET_SCENE_PROMPTS[CODING_SCENE_ID],
    isPreset: true
  },
  {
    id: 'english-exam',
    name: '英语考试',
    prompt: PRESET_SCENE_PROMPTS['english-exam'],
    isPreset: true
  },
  {
    id: 'aptitude-test',
    name: '能力测评',
    prompt: PRESET_SCENE_PROMPTS['aptitude-test'],
    isPreset: true
  },
  {
    id: 'general-qa',
    name: '通用问答',
    prompt: PRESET_SCENE_PROMPTS['general-qa'],
    isPreset: true
  }
]

/** Derive the `customPrompt` (used when responseMode is custom) from the active scene */
function composeCustomPrompt(scenes: PromptScene[], activeSceneId: string): string {
  const scene = scenes.find((s) => s.id === activeSceneId)
  if (!scene) return PRESET_SCENE_PROMPTS[CODING_SCENE_ID]
  return scene.prompt.trim() || PRESET_SCENE_PROMPTS[scene.id] || ''
}

/** How captured screenshots are shown on the main page, ordered by how much room they take */
export type ScreenshotDisplay = 'none' | 'count' | 'gallery'

interface Settings {
  // theme: 'light' | 'dark'an
  apiBaseURL: string
  apiKey: string
  model: string
  customModels: string[]
  customPrompt: string
  codeIdeaPrompt: string

  scenes: PromptScene[]
  activeSceneId: string

  opacity: number
  resizable: boolean
  showOverlayToolbar: boolean
  toolbarHoverDelay: number
  screenshotDisplay: ScreenshotDisplay
  codeLanguage: string

  screenshotAutoSave: boolean
  screenshotDir: string

  dashscopeApiKey: string
  transcriptionModel: string
  hideDockIcon: boolean

  ttsProvider: 'web-speech' | 'dashscope'
  ttsEnabled: boolean
  audioSource: 'system' | 'microphone'
  systemAudioDeviceId: string
  micDeviceId: string
  ttsVoice: string
  recordDir: string
  recordEnabled: boolean
  recordSaveScreenshots: boolean
  useSeparateVisionModel: boolean
  visionApiBaseURL: string
  visionApiKey: string
  visionModel: string
  responseMode: 'interview' | 'core-code' | 'acm' | 'custom'
  voiceWordLimit: number
  aiAnswerFontSize: number
  statusBarShortcutHints: StatusBarShortcutHintAction[]
}

export type StatusBarShortcutHintAction =
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

export const defaultStatusBarShortcutHints: StatusBarShortcutHintAction[] = [
  'appendScreenshot',
  'takeScreenshot',
  'toggleResponseMode',
  'codeIdea',
  'alternativeSolution',
  'voiceQuery'
]

function normalizeApiBaseURL(url: string) {
  return url.trim()
}

function normalizeSettings(settings: Partial<Settings>) {
  const next = { ...settings }
  if (typeof next.apiBaseURL === 'string') {
    next.apiBaseURL = normalizeApiBaseURL(next.apiBaseURL)
  }
  if (typeof next.visionApiBaseURL === 'string') {
    next.visionApiBaseURL = normalizeApiBaseURL(next.visionApiBaseURL)
  }
  if (typeof next.aiAnswerFontSize === 'number') {
    next.aiAnswerFontSize = clampAiAnswerFontSize(next.aiAnswerFontSize)
  }
  return next
}

interface SettingsStore extends Settings {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  adjustOpacity: (delta: number) => void
  syncSettings: (settings: Partial<Settings>) => void
  setActiveScene: (id: string) => void
  updateScenePrompt: (id: string, prompt: string) => void
  addScene: (name: string) => string
  removeScene: (id: string) => void
}

const defaultSettings: Settings = {
  apiBaseURL: '',
  apiKey: '',
  model: '',
  customModels: [],
  customPrompt: '',
  codeIdeaPrompt: '',
  scenes: createPresetScenes(),
  activeSceneId: CODING_SCENE_ID,
  codeLanguage: '',

  opacity: 0.8,
  resizable: true,
  showOverlayToolbar: true,
  toolbarHoverDelay: 1000,
  screenshotDisplay: 'gallery',

  screenshotAutoSave: false,
  screenshotDir: '',

  dashscopeApiKey: '',
  transcriptionModel: '',
  hideDockIcon: false,

  ttsProvider: 'web-speech' as const,
  ttsEnabled: false,
  audioSource: 'system' as const,
  systemAudioDeviceId: '',
  micDeviceId: '',
  ttsVoice: '',
  recordDir: '',
  recordEnabled: false,
  recordSaveScreenshots: true,
  useSeparateVisionModel: false,
  visionApiBaseURL: '',
  visionApiKey: '',
  visionModel: '',
  responseMode: 'interview' as const,
  voiceWordLimit: 500,
  aiAnswerFontSize: AI_ANSWER_FONT_SIZE_DEFAULT,
  statusBarShortcutHints: defaultStatusBarShortcutHints
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      updateSetting: (key, value) => {
        set(normalizeSettings({ [key]: value } as Partial<Settings>))
      },
      adjustOpacity: (delta) => {
        const raw = get().opacity + delta
        const opacity = Math.min(OPACITY_MAX, Math.max(OPACITY_MIN, Math.round(raw * 100) / 100))
        set({ opacity })
      },
      syncSettings: (settings) => {
        set(normalizeSettings(settings))
      },
      setActiveScene: (id) => {
        set((state) => ({
          activeSceneId: id,
          customPrompt: composeCustomPrompt(state.scenes, id)
        }))
      },
      updateScenePrompt: (id, prompt) => {
        set((state) => {
          const scenes = state.scenes.map((s) => (s.id === id ? { ...s, prompt } : s))
          return {
            scenes,
            customPrompt: composeCustomPrompt(scenes, state.activeSceneId)
          }
        })
      },
      addScene: (name) => {
        const id = `custom-${Date.now()}`
        set((state) => {
          const scenes = [...state.scenes, { id, name, prompt: '', isPreset: false }]
          return {
            scenes,
            activeSceneId: id,
            customPrompt: composeCustomPrompt(scenes, id)
          }
        })
        return id
      },
      removeScene: (id) => {
        const scene = get().scenes.find((s) => s.id === id)
        if (!scene || scene.isPreset) return
        set((state) => {
          const scenes = state.scenes.filter((s) => s.id !== id)
          const activeSceneId = state.activeSceneId === id ? CODING_SCENE_ID : state.activeSceneId
          return {
            scenes,
            activeSceneId,
            customPrompt: composeCustomPrompt(scenes, activeSceneId)
          }
        })
      }
    }),
    {
      name: 'interview-coder-settings',
      version: 7,
      migrate: (persisted) => {
        const state = (persisted || {}) as Partial<Settings>
        if (state.responseMode === 'core-code') {
          state.responseMode = 'interview'
        }
        state.ttsEnabled = false
        if (Array.isArray(state.statusBarShortcutHints)) {
          state.statusBarShortcutHints = state.statusBarShortcutHints.filter(
            (action: string) => action !== 'toggleTTS'
          ) as Settings['statusBarShortcutHints']
        }
        if (!Array.isArray(state.scenes) || state.scenes.length === 0) {
          state.scenes = createPresetScenes()
          state.activeSceneId = CODING_SCENE_ID
        }
        if (state.toolbarHoverDelay === 800 || state.toolbarHoverDelay === 1200) {
          state.toolbarHoverDelay = 1000
        }
        return state as Settings
      },
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as Partial<Settings>) }
        const persistedScenes = Array.isArray(state.scenes) ? state.scenes : []
        state.scenes = [
          ...createPresetScenes().map((preset) => {
            const saved = persistedScenes.find((scene) => scene.id === preset.id)
            return saved?.prompt.trim() ? saved : preset
          }),
          ...persistedScenes.filter((scene) => !scene.isPreset)
        ]
        if (!state.scenes.some((scene) => scene.id === state.activeSceneId)) {
          state.activeSceneId = CODING_SCENE_ID
        }
        return state
      }
    }
  )
)
