/** Saat design tokens — see docs/COLOR_SYSTEM.md */

export const progressRing = {
  from: '#006F75',
  to: '#FFB000',
  track: '#DDEAEA',
  darkTrack: '#1D3438',
} as const

export const salesProgressRing = {
  from: '#FFB000',
  to: '#FF6B00',
  track: '#FFEEC2',
  darkTrack: 'rgba(255, 176, 0, 0.16)',
} as const

export const avatarGradients: [string, string][] = [
  ['#003B40', '#008C96'],
  ['#006F75', '#10A37F'],
  ['#FFB000', '#FF6B00'],
  ['#415566', '#8FA8BC'],
  ['#E5484D', '#FF6B00'],
  ['#00484D', '#FFB000'],
]

export const chartColors = {
  success: '#10A37F',
  revenue: '#FFB000',
  hot: '#FF6B00',
  cold: '#526B80',
  error: '#E5484D',
  neutral: '#8BA8AC',
} as const

export const callColors = {
  light: {
    primary: '#006F75',
    success: '#10A37F',
    warning: '#FFB000',
    error: '#E5484D',
    sale: '#FF6B00',
  },
  dark: {
    primary: '#008C96',
    success: '#18C99A',
    warning: '#FFB000',
    error: '#FF5C66',
    sale: '#FF6B00',
  },
} as const
