import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import logo from '@/assets/logo.png'

type Props = {
  onSuccess: () => void
}

export default function LoginPanel({ onSuccess }: Props) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const configured = useMemo(() => {
    return Boolean(import.meta.env.VITE_ADMIN_EMAIL) && Boolean(import.meta.env.VITE_ADMIN_PASSWORD)
  }, [])

  const canSubmit = email.trim().length > 0 && password.length > 0

  function submit() {
    setError(null)
    if (!configured) {
      setError(t('login.notConfigured'))
      return
    }

    if (email.trim() !== String(import.meta.env.VITE_ADMIN_EMAIL).trim()) {
      setError(t('login.invalid'))
      return
    }
    if (password !== String(import.meta.env.VITE_ADMIN_PASSWORD)) {
      setError(t('login.invalid'))
      return
    }

    onSuccess()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Card className="w-full max-w-md shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl shadow-sm" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('login.title')}</h2>
            </div>
          </div>

          {!configured && (
            <div className="text-xs rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 p-3">
              {t('login.notConfiguredHelp')}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">{t('login.email')}</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">{t('login.password')}</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit}>
              {t('login.signIn')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
