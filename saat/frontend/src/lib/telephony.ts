import type { RuntimeAppSettings } from '@/lib/appSettings'
import type { CallMethod } from '@/lib/call'

export interface TelephonyCapabilities {
  nativeCallEnabled: boolean
  voipEnabled: boolean
  defaultCallMethod: CallMethod
  voipProvider: string
  voipFallbackToNative: boolean
  voipHealthy: boolean
}

export function capabilitiesFromSettings(settings: RuntimeAppSettings): TelephonyCapabilities {
  return {
    nativeCallEnabled: settings.nativeCallEnabled,
    voipEnabled: settings.voipEnabled,
    defaultCallMethod: settings.defaultCallMethod,
    voipProvider: settings.voipProvider,
    voipFallbackToNative: settings.voipFallbackToNative,
    voipHealthy: settings.voipEnabled,
  }
}

export function isVoipAvailable(caps: TelephonyCapabilities): boolean {
  return caps.voipEnabled && caps.voipHealthy
}

export function isNativeAvailable(caps: TelephonyCapabilities): boolean {
  return caps.nativeCallEnabled
}

export function resolveCallMethod(
  requested: CallMethod | undefined,
  caps: TelephonyCapabilities,
): CallMethod {
  const preferred = requested ?? caps.defaultCallMethod

  if (preferred === 'voip' && isVoipAvailable(caps)) return 'voip'
  if (preferred === 'native' && isNativeAvailable(caps)) return 'native'
  if (isNativeAvailable(caps)) return 'native'
  if (isVoipAvailable(caps)) return 'voip'

  return 'native'
}
