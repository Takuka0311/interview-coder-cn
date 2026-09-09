import { create } from 'zustand'

type TranscriptionStatus = 'idle' | 'connecting' | 'listening'

interface TranscriptionState {
  isTranscribing: boolean
  status: TranscriptionStatus
  transcriptionText: string
  errorMessage: string | null
}

interface TranscriptionStore extends TranscriptionState {
  setIsTranscribing: (v: boolean) => void
  setStatus: (status: TranscriptionStatus) => void
  setTranscriptionText: (text: string) => void
  clearText: () => void
  setError: (msg: string | null) => void
  resetState: () => void
}

const defaultState: TranscriptionState = {
  isTranscribing: false,
  status: 'idle',
  transcriptionText: '',
  errorMessage: null
}

export const useTranscriptionStore = create<TranscriptionStore>()((set) => ({
  ...defaultState,
  setIsTranscribing: (v) => set({ isTranscribing: v, status: v ? 'connecting' : 'idle' }),
  setStatus: (status) => set({ status }),
  setTranscriptionText: (text) => set({ transcriptionText: text }),
  clearText: () => set({ transcriptionText: '' }),
  setError: (msg) => set({ errorMessage: msg }),
  resetState: () => set(defaultState)
}))
