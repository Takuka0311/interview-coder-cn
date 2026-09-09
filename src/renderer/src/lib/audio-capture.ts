let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let processor: ScriptProcessorNode | null = null
let muteNode: GainNode | null = null

const TARGET_SAMPLE_RATE = 16000

function downsample(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === TARGET_SAMPLE_RATE) {
    return input
  }
  const ratio = inputSampleRate / TARGET_SAMPLE_RATE
  const newLength = Math.max(1, Math.round(input.length / ratio))
  const result = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j++) {
      sum += input[j]
    }
    result[i] = sum / Math.max(1, end - start)
  }
  return result
}

function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return int16
}

function createPCMProcessor(source: MediaStream): void {
  audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
  const audioSource = audioContext.createMediaStreamSource(source)

  processor = audioContext.createScriptProcessor(4096, 1, 1)
  processor.onaudioprocess = (e) => {
    const inputRate = audioContext?.sampleRate || TARGET_SAMPLE_RATE
    const downsampled = downsample(e.inputBuffer.getChannelData(0), inputRate)
    const int16 = floatTo16BitPCM(downsampled)
    window.api.sendTranscriptionAudioChunk(int16.buffer.slice(0) as ArrayBuffer)
  }

  // ScriptProcessor 必须接到 destination 才会回调，但增益必须为 0。
  // 否则立体声混音会把播放出去的系统声音再录进来，形成回环把界面卡死。
  muteNode = audioContext.createGain()
  muteNode.gain.value = 0
  audioSource.connect(processor)
  processor.connect(muteNode)
  muteNode.connect(audioContext.destination)
}

/**
 * Capture audio from a specific input device via getUserMedia.
 * For system audio, select "Stereo Mix" (立体声混音) or similar loopback device.
 * For your own voice, select your physical microphone.
 */
export async function startAudioCapture(deviceId?: string): Promise<void> {
  const audioConstraints: MediaTrackConstraints = {
    sampleRate: TARGET_SAMPLE_RATE,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  }
  if (deviceId) {
    audioConstraints.deviceId = { exact: deviceId }
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: audioConstraints
  })
  mediaStream = stream
  createPCMProcessor(stream)
}

export function stopAudioCapture(): void {
  if (processor) {
    processor.disconnect()
    processor = null
  }
  if (muteNode) {
    muteNode.disconnect()
    muteNode = null
  }
  if (audioContext) {
    void audioContext.close()
    audioContext = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
}
