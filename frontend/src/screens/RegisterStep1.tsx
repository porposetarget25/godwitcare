import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReg } from '../state/registration'

type Errors = Partial<Record<
  | 'firstName'
  | 'lastName'
  | 'dob'
  | 'gender'
  | 'primary'
  | 'password',
  string
>>

// ===== Country list (Full name + dial), alphabetically by country name =====
const RAW_COUNTRIES: Array<{ name: string; dial: string }> = [
  { name: 'Afghanistan', dial: '+93' },
  { name: 'Albania', dial: '+355' },
  { name: 'Algeria', dial: '+213' },
  { name: 'Andorra', dial: '+376' },
  { name: 'Angola', dial: '+244' },
  { name: 'Antigua and Barbuda', dial: '+1' },
  { name: 'Argentina', dial: '+54' },
  { name: 'Armenia', dial: '+374' },
  { name: 'Australia', dial: '+61' },
  { name: 'Austria', dial: '+43' },
  { name: 'Azerbaijan', dial: '+994' },
  { name: 'Bahamas', dial: '+1' },
  { name: 'Bahrain', dial: '+973' },
  { name: 'Bangladesh', dial: '+880' },
  { name: 'Barbados', dial: '+1' },
  { name: 'Belarus', dial: '+375' },
  { name: 'Belgium', dial: '+32' },
  { name: 'Belize', dial: '+501' },
  { name: 'Benin', dial: '+229' },
  { name: 'Bhutan', dial: '+975' },
  { name: 'Bolivia', dial: '+591' },
  { name: 'Bosnia and Herzegovina', dial: '+387' },
  { name: 'Botswana', dial: '+267' },
  { name: 'Brazil', dial: '+55' },
  { name: 'Brunei', dial: '+673' },
  { name: 'Bulgaria', dial: '+359' },
  { name: 'Burkina Faso', dial: '+226' },
  { name: 'Burundi', dial: '+257' },
  { name: 'Cambodia', dial: '+855' },
  { name: 'Cameroon', dial: '+237' },
  { name: 'Canada', dial: '+1' },
  { name: 'Cape Verde', dial: '+238' },
  { name: 'Central African Republic', dial: '+236' },
  { name: 'Chad', dial: '+235' },
  { name: 'Chile', dial: '+56' },
  { name: 'China', dial: '+86' },
  { name: 'Colombia', dial: '+57' },
  { name: 'Comoros', dial: '+269' },
  { name: 'Congo (Republic)', dial: '+242' },
  { name: 'Congo (DRC)', dial: '+243' },
  { name: 'Costa Rica', dial: '+506' },
  { name: 'Côte d’Ivoire', dial: '+225' },
  { name: 'Croatia', dial: '+385' },
  { name: 'Cuba', dial: '+53' },
  { name: 'Cyprus', dial: '+357' },
  { name: 'Czechia', dial: '+420' },
  { name: 'Denmark', dial: '+45' },
  { name: 'Djibouti', dial: '+253' },
  { name: 'Dominica', dial: '+1' },
  { name: 'Dominican Republic', dial: '+1' },
  { name: 'Ecuador', dial: '+593' },
  { name: 'Egypt', dial: '+20' },
  { name: 'El Salvador', dial: '+503' },
  { name: 'Equatorial Guinea', dial: '+240' },
  { name: 'Eritrea', dial: '+291' },
  { name: 'Estonia', dial: '+372' },
  { name: 'Eswatini', dial: '+268' },
  { name: 'Ethiopia', dial: '+251' },
  { name: 'Fiji', dial: '+679' },
  { name: 'Finland', dial: '+358' },
  { name: 'France', dial: '+33' },
  { name: 'Gabon', dial: '+241' },
  { name: 'Gambia', dial: '+220' },
  { name: 'Georgia', dial: '+995' },
  { name: 'Germany', dial: '+49' },
  { name: 'Ghana', dial: '+233' },
  { name: 'Greece', dial: '+30' },
  { name: 'Grenada', dial: '+1' },
  { name: 'Guatemala', dial: '+502' },
  { name: 'Guinea', dial: '+224' },
  { name: 'Guinea-Bissau', dial: '+245' },
  { name: 'Guyana', dial: '+592' },
  { name: 'Haiti', dial: '+509' },
  { name: 'Honduras', dial: '+504' },
  { name: 'Hungary', dial: '+36' },
  { name: 'Iceland', dial: '+354' },
  { name: 'India', dial: '+91' },
  { name: 'Indonesia', dial: '+62' },
  { name: 'Iran', dial: '+98' },
  { name: 'Iraq', dial: '+964' },
  { name: 'Ireland', dial: '+353' },
  { name: 'Israel', dial: '+972' },
  { name: 'Italy', dial: '+39' },
  { name: 'Jamaica', dial: '+1' },
  { name: 'Japan', dial: '+81' },
  { name: 'Jordan', dial: '+962' },
  { name: 'Kazakhstan', dial: '+7' },
  { name: 'Kenya', dial: '+254' },
  { name: 'Kiribati', dial: '+686' },
  { name: 'Kuwait', dial: '+965' },
  { name: 'Kyrgyzstan', dial: '+996' },
  { name: 'Laos', dial: '+856' },
  { name: 'Latvia', dial: '+371' },
  { name: 'Lebanon', dial: '+961' },
  { name: 'Lesotho', dial: '+266' },
  { name: 'Liberia', dial: '+231' },
  { name: 'Libya', dial: '+218' },
  { name: 'Liechtenstein', dial: '+423' },
  { name: 'Lithuania', dial: '+370' },
  { name: 'Luxembourg', dial: '+352' },
  { name: 'Madagascar', dial: '+261' },
  { name: 'Malawi', dial: '+265' },
  { name: 'Malaysia', dial: '+60' },
  { name: 'Maldives', dial: '+960' },
  { name: 'Mali', dial: '+223' },
  { name: 'Malta', dial: '+356' },
  { name: 'Marshall Islands', dial: '+692' },
  { name: 'Mauritania', dial: '+222' },
  { name: 'Mauritius', dial: '+230' },
  { name: 'Mexico', dial: '+52' },
  { name: 'Micronesia', dial: '+691' },
  { name: 'Moldova', dial: '+373' },
  { name: 'Monaco', dial: '+377' },
  { name: 'Mongolia', dial: '+976' },
  { name: 'Montenegro', dial: '+382' },
  { name: 'Morocco', dial: '+212' },
  { name: 'Mozambique', dial: '+258' },
  { name: 'Myanmar', dial: '+95' },
  { name: 'Namibia', dial: '+264' },
  { name: 'Nauru', dial: '+674' },
  { name: 'Nepal', dial: '+977' },
  { name: 'Netherlands', dial: '+31' },
  { name: 'New Zealand', dial: '+64' },
  { name: 'Nicaragua', dial: '+505' },
  { name: 'Niger', dial: '+227' },
  { name: 'Nigeria', dial: '+234' },
  { name: 'North Macedonia', dial: '+389' },
  { name: 'Norway', dial: '+47' },
  { name: 'Oman', dial: '+968' },
  { name: 'Pakistan', dial: '+92' },
  { name: 'Palau', dial: '+680' },
  { name: 'Panama', dial: '+507' },
  { name: 'Papua New Guinea', dial: '+675' },
  { name: 'Paraguay', dial: '+595' },
  { name: 'Peru', dial: '+51' },
  { name: 'Philippines', dial: '+63' },
  { name: 'Poland', dial: '+48' },
  { name: 'Portugal', dial: '+351' },
  { name: 'Qatar', dial: '+974' },
  { name: 'Romania', dial: '+40' },
  { name: 'Russia', dial: '+7' },
  { name: 'Rwanda', dial: '+250' },
  { name: 'Saint Kitts and Nevis', dial: '+1' },
  { name: 'Saint Lucia', dial: '+1' },
  { name: 'Saint Vincent and the Grenadines', dial: '+1' },
  { name: 'Samoa', dial: '+685' },
  { name: 'San Marino', dial: '+378' },
  { name: 'São Tomé and Príncipe', dial: '+239' },
  { name: 'Saudi Arabia', dial: '+966' },
  { name: 'Senegal', dial: '+221' },
  { name: 'Serbia', dial: '+381' },
  { name: 'Seychelles', dial: '+248' },
  { name: 'Sierra Leone', dial: '+232' },
  { name: 'Singapore', dial: '+65' },
  { name: 'Slovakia', dial: '+421' },
  { name: 'Slovenia', dial: '+386' },
  { name: 'Solomon Islands', dial: '+677' },
  { name: 'Somalia', dial: '+252' },
  { name: 'South Africa', dial: '+27' },
  { name: 'South Korea', dial: '+82' },
  { name: 'South Sudan', dial: '+211' },
  { name: 'Spain', dial: '+34' },
  { name: 'Sri Lanka', dial: '+94' },
  { name: 'Sudan', dial: '+249' },
  { name: 'Suriname', dial: '+597' },
  { name: 'Sweden', dial: '+46' },
  { name: 'Switzerland', dial: '+41' },
  { name: 'Syria', dial: '+963' },
  { name: 'Taiwan', dial: '+886' },
  { name: 'Tajikistan', dial: '+992' },
  { name: 'Tanzania', dial: '+255' },
  { name: 'Thailand', dial: '+66' },
  { name: 'Timor-Leste', dial: '+670' },
  { name: 'Togo', dial: '+228' },
  { name: 'Tonga', dial: '+676' },
  { name: 'Trinidad and Tobago', dial: '+1' },
  { name: 'Tunisia', dial: '+216' },
  { name: 'Turkey', dial: '+90' },
  { name: 'Turkmenistan', dial: '+993' },
  { name: 'Tuvalu', dial: '+688' },
  { name: 'Uganda', dial: '+256' },
  { name: 'Ukraine', dial: '+380' },
  { name: 'United Arab Emirates', dial: '+971' },
  { name: 'United Kingdom', dial: '+44' },
  { name: 'United States', dial: '+1' },
  { name: 'Uruguay', dial: '+598' },
  { name: 'Uzbekistan', dial: '+998' },
  { name: 'Vanuatu', dial: '+678' },
  { name: 'Venezuela', dial: '+58' },
  { name: 'Vietnam', dial: '+84' },
  { name: 'Yemen', dial: '+967' },
  { name: 'Zambia', dial: '+260' },
  { name: 'Zimbabwe', dial: '+263' },
]

