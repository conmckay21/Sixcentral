// app/src/hooks/usePushRegistration.ts
//
// Requires: expo-notifications, expo-device, @react-native-async-storage/async-storage

import { useCallback, useEffect, useRef } from 'react'
import { AppState, Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'

const API_BASE = 'https://sixcentral.co.uk'
const ASKED_KEY = 'sixcentral.push.asked.v1'
const INSTALL_KEY = 'sixcentral.push.install.v1'

// Temporary diagnostics. Fire and forget, never throws, never awaited on the
// critical path. Removed once Android registration is confirmed on device.
function diag(step: string, detail?: unknown) {
  try {
    const text =
      detail instanceof Error
        ? `${detail.name}: ${detail.message}`
        : detail === undefined
          ? null
          : typeof detail === 'string'
            ? detail
            : JSON.stringify(detail)
    fetch(`${API_BASE}/api/push/diag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step,
        detail: text,
        deviceId: `${Device.osName}-${Device.modelId ?? Device.modelName}`,
        platform: Platform.OS,
      }),
    }).catch(() => {})
  } catch {
    // Diagnostics must never affect the app.
  }
}

// Stable per install. Lets the server retire the previous token when Expo
// rotates it, so one phone never holds two live tokens.
async function getInstallId(): Promise<string | null> {
  try {
    const existing = await AsyncStorage.getItem(INSTALL_KEY)
    if (existing) return existing
    const fresh = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    await AsyncStorage.setItem(INSTALL_KEY, fresh)
    return fresh
  } catch {
    return null
  }
}
const FIRST_PROMPT_DELAY_MS = 2500

// Module scope on purpose. A ref would reset if the root layout remounts, and
// the previous version cancelled its own timer on unmount and then refused to
// re-arm because the ref guard was already set. Result: the prompt never fired.
let bootstrapStarted = false

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

/**
 * Resolves once the app is foregrounded, or after a hard timeout.
 *
 * The timeout is not optional. At cold launch iOS can report currentState as
 * 'unknown' or 'background' while the app is in fact already on screen, and no
 * 'change' event ever arrives. Without the race this hangs forever and the
 * prompt never fires.
 */
function waitUntilActive(timeoutMs = 1500): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      try {
        sub.remove()
      } catch {
        // listener already gone
      }
      resolve()
    }
    const timer = setTimeout(finish, timeoutMs)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') finish()
    })
  })
}

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('news', {
    name: 'Breaking news',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF2E88',
  })
  await Notifications.setNotificationChannelAsync('weekly', {
    name: 'GTA Online weekly',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#1FE5D6',
  })
  await Notifications.setNotificationChannelAsync('clips', {
    name: 'Clips and community',
    importance: Notifications.AndroidImportance.LOW,
    lightColor: '#35E27C',
  })
}

/**
 * Called once from the root layout, and again from the account screen so the
 * settings toggle can trigger the same flow.
 *
 * On first launch the permission prompt fires automatically after a short delay,
 * then never again. iOS only allows one prompt per install, so if the person
 * declines, the account screen points them at device settings instead.
 */
export function usePushRegistration(accessToken?: string | null) {
  const responseListener = useRef<Notifications.Subscription | null>(null)

  const registerForPush = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) return false

    diag('register:enter')
    try {
      await ensureAndroidChannels()
    } catch (err) {
      diag('register:channels_error', err)
    }

    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    diag('register:permission', { status, canAskAgain: existing.canAskAgain })

    if (status !== 'granted') {
      if (!existing.canAskAgain) return false
      const asked = await Notifications.requestPermissionsAsync()
      status = asked.status
      await AsyncStorage.setItem(ASKED_KEY, '1')
    }

    if (status !== 'granted') return false

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      'ef1968be-aa57-4737-b75f-7935b9ccf397'

    try {
      let token: string
      try {
        const result = await Notifications.getExpoPushTokenAsync({ projectId })
        token = result.data
        diag('register:token_ok', token.slice(0, 30))
      } catch (err) {
        diag('register:token_error', err)
        throw err
      }
      const installId = await getInstallId()

      const res = await fetch(`${API_BASE}/api/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          token,
          deviceId: `${Device.osName}-${Device.modelId ?? Device.modelName}`,
          installId,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          appVersion: Constants.expoConfig?.version ?? null,
          topicNews: true,
          topicWeekly: true,
        }),
      })
      diag('register:response', res.status)
    } catch (err) {
      diag('register:catch', err)
      // Offline, the endpoint is down, or the native token call failed (on
      // Android that means Firebase did not initialise). Permission is still
      // granted, and the next cold start will retry the registration.
      console.warn('[push] register failed', Platform.OS, err)
      return true
    }

    return true
  }, [accessToken])

  // First launch: ask once. Later launches: silently refresh the token so
  // last_seen_at stays current and dead tokens get pruned.
  //
  // Deliberately not cancelled on unmount. The prompt is a one-shot app-level
  // action, not a subscription, and tying it to component lifecycle is what
  // broke it before.
  useEffect(() => {
    if (bootstrapStarted) return
    bootstrapStarted = true

    ;(async () => {
      if (!Device.isDevice) return

      diag('bootstrap:enter')
      try {
        const { status, canAskAgain } = await Notifications.getPermissionsAsync()
        diag('bootstrap:permission', { status, canAskAgain })

        if (status === 'granted') {
          await registerForPush()
          return
        }

        if (!canAskAgain) return

        const alreadyAsked = await AsyncStorage.getItem(ASKED_KEY)
        if (alreadyAsked) return

        // Wait for the splash to clear and the first screen to paint. iOS will
        // not present a permission dialog over a splash screen, and prompting
        // the instant the app opens converts badly anyway.
        await waitUntilActive()
        await new Promise((r) => setTimeout(r, FIRST_PROMPT_DELAY_MS))

        // Re-check: the person may have reached settings in the meantime.
        const again = await Notifications.getPermissionsAsync()
        if (again.status === 'granted' || !again.canAskAgain) return
        if (await AsyncStorage.getItem(ASKED_KEY)) return

        await registerForPush()
      } catch (err) {
        // Never let a permissions hiccup take the app down on launch.
        diag('bootstrap:catch', err)
      }
    })()
  }, [registerForPush])

  // Deep link a tapped notification to the right screen.
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as {
        slug?: string
        kind?: string
      }
      if (!data?.slug) return
      const path = data.kind === 'guide' ? `/guide/${data.slug}` : `/article/${data.slug}`
      router.push(path as never)
    })
    return () => responseListener.current?.remove()
  }, [])

  return { registerForPush }
}
