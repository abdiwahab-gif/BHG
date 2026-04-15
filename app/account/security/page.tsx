'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { motion } from 'framer-motion'
import { Loader2, Copy, Check, AlertCircle, Key } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useRouter } from 'next/navigation'

interface TwoFactorSetupData {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export default function SecurityPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null)
  const [verificationToken, setVerificationToken] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [step, setStep] = useState<'initial' | 'setup' | 'verify'>('initial')

  const handleStartSetup = async () => {
    setIsLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/api/auth/setup-2fa`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        setSetupData(data.data)
        setStep('setup')
        toast({
          title: 'Setup Started',
          description: 'Scan the QR code with your authenticator app',
        })
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to start 2FA setup',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start 2FA setup',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!setupData?.secret) return

    setIsVerifying(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('token')

      const response = await fetch(`${apiUrl}/api/auth/confirm-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          secret: setupData.secret,
          token: verificationToken,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: '2FA has been enabled successfully',
        })
        setStep('initial')
        setSetupData(null)
        setVerificationToken('')
        // Refresh user data
        setTimeout(() => router.refresh(), 1000)
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Invalid 2FA token',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enable 2FA',
        variant: 'destructive',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return

    const content = `Backup codes for 2FA\n\nGenerated: ${new Date().toLocaleString()}\n\n${setupData.backupCodes.join('\n')}\n\nKeep these codes in a safe place. Each code can be used once if you lose access to your authenticator app.`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '2fa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-6 h-6" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Protect your account with an additional layer of security
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 'initial' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">What is 2FA?</p>
                      <p>
                        Two-factor authentication adds an extra security layer by requiring a code
                        from your phone in addition to your password. This protects your account
                        even if your password is compromised.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Setup Process:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                      <li>Click the setup button below</li>
                      <li>Scan the QR code with your authenticator app</li>
                      <li>Enter the 6-digit code from the app to verify</li>
                      <li>Save your backup codes in a secure location</li>
                    </ol>
                  </div>

                  <Button
                    onClick={handleStartSetup}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Starting Setup...
                      </>
                    ) : (
                      'Start Setup'
                    )}
                  </Button>
                </div>
              )}

              {step === 'setup' && setupData && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-4">Step 1: Scan QR Code</h4>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 flex justify-center">
                      <img
                        src={setupData.qrCode}
                        alt="2FA QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Scan this code with your authenticator app. If you can't scan, enter this
                      secret manually:
                    </p>
                    <div className="mt-2 p-3 bg-gray-100 rounded font-mono text-center text-sm break-all">
                      {setupData.secret}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-4">Step 2: Verify Setup</h4>
                    <form onSubmit={handleVerifyAndEnable} className="space-y-4">
                      <div>
                        <Label htmlFor="token">Enter 6-digit code from your app</Label>
                        <Input
                          id="token"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={verificationToken}
                          onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
                          className="text-center text-2xl tracking-widest font-mono"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isVerifying || verificationToken.length !== 6}
                        className="w-full"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Verifying...
                          </>
                        ) : (
                          'Verify and Enable'
                        )}
                      </Button>
                    </form>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 mb-3">Step 3: Save Backup Codes</h4>
                    <p className="text-sm text-amber-800 mb-4">
                      Save these codes in a safe place. You can use them to access your account if
                      you lose access to your authenticator app.
                    </p>
                    <div className="space-y-2 mb-4">
                      {setupData.backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white p-3 rounded border border-amber-200"
                        >
                          <code className="font-mono text-sm">{code}</code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(code)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {copiedCode === code ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      onClick={downloadBackupCodes}
                      variant="outline"
                      className="w-full"
                    >
                      Download Backup Codes
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