// Build select options “Country Name (+XX)”, sorted A→Z
const COUNTRY_OPTIONS = [...RAW_COUNTRIES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(c => ({ value: c.dial, label: `${c.name} (${c.dial})` }))

export default function Step1() {
  const { draft, setDraft } = useReg()
  const nav = useNavigate()
  const [errors, setErrors] = useState<Errors>({})

  // sensible defaults
  const defaultPrimaryDial = useMemo(
    () => draft.primaryDial || '+91',
    [draft.primaryDial]
  )
  const defaultSecondaryDial = useMemo(
    () => draft.secondaryDial || '+91',
    [draft.secondaryDial]
  )

  function validate(): boolean {
    const next: Errors = {}
    if (!draft['First Name']?.trim()) next.firstName = 'Required'
    if (!draft['Last Name']?.trim()) next.lastName = 'Required'
    if (!draft['Date of Birth']) next.dob = 'Required'
    if (!draft['Gender']) next.gender = 'Required'
    if (!draft['Primary WhatsApp Number']?.trim()) next.primary = 'Required'
    // Secondary WhatsApp NOT required
    // Email NOT required
    if (!draft['Account Password']?.trim()) next.password = 'Required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function normalizeDigits(s: string): string {
    return String(s || '').replace(/[^\d]/g, '')
  }

  function next(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    // Compose full international numbers before proceeding
    const primaryDial = draft.primaryDial || defaultPrimaryDial
    const secondaryDial = draft.secondaryDial || defaultSecondaryDial

    const primaryFull = `${primaryDial}${normalizeDigits(draft['Primary WhatsApp Number'] || '')}`
    const secondaryRaw = normalizeDigits(draft['Carer/Secondary WhatsApp Number'] || '')
    const secondaryFull = secondaryRaw ? `${secondaryDial}${secondaryRaw}` : ''

    // Username = primary WhatsApp number
    const updated = {
      ...draft,
      primaryDial,
      secondaryDial,
      ['Primary WhatsApp Number']: primaryFull,
      ['Carer/Secondary WhatsApp Number']: secondaryFull, // may be ''
      Username: primaryFull,
    }

    setDraft(updated)
    nav('/register/2')
  }

  return (
    <section className="section">
      <div className="form">
        <h2>Personal Information</h2>
        <form className="grid" onSubmit={next} noValidate>
          <div className="grid two">
            <div className="field">
              <label>First Name <span style={{color:'#e11d48'}}>*</span></label>
              <input
                value={draft['First Name'] || ''}
                onChange={(e) => setDraft({ ...draft, ['First Name']: e.target.value })}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && <div className="help" style={{color:'#e11d48'}}>{errors.firstName}</div>}
            </div>
            <div className="field">
              <label>Middle Name</label>
              <input
                value={draft['Middle Name'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Middle Name']: e.target.value })}
              />
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Last Name <span style={{color:'#e11d48'}}>*</span></label>
              <input
                value={draft['Last Name'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Last Name']: e.target.value })}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && <div className="help" style={{color:'#e11d48'}}>{errors.lastName}</div>}
            </div>
            <div className="field">
              <label>Date of Birth <span style={{color:'#e11d48'}}>*</span></label>
              <input
                type="date"
                value={draft['Date of Birth'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Date of Birth']: e.target.value })}
                aria-invalid={!!errors.dob}
              />
              {errors.dob && <div className="help" style={{color:'#e11d48'}}>{errors.dob}</div>}
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Gender <span style={{color:'#e11d48'}}>*</span></label>
              <select
                value={draft['Gender'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Gender']: e.target.value })}
                aria-invalid={!!errors.gender}
              >
                <option value="">Select Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              {errors.gender && <div className="help" style={{color:'#e11d48'}}>{errors.gender}</div>}
            </div>

            <div className="field">
              <label>Primary WhatsApp Number <span style={{color:'#e11d48'}}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={draft.primaryDial || defaultPrimaryDial}
                  onChange={e => setDraft({ ...draft, primaryDial: e.target.value })}
                  style={{ minWidth: 220 }}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="1234567890"
                  value={draft['Primary WhatsApp Number'] || ''}
                  onChange={(e) => setDraft({ ...draft, ['Primary WhatsApp Number']: e.target.value })}
                  aria-invalid={!!errors.primary}
                />
              </div>
              {errors.primary && <div className="help" style={{color:'#e11d48'}}>{errors.primary}</div>}
            </div>
          </div>

          <div className="grid two">
            <div className="field">
              <label>Carer/Secondary WhatsApp Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={draft.secondaryDial || defaultSecondaryDial}
                  onChange={e => setDraft({ ...draft, secondaryDial: e.target.value })}
                  style={{ minWidth: 220 }}
                >
                  {COUNTRY_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="1234567890"
                  value={draft['Carer/Secondary WhatsApp Number'] || ''}
                  onChange={(e) => setDraft({ ...draft, ['Carer/Secondary WhatsApp Number']: e.target.value })}
                />
              </div>
              {/* Not required, so no error */}
            </div>

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={draft['Email Address'] || ''}
                onChange={(e) => setDraft({ ...draft, ['Email Address']: e.target.value })}
              />
              {/* Not required, so no error */}
            </div>
          </div>

          <div className="field">
            <label>Create Password <span style={{color:'#e11d48'}}>*</span></label>
            <input
              type="password"
              placeholder="Choose a secure password"
              value={draft['Account Password'] || ''}
              onChange={(e) => setDraft({ ...draft, ['Account Password']: e.target.value })}
              aria-invalid={!!errors.password}
            />
            {errors.password && <div className="help" style={{color:'#e11d48'}}>{errors.password}</div>}
          </div>

          <div className="actions">
            <button className="btn block">Save Information &amp; Continue</button>
          </div>
        </form>
      </div>
    </section>
  )
}
