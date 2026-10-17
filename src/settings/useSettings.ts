import { useCallback, useState } from 'react'
import { loadSettings, saveSettings, type Settings } from './settings'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(window.localStorage))

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next)
    try {
      saveSettings(window.localStorage, next)
    } catch (error) {
      console.error('Could not persist settings; keeping them in memory only', error)
    }
  }, [])

  return { settings, updateSettings }
}
