import React, { createContext, useContext, useState } from 'react'
import type { Registration } from '../api'

const defaults: Registration = {
  'First Name':'', 'Middle Name':'', 'Last Name':'', 'Date of Birth':'', 'Gender':'',
  'Primary WhatsApp Number':'', 'Carer/Secondary WhatsApp Number':'', 'Email Address':'',
  'Are you on any long-term/regular medication that we should be aware of?': false,
  'Do you have any health condition that can affect your trip?': false,
  'Do you have any allergies that can affect your trip?': false,
  'Have you been advised to produce a fit-to-fly certificate?': false,
  'Travelling From':'', 'Travelling To (UK & Europe)':'', 'Travel Start Date':'', 'Travel End Date':'',
  'Package Days': 7
}

type Ctx = { draft: Registration; setDraft: React.Dispatch<React.SetStateAction<Registration>> }
const RegCtx = createContext<Ctx>({ draft: defaults, setDraft: ()=>{} } as any)

export function RegProvider({ children }: { children: React.ReactNode }){
  const [draft, setDraft] = useState<Registration>(() => {
    const cached = localStorage.getItem('reg-draft'); return cached ? JSON.parse(cached) : defaults
  })
  function setDraftPersist(updater: any){
    setDraft((prev:any)=>{ const next = typeof updater==='function'?updater(prev):updater; localStorage.setItem('reg-draft', JSON.stringify(next)); return next })
  }
  return <RegCtx.Provider value={{ draft, setDraft: setDraftPersist }}>{children}</RegCtx.Provider>
}
export function useReg(){ return useContext(RegCtx) }
