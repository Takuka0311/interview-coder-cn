import { desktopCapturer, screen } from 'electron'

const MAX_WIDTH = 1280

export async function takeScreenshot(): Promise<string | void> {
  const mainWindow = global.mainWindow
  if (!mainWindow || mainWindow.isDestroyed()) return

  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size
    const scale = Math.min(1, MAX_WIDTH / Math.max(width, 1))
    const thumbnailSize = {
      width: Math.max(640, Math.round(width * scale)),
      height: Math.max(360, Math.round(height * scale))
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize
    })
    if (sources.length === 0) return undefined
    return sources[0]?.thumbnail.toPNG().toString('base64')
  } catch (error) {
    console.error('Error taking screenshot:', error)
    return undefined
  }
}
