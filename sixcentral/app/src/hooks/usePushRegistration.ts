// app/src/hooks/usePushRegistration.ts
//
// Requires: npx expo install expo-notifications expo-device
// Also add the expo-notifications plugin to app.json (see push-setup.md).

import { useCallback, useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { router } from 'expo-router'

const API_BASE = 'https://sixcentral.co.uk'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

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
 * Call registerForPush() from a "turn on alerts" button, NOT on first launch.
 * iOS only lets you ask once. Asking after someone has read a couple of
 * articles converts far better than asking on the splash screen.
 */
export function usePushRegistration(accessToken?: string | null) {
  const responseListener = useRef<Notifications.Subscription | null>(null)

  const registerForPush = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) return false

    await ensureAndroidChannels()

    const existing = await Notifications.getPermissionsAsync()
    let status = existing.status
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync()
      status = asked.status
    }
    if (status !== 'granted') return false

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      'ef1968be-aa57-4737-b75f-7935b9ccf397'

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })

    await fetch(`${API_BASE}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        token,
        deviceId: `${Device.osName}-${Device.modelId ?? Device.modelName}`,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        appVersion: Constants.expoConfig?.version ?? null,
        topicNews: true,
        topicWeekly: true,
      }),
    })

    return true
  }, [accessToken])

  // Refresh last_seen_at on cold start if permission is already granted.
  useEffect(() => {
    ;(async () => {
      const { status } = await Notifications.getPermissionsAsync()
      if (status === 'granted') await registerForPush()
    })()
  }, [registerForPush])

  // Deep link a tapped notification straight to the article.
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as { slug?: string; url?: string }
      if (data?.slug) router.push(`/news/${data.slug}`)
      else if (data?.url) router.push(data.url)
    })
    return () => responseListener.current?.remove()
  }, [])

  return { registerForPush }
}
