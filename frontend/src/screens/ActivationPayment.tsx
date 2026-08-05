import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { confirmPaymentIntent, createActivationPaymentIntent, getActivationPaymentSummary, getStripePaymentConfig, type ActivationPaymentSummary, type PaymentMethod } from '../api'
import { useAuth } from '../state/auth'

type StripeElementsInstance = { create: (type: 'payment') => { mount: (target: HTMLElement) => void; unmount: () => void; destroy?: () => void } }
type StripeInstance = { elements: (options: { clientSecret: string; appearance?: Record<string, unknown> }) => StripeElementsInstance; confirmPayment: (options: { elements: StripeElementsInstance; redirect: 'if_required' }) => Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status: string } }> }
declare global { interface Window { Stripe?: (publishableKey: string) => StripeInstance } }
let stripeSdkPromise: Promise<void> | null = null
function loadStripeSdk() {
  if (window.Stripe) return Promise.resolve()
  if (!stripeSdkPromise) stripeSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'; script.async = true; script.onload = () => resolve(); script.onerror = () => reject(new Error('Unable to load Stripe.js.'))
    document.head.appendChild(script)
  })
  return stripeSdkPromise
}
function money(value?: number, currency = 'GBP') { return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(Number(value || 0)) }

export default function ActivationPayment() {
  const nav = useNavigate()
  const { user, refresh } = useAuth()
  const [summary, setSummary] = useState<ActivationPaymentSummary | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('CARD')
  const [publishableKey, setPublishableKey] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [intentId, setIntentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const elementsRef = useRef<StripeElementsInstance | null>(null)
  const stripeRef = useRef<StripeInstance | null>(null)
  const elementRef = useRef<{ unmount: () => void; destroy?: () => void } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { if (user?.activated) nav('/home', { replace: true }) }, [user?.activated, nav])
  useEffect(() => { (async () => { const [sum, cfg] = await Promise.all([getActivationPaymentSummary(), getStripePaymentConfig()]); setSummary(sum); setPublishableKey(cfg.publishableKey || ''); if (!cfg.frontendConfigured || cfg.backendConfigured === false) setError('Stripe is not configured for payments.') })().catch(e => setError(e?.message || 'Unable to load activation payment.')) }, [])
  useEffect(() => {
    if (!clientSecret || !publishableKey || !containerRef.current) return
    let cancelled = false
    ;(async () => { await loadStripeSdk(); if (cancelled || !window.Stripe || !containerRef.current) return; const stripe = window.Stripe(publishableKey); const elements = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } }); const el = elements.create('payment'); el.mount(containerRef.current); stripeRef.current = stripe; elementsRef.current = elements; elementRef.current = el })().catch(e => setError(e?.message || 'Unable to initialise Stripe checkout.'))
    return () => { cancelled = true; elementRef.current?.unmount(); elementRef.current?.destroy?.(); elementRef.current = null; elementsRef.current = null; stripeRef.current = null }
  }, [clientSecret, publishableKey])

  async function pay() {
    setBusy(true); setError(null); setMessage(null)
    try {
      if (!clientSecret) { const intent = await createActivationPaymentIntent({ method, currency: summary?.currency || 'GBP' }); setClientSecret(intent.clientSecret); setIntentId(intent.stripePaymentIntentId); setMessage('Secure payment form loaded. Enter your card details to activate.'); return }
      if (!stripeRef.current || !elementsRef.current) throw new Error('Secure payment form is still loading.')
      const result = await stripeRef.current.confirmPayment({ elements: elementsRef.current, redirect: 'if_required' })
      if (result.error) throw new Error(result.error.message || 'Payment could not be completed.')
      const synced = await confirmPaymentIntent(result.paymentIntent?.id || intentId)
      if ((synced.status || '').toLowerCase() === 'succeeded') { await refresh(); nav('/home', { replace: true }) } else setError(synced.failureMessage || `Payment status: ${synced.status}`)
    } catch (e: any) { setError(e?.message || 'Payment failed. Please try again.') } finally { setBusy(false) }
  }

  return <section className="activation-page">
    <div className="activation-brand"><span className="activation-logo">🪽</span><strong>GodwitCare</strong></div>
    <h1>Almost done</h1><p className="activation-lead">Complete payment to activate your GodwitCare membership and package.</p>
    <div className="activation-steps"><span>✓ Personal Information</span><span>✓ Health Information</span><span>✓ Trip Details</span><span>✓ Verify Account</span><span className="active">5 Payment</span></div>
    <div className="activation-card"><h2>Payment Summary</h2><p>A one-time registration fee applies in addition to your selected package.</p>
      <div className="activation-summary"><div><span>One-time registration fee</span><strong>{money(summary?.registrationFee, summary?.currency)}</strong></div><div><span>Trip Coverage — {summary?.packageLabel || 'selected package'}</span><strong>{money(summary?.tripCoverageFee, summary?.currency)}</strong></div><div className="total"><span>Total due today</span><strong>{money(summary?.totalAmount, summary?.currency)}</strong></div></div>
      <label className="activation-label">Payment Method</label><div className="payment-methods">{(['CARD','EFT','BANK_TRANSFER','DIGITAL_WALLET'] as PaymentMethod[]).map(m => <button key={m} type="button" className={`payment-method-chip ${method === m ? 'active' : ''}`} onClick={() => setMethod(m)}>{m === 'BANK_TRANSFER' ? 'Bank Transfer' : m === 'DIGITAL_WALLET' ? 'Digital Wallet' : m}</button>)}</div>
      {clientSecret && <div className="stripe-payment-element-panel"><div ref={containerRef} /></div>}{error && <div className="payment-error">{error}</div>}{message && <div className="payment-success">{message}</div>}
      <button className="btn block payment-submit-btn" onClick={pay} disabled={busy || !summary}>{busy ? 'Processing…' : clientSecret ? `Pay ${money(summary?.totalAmount, summary?.currency)} & Activate Account` : 'Continue to secure checkout'}</button><p className="activation-note">Card details are collected securely by Stripe and are never stored by GodwitCare.</p>
    </div>
  </section>
}
