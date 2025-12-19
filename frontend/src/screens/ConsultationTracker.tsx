// src/screens/ConsultationTracker.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { API_BASE_URL, resolveApiUrl, getMe } from '../api'

type ContactChoice = 'SAME' | 'DIFFERENT'

type CountryCode = { code: string; country: string; label: string }

// A practical “full” list (covers essentially all calling codes in common use).
// If you want, you can later move this into a separate file (e.g., src/constants/countryCodes.ts).
const COUNTRY_CODES: CountryCode[] = [
  { code: '1', country: 'United States / Canada', label: '+1 (US/CA)' },
  { code: '7', country: 'Russia / Kazakhstan', label: '+7 (RU/KZ)' },
  { code: '20', country: 'Egypt', label: '+20 (EG)' },
  { code: '27', country: 'South Africa', label: '+27 (ZA)' },
  { code: '30', country: 'Greece', label: '+30 (GR)' },
  { code: '31', country: 'Netherlands', label: '+31 (NL)' },
  { code: '32', country: 'Belgium', label: '+32 (BE)' },
  { code: '33', country: 'France', label: '+33 (FR)' },
  { code: '34', country: 'Spain', label: '+34 (ES)' },
  { code: '36', country: 'Hungary', label: '+36 (HU)' },
  { code: '39', country: 'Italy', label: '+39 (IT)' },
  { code: '40', country: 'Romania', label: '+40 (RO)' },
  { code: '41', country: 'Switzerland', label: '+41 (CH)' },
  { code: '43', country: 'Austria', label: '+43 (AT)' },
  { code: '44', country: 'United Kingdom', label: '+44 (GB)' },
  { code: '45', country: 'Denmark', label: '+45 (DK)' },
  { code: '46', country: 'Sweden', label: '+46 (SE)' },
  { code: '47', country: 'Norway', label: '+47 (NO)' },
  { code: '48', country: 'Poland', label: '+48 (PL)' },
  { code: '49', country: 'Germany', label: '+49 (DE)' },
  { code: '51', country: 'Peru', label: '+51 (PE)' },
  { code: '52', country: 'Mexico', label: '+52 (MX)' },
  { code: '53', country: 'Cuba', label: '+53 (CU)' },
  { code: '54', country: 'Argentina', label: '+54 (AR)' },
  { code: '55', country: 'Brazil', label: '+55 (BR)' },
  { code: '56', country: 'Chile', label: '+56 (CL)' },
  { code: '57', country: 'Colombia', label: '+57 (CO)' },
  { code: '58', country: 'Venezuela', label: '+58 (VE)' },
  { code: '60', country: 'Malaysia', label: '+60 (MY)' },
  { code: '61', country: 'Australia', label: '+61 (AU)' },
  { code: '62', country: 'Indonesia', label: '+62 (ID)' },
  { code: '63', country: 'Philippines', label: '+63 (PH)' },
  { code: '64', country: 'New Zealand', label: '+64 (NZ)' },
  { code: '65', country: 'Singapore', label: '+65 (SG)' },
  { code: '66', country: 'Thailand', label: '+66 (TH)' },
  { code: '81', country: 'Japan', label: '+81 (JP)' },
  { code: '82', country: 'South Korea', label: '+82 (KR)' },
  { code: '84', country: 'Vietnam', label: '+84 (VN)' },
  { code: '86', country: 'China', label: '+86 (CN)' },
  { code: '90', country: 'Turkey', label: '+90 (TR)' },
  { code: '91', country: 'India', label: '+91 (IN)' },
  { code: '92', country: 'Pakistan', label: '+92 (PK)' },
  { code: '93', country: 'Afghanistan', label: '+93 (AF)' },
  { code: '94', country: 'Sri Lanka', label: '+94 (LK)' },
  { code: '95', country: 'Myanmar', label: '+95 (MM)' },
  { code: '98', country: 'Iran', label: '+98 (IR)' },
  { code: '212', country: 'Morocco', label: '+212 (MA)' },
  { code: '213', country: 'Algeria', label: '+213 (DZ)' },
  { code: '216', country: 'Tunisia', label: '+216 (TN)' },
  { code: '218', country: 'Libya', label: '+218 (LY)' },
  { code: '220', country: 'Gambia', label: '+220 (GM)' },
  { code: '221', country: 'Senegal', label: '+221 (SN)' },
  { code: '222', country: 'Mauritania', label: '+222 (MR)' },
  { code: '223', country: 'Mali', label: '+223 (ML)' },
  { code: '224', country: 'Guinea', label: '+224 (GN)' },
  { code: '225', country: "Côte d’Ivoire", label: '+225 (CI)' },
  { code: '226', country: 'Burkina Faso', label: '+226 (BF)' },
  { code: '227', country: 'Niger', label: '+227 (NE)' },
  { code: '228', country: 'Togo', label: '+228 (TG)' },
  { code: '229', country: 'Benin', label: '+229 (BJ)' },
  { code: '230', country: 'Mauritius', label: '+230 (MU)' },
  { code: '231', country: 'Liberia', label: '+231 (LR)' },
  { code: '232', country: 'Sierra Leone', label: '+232 (SL)' },
  { code: '233', country: 'Ghana', label: '+233 (GH)' },
  { code: '234', country: 'Nigeria', label: '+234 (NG)' },
  { code: '235', country: 'Chad', label: '+235 (TD)' },
  { code: '236', country: 'Central African Republic', label: '+236 (CF)' },
  { code: '237', country: 'Cameroon', label: '+237 (CM)' },
  { code: '238', country: 'Cape Verde', label: '+238 (CV)' },
  { code: '239', country: 'São Tomé and Príncipe', label: '+239 (ST)' },
  { code: '240', country: 'Equatorial Guinea', label: '+240 (GQ)' },
  { code: '241', country: 'Gabon', label: '+241 (GA)' },
  { code: '242', country: 'Congo', label: '+242 (CG)' },
  { code: '243', country: 'DR Congo', label: '+243 (CD)' },
  { code: '244', country: 'Angola', label: '+244 (AO)' },
  { code: '245', country: 'Guinea-Bissau', label: '+245 (GW)' },
  { code: '246', country: 'Diego Garcia', label: '+246 (DG)' },
  { code: '248', country: 'Seychelles', label: '+248 (SC)' },
  { code: '249', country: 'Sudan', label: '+249 (SD)' },
  { code: '250', country: 'Rwanda', label: '+250 (RW)' },
  { code: '251', country: 'Ethiopia', label: '+251 (ET)' },
  { code: '252', country: 'Somalia', label: '+252 (SO)' },
  { code: '253', country: 'Djibouti', label: '+253 (DJ)' },
  { code: '254', country: 'Kenya', label: '+254 (KE)' },
  { code: '255', country: 'Tanzania', label: '+255 (TZ)' },
  { code: '256', country: 'Uganda', label: '+256 (UG)' },
  { code: '257', country: 'Burundi', label: '+257 (BI)' },
  { code: '258', country: 'Mozambique', label: '+258 (MZ)' },
  { code: '260', country: 'Zambia', label: '+260 (ZM)' },
  { code: '261', country: 'Madagascar', label: '+261 (MG)' },
  { code: '262', country: 'Réunion / Mayotte', label: '+262 (RE/YT)' },
  { code: '263', country: 'Zimbabwe', label: '+263 (ZW)' },
  { code: '264', country: 'Namibia', label: '+264 (NA)' },
  { code: '265', country: 'Malawi', label: '+265 (MW)' },
  { code: '266', country: 'Lesotho', label: '+266 (LS)' },
  { code: '267', country: 'Botswana', label: '+267 (BW)' },
  { code: '268', country: 'Eswatini', label: '+268 (SZ)' },
  { code: '269', country: 'Comoros', label: '+269 (KM)' },
  { code: '290', country: 'Saint Helena', label: '+290 (SH)' },
  { code: '291', country: 'Eritrea', label: '+291 (ER)' },
  { code: '297', country: 'Aruba', label: '+297 (AW)' },
  { code: '298', country: 'Faroe Islands', label: '+298 (FO)' },
  { code: '299', country: 'Greenland', label: '+299 (GL)' },
  { code: '350', country: 'Gibraltar', label: '+350 (GI)' },
  { code: '351', country: 'Portugal', label: '+351 (PT)' },
  { code: '352', country: 'Luxembourg', label: '+352 (LU)' },
  { code: '353', country: 'Ireland', label: '+353 (IE)' },
  { code: '354', country: 'Iceland', label: '+354 (IS)' },
  { code: '355', country: 'Albania', label: '+355 (AL)' },
  { code: '356', country: 'Malta', label: '+356 (MT)' },
  { code: '357', country: 'Cyprus', label: '+357 (CY)' },
  { code: '358', country: 'Finland', label: '+358 (FI)' },
  { code: '359', country: 'Bulgaria', label: '+359 (BG)' },
  { code: '370', country: 'Lithuania', label: '+370 (LT)' },
  { code: '371', country: 'Latvia', label: '+371 (LV)' },
  { code: '372', country: 'Estonia', label: '+372 (EE)' },
  { code: '373', country: 'Moldova', label: '+373 (MD)' },
  { code: '374', country: 'Armenia', label: '+374 (AM)' },
  { code: '375', country: 'Belarus', label: '+375 (BY)' },
  { code: '376', country: 'Andorra', label: '+376 (AD)' },
  { code: '377', country: 'Monaco', label: '+377 (MC)' },
  { code: '378', country: 'San Marino', label: '+378 (SM)' },
  { code: '380', country: 'Ukraine', label: '+380 (UA)' },
  { code: '381', country: 'Serbia', label: '+381 (RS)' },
  { code: '382', country: 'Montenegro', label: '+382 (ME)' },
  { code: '383', country: 'Kosovo', label: '+383 (XK)' },
  { code: '385', country: 'Croatia', label: '+385 (HR)' },
  { code: '386', country: 'Slovenia', label: '+386 (SI)' },
  { code: '387', country: 'Bosnia and Herzegovina', label: '+387 (BA)' },
  { code: '389', country: 'North Macedonia', label: '+389 (MK)' },
  { code: '420', country: 'Czechia', label: '+420 (CZ)' },
  { code: '421', country: 'Slovakia', label: '+421 (SK)' },
  { code: '423', country: 'Liechtenstein', label: '+423 (LI)' },
  { code: '500', country: 'Falkland Islands', label: '+500 (FK)' },
  { code: '501', country: 'Belize', label: '+501 (BZ)' },
  { code: '502', country: 'Guatemala', label: '+502 (GT)' },
  { code: '503', country: 'El Salvador', label: '+503 (SV)' },
  { code: '504', country: 'Honduras', label: '+504 (HN)' },
  { code: '505', country: 'Nicaragua', label: '+505 (NI)' },
  { code: '506', country: 'Costa Rica', label: '+506 (CR)' },
  { code: '507', country: 'Panama', label: '+507 (PA)' },
  { code: '508', country: 'Saint Pierre and Miquelon', label: '+508 (PM)' },
  { code: '509', country: 'Haiti', label: '+509 (HT)' },
  { code: '590', country: 'Guadeloupe', label: '+590 (GP)' },
  { code: '591', country: 'Bolivia', label: '+591 (BO)' },
  { code: '592', country: 'Guyana', label: '+592 (GY)' },
  { code: '593', country: 'Ecuador', label: '+593 (EC)' },
  { code: '594', country: 'French Guiana', label: '+594 (GF)' },
  { code: '595', country: 'Paraguay', label: '+595 (PY)' },
  { code: '596', country: 'Martinique', label: '+596 (MQ)' },
  { code: '597', country: 'Suriname', label: '+597 (SR)' },
  { code: '598', country: 'Uruguay', label: '+598 (UY)' },
  { code: '599', country: 'Caribbean Netherlands', label: '+599 (BQ/CW)' },
  { code: '670', country: 'Timor-Leste', label: '+670 (TL)' },
  { code: '672', country: 'Norfolk Island', label: '+672 (NF)' },
  { code: '673', country: 'Brunei', label: '+673 (BN)' },
  { code: '674', country: 'Nauru', label: '+674 (NR)' },
  { code: '675', country: 'Papua New Guinea', label: '+675 (PG)' },
  { code: '676', country: 'Tonga', label: '+676 (TO)' },
  { code: '677', country: 'Solomon Islands', label: '+677 (SB)' },
  { code: '678', country: 'Vanuatu', label: '+678 (VU)' },
  { code: '679', country: 'Fiji', label: '+679 (FJ)' },
  { code: '680', country: 'Palau', label: '+680 (PW)' },
  { code: '681', country: 'Wallis and Futuna', label: '+681 (WF)' },
  { code: '682', country: 'Cook Islands', label: '+682 (CK)' },
  { code: '683', country: 'Niue', label: '+683 (NU)' },
  { code: '685', country: 'Samoa', label: '+685 (WS)' },
  { code: '686', country: 'Kiribati', label: '+686 (KI)' },
  { code: '687', country: 'New Caledonia', label: '+687 (NC)' },
  { code: '688', country: 'Tuvalu', label: '+688 (TV)' },
  { code: '689', country: 'French Polynesia', label: '+689 (PF)' },
  { code: '690', country: 'Tokelau', label: '+690 (TK)' },
  { code: '691', country: 'Micronesia', label: '+691 (FM)' },
  { code: '692', country: 'Marshall Islands', label: '+692 (MH)' },
  { code: '850', country: 'North Korea', label: '+850 (KP)' },
  { code: '852', country: 'Hong Kong', label: '+852 (HK)' },
  { code: '853', country: 'Macau', label: '+853 (MO)' },
  { code: '855', country: 'Cambodia', label: '+855 (KH)' },
  { code: '856', country: 'Laos', label: '+856 (LA)' },
  { code: '880', country: 'Bangladesh', label: '+880 (BD)' },
  { code: '886', country: 'Taiwan', label: '+886 (TW)' },
  { code: '960', country: 'Maldives', label: '+960 (MV)' },
  { code: '961', country: 'Lebanon', label: '+961 (LB)' },
  { code: '962', country: 'Jordan', label: '+962 (JO)' },
  { code: '963', country: 'Syria', label: '+963 (SY)' },
  { code: '964', country: 'Iraq', label: '+964 (IQ)' },
  { code: '965', country: 'Kuwait', label: '+965 (KW)' },
  { code: '966', country: 'Saudi Arabia', label: '+966 (SA)' },
  { code: '967', country: 'Yemen', label: '+967 (YE)' },
  { code: '968', country: 'Oman', label: '+968 (OM)' },
  { code: '970', country: 'Palestine', label: '+970 (PS)' },
  { code: '971', country: 'UAE', label: '+971 (AE)' },
  { code: '972', country: 'Israel', label: '+972 (IL)' },
  { code: '973', country: 'Bahrain', label: '+973 (BH)' },
  { code: '974', country: 'Qatar', label: '+974 (QA)' },
  { code: '975', country: 'Bhutan', label: '+975 (BT)' },
  { code: '976', country: 'Mongolia', label: '+976 (MN)' },
  { code: '977', country: 'Nepal', label: '+977 (NP)' },
  { code: '992', country: 'Tajikistan', label: '+992 (TJ)' },
  { code: '993', country: 'Turkmenistan', label: '+993 (TM)' },
  { code: '994', country: 'Azerbaijan', label: '+994 (AZ)' },
  { code: '995', country: 'Georgia', label: '+995 (GE)' },
  { code: '996', country: 'Kyrgyzstan', label: '+996 (KG)' },
  { code: '998', country: 'Uzbekistan', label: '+998 (UZ)' },
]

