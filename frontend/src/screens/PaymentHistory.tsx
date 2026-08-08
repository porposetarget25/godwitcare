// src/screens/PaymentHistory.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  confirmPaymentIntent,
  createPaymentIntent,
  getLatestPayment,
  getPaymentHistory,
  getStripePaymentConfig,
  type PaymentHistoryResponse,
} from '../api'

type StripeElementsInstance = {
  create: (type: 'payment') => { mount: (target: HTMLElement) => void; unmount: () => void; destroy?: () => void }
}
type StripeInstance = {
  elements: (options: { clientSecret: string; appearance?: Record<string, unknown> }) => StripeElementsInstance
  confirmPayment: (options: {
    elements: StripeElementsInstance
    confirmParams?: { return_url?: string }
    redirect: 'if_required'
  }) => Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status: string } }>
}

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance
  }
}

let stripeSdkPromise: Promise<void> | null = null
function loadStripeSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Stripe is only available in the browser.'))
  if (window.Stripe) return Promise.resolve()
  if (!stripeSdkPromise) {
    stripeSdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]')
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('Unable to load Stripe.js.')), { once: true })
        return
      }
      const script = document.createElement('script')
      script.src = 'https://js.stripe.com/v3/'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Unable to load Stripe.js.'))
      document.head.appendChild(script)
    })
  }
  return stripeSdkPromise
}

