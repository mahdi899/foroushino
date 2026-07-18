import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Sparkles, ShieldAlert, X } from 'lucide-react'
import { useAppVersion } from '@/hooks/useAppVersion'

/**
 * Smart update banner — forced / optional / silent (silent renders nothing).
 * Styled for Saat brand (primary teal).
 */
export function UpdateBanner() {
  const { hasUpdate, updateType, latestVersion, applyUpdate, dismissUpdate } = useAppVersion()

  if (!hasUpdate || updateType === 'silent') return null

  if (updateType === 'forced') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-6 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 shadow-2xl"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
          />

          <div className="relative p-6 text-center">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"
            >
              <ShieldAlert className="h-8 w-8 text-white" />
            </motion.div>

            <h3 className="mb-2 text-xl font-bold text-white">بروزرسانی اجباری</h3>
            <p className="mb-2 text-sm leading-relaxed text-white/80">
              نسخه جدید <span className="font-bold text-white">{latestVersion}</span> منتشر شده و شامل
              تغییرات مهمی است.
            </p>
            <p className="mb-6 text-xs text-white/60">برای ادامه استفاده باید بروزرسانی کنید.</p>

            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={applyUpdate}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-primary-700 shadow-lg"
            >
              <RefreshCw className="h-4 w-4" />
              بروزرسانی الان
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      {hasUpdate && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-[2px]"
            onClick={dismissUpdate}
          />

          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 left-4 right-4 z-[9999]"
            style={{ maxWidth: 380, margin: '0 auto' }}
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400 shadow-2xl shadow-black/25 ring-1 ring-white/15">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
              />

              <button
                type="button"
                onClick={dismissUpdate}
                className="absolute left-3 top-3 z-10 rounded-full bg-white/15 p-1.5 transition-colors hover:bg-white/25"
              >
                <X className="h-4 w-4 text-white" />
              </button>

              <div className="relative p-5 text-center">
                <motion.div
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20"
                >
                  <Sparkles className="h-7 w-7 text-white" />
                </motion.div>

                <h3 className="mb-1 text-lg font-bold text-white">نسخه {latestVersion} آماده‌ست</h3>
                <p className="mb-5 text-sm leading-relaxed text-white/75">
                  بهبودها و ویژگی‌های جدید منتظر شماست
                </p>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={applyUpdate}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-primary-700 shadow-lg transition-colors hover:bg-white/95"
                >
                  <RefreshCw className="h-4 w-4" />
                  بروزرسانی
                </motion.button>

                <button
                  type="button"
                  onClick={dismissUpdate}
                  className="mt-3 text-xs text-white/50 transition-colors hover:text-white/70"
                >
                  بعداً یادآوری کن
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