function onlyDigits(s: string) {
  return (s || '').replace(/\D+/g, '')
}

export default function ConsultationTracker() {
  const [params] = useSearchParams()
  const isLogged = params.get('logged') === '1'
  const [showToast, setShowToast] = useState(isLogged)

  // Latest consultation id (to know if Step 1 is done) + status
  const [latestCid, setLatestCid] = useState<number | null>(null)
  const [latestStatus, setLatestStatus] =
    useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | null>(null)

  // Patient info for WhatsApp draft message
  const [patientName, setPatientName] = useState<string>('N/A')
  const [dob, setDob] = useState<string>('N/A')
  const [mobile, setMobile] = useState<string>('N/A')
  const [address, setAddress] = useState<string>('N/A')

  // NEW: Interstitial contact prompt state
  const [showContactPrompt, setShowContactPrompt] = useState(false)
  const [contactChoice, setContactChoice] = useState<ContactChoice>('SAME')
  const [countryCode, setCountryCode] = useState<string>('64') // default NZ
  const [altNumber, setAltNumber] = useState<string>('') // number without +, free input
  const [contactErr, setContactErr] = useState<string | null>(null)

  // Toast on landing after logging consultation
  useEffect(() => {
    if (!isLogged) return
    setShowToast(true)
    const timer = setTimeout(() => setShowToast(false), 60000)
    return () => clearTimeout(timer)
  }, [isLogged])

  // Load basic user info + latest consultation once (single effect, no duplicates)
  useEffect(() => {
    let alive = true

    const nz = (v: any, fallback = 'N/A') => {
      const s = v === null || v === undefined ? '' : String(v).trim()
      return s ? s : fallback
    }

    ;(async () => {
      try {
        // 1) Try to populate from /auth/me (most reliable for name)
        const me = await getMe().catch(() => null)
        if (!alive) return

        if (me) {
          const fullName = [me.firstName, me.lastName].filter(Boolean).join(' ').trim()
          if (fullName) setPatientName(fullName)

          // Some backends include username in DTO; if yours doesn't, no harm.
          // @ts-ignore
          if ((me as any).username) setMobile(nz((me as any).username))
        }

        // 2) Latest consultation (cid/status + address/mobile if available)
        const res = await fetch(`${API_BASE_URL}/consultations/mine/latest`, {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!alive) return

        if (res.status === 204 || !res.ok) {
          setLatestCid(null)
          setLatestStatus(null)
          return
        }

        const j = await res.json()

        const cid = typeof j?.id === 'number' ? j.id : null
        setLatestCid(cid)
        setLatestStatus(typeof j?.status === 'string' ? j.status : null)

        // Defensive mapping across likely field names
        setPatientName((prev) => nz(j?.patientName ?? j?.contactName ?? j?.fullName ?? j?.name, prev))
        setMobile((prev) =>
          nz(
            j?.patientPhone ??
              j?.contactPhone ??
              j?.phone ??
              j?.mobile ??
              j?.whatsAppNumber ??
              j?.primaryWhatsAppNumber,
            prev
          )
        )
        setAddress((prev) => nz(j?.patientAddress ?? j?.contactAddress ?? j?.address ?? j?.currentLocation, prev))
        setDob((prev) => nz(j?.dob ?? j?.dateOfBirth ?? j?.patientDob, prev))
      } catch {
        // keep defaults (no crash)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  // WhatsApp target (doctor business number)
  const WA_NUMBER = '447783579014' // digits only, country code + number

  // NEW: build the final WhatsApp href based on choice
  const waHref = useMemo(() => {
    const consultationId = latestCid ? String(latestCid) : 'N/A'

    let contactLine = 'Please contact me on the same number from which I am messaging.'
    if (contactChoice === 'DIFFERENT') {
      const cc = onlyDigits(countryCode)
      const n = onlyDigits(altNumber)
      const full = cc && n ? `+${cc}${n}` : 'N/A'
      contactLine = `Please contact me on the number ${full}.`
    }

    const waMessage =
      `Hi, This is the patient ${patientName || 'N/A'}, ` +
      `I have logged a consultation call with GodwitCare, ` +
      `my details are Address: ${address || 'N/A'}, DOB: ${dob || 'N/A'}, Mobile: ${mobile || 'N/A'}. ` +
      `Consultation ID: ${consultationId}. ` +
      `Please look into my case. ` +
      contactLine

    const waText = encodeURIComponent(waMessage)

    const isMobileDevice =
      typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    // Desktop: web.whatsapp.com is most reliable for prefilled text
    // Mobile: api.whatsapp.com is reliable
    return isMobileDevice
      ? `https://api.whatsapp.com/send?phone=${WA_NUMBER}&text=${waText}`
      : `https://web.whatsapp.com/send?phone=${WA_NUMBER}&text=${waText}`
  }, [latestCid, patientName, address, dob, mobile, contactChoice, countryCode, altNumber])

  // Latest prescription URL (if exists)
  const [rxUrl, setRxUrl] = useState<string | null>(null)
  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/prescriptions/latest`, {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (ignore) return
        if (res.status === 204 || !res.ok) {
          setRxUrl(null)
          return
        }
        const j = await res.json().catch(() => null)
        if (j && j.pdfUrl) {
          setRxUrl(resolveApiUrl(API_BASE_URL, j.pdfUrl))
        } else {
          setRxUrl(null)
        }
      } catch {
        if (!ignore) setRxUrl(null)
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const isStep1Done = !!latestCid
  const hasRxOrCompleted = !!rxUrl || latestStatus === 'COMPLETED'

  // Shared styles
  const cardStyle: React.CSSProperties = {
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    background: 'linear-gradient(135deg, rgba(219,234,254,1) 0%, rgba(236,253,245,1) 100%)',
    border: '1px solid #dbeafe',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  }
  const step1CardStyle: React.CSSProperties = {
    ...cardStyle,
    opacity: isStep1Done ? 0.7 : 1,
    filter: isStep1Done ? 'grayscale(15%)' : 'none',
  }
  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 6,
  }
  const textStyle: React.CSSProperties = {
    marginTop: 4,
    maxWidth: 900,
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.4,
  }

  // Locate Pharmacy
  const [findingPharmacy, setFindingPharmacy] = useState(false)

  function openNearbyPharmacies() {
    setFindingPharmacy(true)

    const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
    const fallback = 'https://www.google.com/maps/search/pharmacy'

    // Geolocation works on HTTPS or http://localhost
    if (!('geolocation' in navigator)) {
      open(fallback)
      setFindingPharmacy(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const url = `https://www.google.com/maps/search/pharmacy/@${latitude},${longitude},14z`
        open(url)
        setFindingPharmacy(false)
      },
      () => {
        open(fallback)
        setFindingPharmacy(false)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  // NEW: click handlers for notify flow
  function onNotifyClick() {
    setContactErr(null)
    setShowContactPrompt(true)
  }

  function onCancelPrompt() {
    setContactErr(null)
    setShowContactPrompt(false)
  }

  function onProceedToWhatsApp() {
    setContactErr(null)

    if (contactChoice === 'DIFFERENT') {
      const cc = onlyDigits(countryCode)
      const n = onlyDigits(altNumber)

      if (!cc) {
        setContactErr('Please select a country code.')
        return
      }
      if (!n || n.length < 6) {
        setContactErr('Please enter a valid contact number (digits only).')
        return
      }
    }

    // Open WhatsApp with draft message
    window.open(waHref, '_blank', 'noopener,noreferrer')
    setShowContactPrompt(false)
  }

  return (
    <section className="section">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Your Consultation Journey
        </h1>
        <Link to="/home" className="btn secondary">
          Back to Home
        </Link>
      </div>

      {/* Toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            background: 'linear-gradient(135deg, rgba(34,197,94,1) 0%, rgba(16,185,129,1) 100%)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 10,
            boxShadow: '0 8px 20px rgba(16,185,129,.35)',
            zIndex: 1000,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span>✅ Your call has been logged. A doctor will contact you shortly.</span>
          <button
            onClick={() => setShowToast(false)}
            aria-label="Dismiss notification"
            style={{
              background: 'transparent',
              color: 'white',
              border: 'none',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Step 1 */}
      <div style={step1CardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={titleStyle}>Step 1: Complete Pre-Consultation Checklist</div>
            <div style={textStyle}>
              Fill out the necessary health questionnaire and consent forms before your session. This ensures a smooth and
              efficient experience.
            </div>
          </div>

          {isStep1Done ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn secondary" type="button" disabled>
                Submitted
              </button>
              <Link to={`/consultation/questionnaire?cid=${latestCid}`} className="btn" style={{ padding: '8px 12px', fontSize: 13 }}>
                Edit Details
              </Link>
            </div>
          ) : (
            <Link to="/consultation/questionnaire" className="btn">
              Submit Details
            </Link>
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 2: Notify GodwitCare</div>
            <div style={textStyle}>
              Initiate your consultation by notifying our team so a clinician can connect with you. This opens a WhatsApp
              chat with our helpline.
            </div>
          </div>

          <button
            type="button"
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={onNotifyClick}
          >
            Notify Clinician
          </button>
        </div>

        {/* NEW: Interstitial prompt */}
        {showContactPrompt && (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: 'white',
              boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, color: '#111827' }}>
              Contact preference
            </div>

            <div style={{ fontSize: 14, color: '#374151', marginBottom: 10 }}>
              Should the clinician contact you on the same WhatsApp number you are messaging from?
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="contactChoice"
                  checked={contactChoice === 'SAME'}
                  onChange={() => setContactChoice('SAME')}
                />
                <span>Yes</span>
              </label>

              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="contactChoice"
                  checked={contactChoice === 'DIFFERENT'}
                  onChange={() => setContactChoice('DIFFERENT')}
                />
                <span>No</span>
              </label>
            </div>

            {contactChoice === 'DIFFERENT' && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
                  Which number do you want to be contacted on? (required)
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="input"
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      minWidth: 220,
                      outline: 'none',
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.code}-${c.country}`} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <input
                    value={altNumber}
                    onChange={(e) => setAltNumber(e.target.value)}
                    placeholder="e.g. 211899955 (digits)"
                    style={{
                      flex: 1,
                      minWidth: 220,
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      outline: 'none',
                    }}
                    inputMode="tel"
                  />
                </div>

                <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                  We will append: <b>Please contact me on the number +{onlyDigits(countryCode)}{onlyDigits(altNumber) || '...'}</b>
                </div>
              </div>
            )}

            {contactErr && (
              <div
                style={{
                  marginTop: 12,
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                }}
              >
                {contactErr}
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" className="btn secondary" onClick={onCancelPrompt}>
                Cancel
              </button>
              <button type="button" className="btn" onClick={onProceedToWhatsApp}>
                Proceed to WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 3 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 3: Receive a call from Clinician</div>
            <div style={textStyle}>
              A clinician will contact you shortly via WhatsApp call to discuss your health concerns and provide expert
              medical advice.
            </div>
          </div>
          <Link to="/consultation/details" className="btn secondary">
            Upcoming
          </Link>
        </div>
      </div>

      {/* Step 4 — dynamic based on rxUrl */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 4: Prescription Issued</div>
            <div style={textStyle}>
              Receive your digital prescription in the app with dosage instructions and medication details.
            </div>
          </div>
          {rxUrl ? (
            <a className="btn" href={rxUrl} target="_blank" rel="noreferrer">
              View Prescription
            </a>
          ) : (
            <button className="btn secondary" type="button" disabled>
              Upcoming
            </button>
          )}
        </div>
      </div>

      {/* Step 5 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={titleStyle}>Step 5: Locate Pharmacy</div>
            <div style={textStyle}>
              Find the nearest pharmacy to pick up your prescribed medication.
            </div>
          </div>

          {hasRxOrCompleted ? (
            <button className="btn" type="button" onClick={openNearbyPharmacies} disabled={findingPharmacy}>
              {findingPharmacy ? 'Finding…' : 'Find Nearby Pharmacies'}
            </button>
          ) : (
            <button className="btn secondary" type="button" disabled>
              Upcoming
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