function formatAmount(payment: PaymentHistoryResponse) {
  const value = Number(payment.amount)
  const currency = (payment.currency || 'GBP').toUpperCase()
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${Number.isFinite(value) ? value.toFixed(2) : payment.amount}`
  }
}
function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
function statusTag(status?: string): { label: string; cls: string } {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'succeeded') return { label: 'Paid', cls: 'tok' }
  if (normalized === 'failed' || normalized === 'canceled' || normalized === 'cancelled') return { label: 'Failed', cls: 'tdanger' }
  if (normalized === 'processing') return { label: 'Processing', cls: 'twarn' }
  return { label: status ? status.replace(/_/g, ' ') : 'Unknown', cls: 'tmute' }
}

export default function PaymentHistory() {
  const [history, setHistory] = useState<PaymentHistoryResponse[]>([])
  const [latest, setLatest] = useState<PaymentHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showPayForm, setShowPayForm] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'CARD' | 'EFT' | 'BANK_TRANSFER' | 'DIGITAL_WALLET'>('CARD')
  const [amount, setAmount] = useState('49.99')
  const [currency, setCurrency] = useState('GBP')
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [stripePaymentIntentId, setStripePaymentIntentId] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  const stripeRef = useRef<StripeInstance | null>(null)
  const elementsRef = useRef<StripeElementsInstance | null>(null)
  const paymentElementRef = useRef<{ unmount: () => void; destroy?: () => void } | null>(null)
  const paymentElementContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const [l, h] = await Promise.all([getLatestPayment(), getPaymentHistory()])
        if (!alive) return
        setLatest(l)
        setHistory(Array.isArray(h) ? h : [])
      } catch (e: any) {
        if (alive) setError(e?.message || 'Unable to load payment history.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!showPayForm) return
    let alive = true
    ;(async () => {
      try {
        const cfg = await getStripePaymentConfig()
        if (!alive) return
        setStripePublishableKey(cfg.publishableKey || '')
        if (!cfg.frontendConfigured) setPaymentError('Stripe publishable key is not configured for the active backend profile.')
      } catch (e: any) {
        if (alive) setPaymentError(e?.message || 'Unable to load payment configuration.')
      }
    })()
    return () => { alive = false }
  }, [showPayForm])

  useEffect(() => {
    if (!clientSecret || !stripePublishableKey || !paymentElementContainerRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        await loadStripeSdk()
        if (cancelled || !window.Stripe || !paymentElementContainerRef.current) return
        const stripe = window.Stripe(stripePublishableKey)
        const elements = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } })
        const paymentElement = elements.create('payment')
        paymentElement.mount(paymentElementContainerRef.current)
        stripeRef.current = stripe
        elementsRef.current = elements
        paymentElementRef.current = paymentElement
      } catch (e: any) {
        if (!cancelled) setPaymentError(e?.message || 'Unable to initialise secure Stripe checkout.')
      }
    })()
    return () => {
      cancelled = true
      paymentElementRef.current?.unmount()
      paymentElementRef.current?.destroy?.()
      paymentElementRef.current = null
      elementsRef.current = null
    }
  }, [clientSecret, stripePublishableKey])

  function resetStripeElement() {
    paymentElementRef.current?.unmount()
    paymentElementRef.current?.destroy?.()
    paymentElementRef.current = null
    elementsRef.current = null
    setClientSecret('')
    setStripePaymentIntentId('')
  }

  async function submitPayment() {
    setPaymentError(null)
    setPaymentSuccess(null)
    setPaymentComplete(false)
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) { setPaymentError('Please enter a valid amount greater than zero.'); return }
    if (!/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) { setPaymentError('Currency must be a valid 3-letter code, for example GBP.'); return }
    if (!stripePublishableKey) { setPaymentError('Stripe publishable key is not configured.'); return }

    setPaymentLoading(true)
    try {
      if (!clientSecret) {
        const intent = await createPaymentIntent({ method: selectedMethod, amount: parsedAmount, currency })
        setClientSecret(intent.clientSecret)
        setStripePaymentIntentId(intent.stripePaymentIntentId)
        setPaymentSuccess('Secure payment form loaded. Enter your card details below to complete payment.')
        return
      }
      if (!stripeRef.current || !elementsRef.current) { setPaymentError('Secure payment form is still loading. Please try again in a moment.'); return }
      const result = await stripeRef.current.confirmPayment({ elements: elementsRef.current, redirect: 'if_required' })
      if (result.error) { setPaymentError(result.error.message || 'Payment could not be completed.'); return }
      const paymentIntentId = result.paymentIntent?.id || stripePaymentIntentId
      const synced = await confirmPaymentIntent(paymentIntentId)
      const status = (synced.status || result.paymentIntent?.status || '').toLowerCase()
      if (status === 'succeeded') {
        setLatest(synced)
        setHistory(prev => [synced, ...prev])
        setPaymentComplete(true)
        setPaymentSuccess('Payment completed successfully.')
      } else if (status === 'processing') {
        setPaymentSuccess('Payment is processing. We will update your account when Stripe confirms it.')
      } else {
        setPaymentError(synced.failureMessage || `Payment status: ${status || 'requires follow-up'}.`)
      }
      resetStripeElement()
    } catch (e: any) {
      setPaymentError(e?.message || 'Payment failed. Please try again.')
    } finally {
      setPaymentLoading(false)
    }
  }

  const totalPaid = useMemo(() => {
    const sum = history.filter(p => (p.status || '').toLowerCase() === 'succeeded').reduce((n, p) => n + Number(p.amount || 0), 0)
    const currencyCode = history[0]?.currency || 'GBP'
    try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currencyCode }).format(sum) } catch { return `£${sum.toFixed(2)}` }
  }, [history])

  return (
    <>
      <div className="page-head">
        <div className="page-title">Payment History</div>
        <Link to="/home" className="bs">‹ Home</Link>
      </div>

      {error && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{error}</div>}

      <div className="g2" style={{ marginBottom: 11 }}>
        <div className="stat-tile">
          <div className="stat-label">Total Paid</div>
          <div className="stat-value">{loading ? '—' : totalPaid}</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Last Payment</div>
          <div className="stat-value" style={{ fontSize: 14 }}>
            {loading ? '—' : latest ? `${statusTag(latest.status).label} · ${formatDate(latest.updatedAt || latest.createdAt)}` : 'None yet'}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="ct" style={{ marginBottom: 0 }}>Transactions</div>
          <button type="button" className="bp" onClick={() => setShowPayForm(v => !v)}>{showPayForm ? 'Hide' : 'Make a Payment'}</button>
        </div>

        {loading ? (
          <div className="fi-hint">Loading transactions…</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0' }}>No payment transactions yet.</div>
        ) : (
          <div className="history-list">
            {history.map(p => {
              const st = statusTag(p.status)
              return (
                <div key={p.id} className="history-row" style={{ cursor: 'default' }}>
                  <div className="doc-file-icon"><i className="ti ti-receipt" aria-hidden="true" /></div>
                  <div className="history-info">
                    <div className="history-name">{p.packageLabel || 'Payment'}</div>
                    <div className="history-detail">{formatDate(p.updatedAt || p.createdAt)}{p.cardLast4 ? ` · •••• ${p.cardLast4}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{formatAmount(p)}</div>
                    <span className={`tag ${st.cls}`}>{st.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showPayForm && (
        <div className="card">
          <div className="ct">Make a Payment</div>

          {!paymentComplete && (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  { code: 'CARD', label: 'Card' },
                  { code: 'EFT', label: 'EFT' },
                  { code: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { code: 'DIGITAL_WALLET', label: 'Digital Wallet' },
                ].map(m => (
                  <button
                    key={m.code}
                    type="button"
                    className={selectedMethod === m.code ? 'bp' : 'bs'}
                    onClick={() => { setSelectedMethod(m.code as any); resetStripeElement(); setPaymentError(null); setPaymentSuccess(null); setPaymentComplete(false) }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="g2">
                <div className="fi">
                  <label className="fl2">Amount</label>
                  <input type="number" step="0.01" min="0" value={amount} onChange={e => { setAmount(e.target.value); resetStripeElement(); setPaymentComplete(false) }} />
                </div>
                <div className="fi">
                  <label className="fl2">Currency</label>
                  <input type="text" value={currency} maxLength={3} onChange={e => { setCurrency(e.target.value.toUpperCase()); resetStripeElement(); setPaymentComplete(false) }} />
                </div>
              </div>

              {clientSecret && <div ref={paymentElementContainerRef} style={{ marginTop: 12 }} />}
            </>
          )}

          {paymentError && <div className="notice n-warn"><i className="ti ti-alert-triangle" aria-hidden="true" />{paymentError}</div>}
          {paymentSuccess && <div className="notice n-info"><i className="ti ti-circle-check" aria-hidden="true" />{paymentSuccess}</div>}

          {!paymentComplete && (
            <button type="button" className="bp btn-block" onClick={submitPayment} disabled={paymentLoading}>
              {paymentLoading ? 'Processing…' : clientSecret ? 'Pay securely with Stripe' : 'Continue to secure checkout'}
            </button>
          )}
        </div>
      )}
    </>
  )
}
