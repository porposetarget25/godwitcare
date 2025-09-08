import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useReg } from '../state/registration'

function Toggle({ value, onChange }:{ value:boolean, onChange:(v:boolean)=>void }){
  return (
    <div className="actions">
      <button type="button" className={'btn ' + (value?'':'secondary')} onClick={()=>onChange(true)}>Yes</button>
      <button type="button" className={'btn ' + (!value?'':'secondary')} onClick={()=>onChange(false)}>No</button>
    </div>
  )
}

export default function Step2(){
  const { draft, setDraft } = useReg()
  const nav = useNavigate()
  function next(e: React.FormEvent){ e.preventDefault(); nav('/register/3') }
  return (
    <section className="section">
      <div className="form">
        <h2>Please share any information we should be aware to support your travel</h2>
        <form className="grid" onSubmit={next}>
          <div className="field">
            <label>1. Are you on any long-term/regular medication that we should be aware of?</label>
            <Toggle value={draft['Are you on any long-term/regular medication that we should be aware of?']}
                    onChange={v=>setDraft({...draft, ['Are you on any long-term/regular medication that we should be aware of?']: v})}/>
          </div>
          <div className="field">
            <label>2. Do you have any health condition that can affect your trip?</label>
            <Toggle value={draft['Do you have any health condition that can affect your trip?']}
                    onChange={v=>setDraft({...draft, ['Do you have any health condition that can affect your trip?']: v})}/>
          </div>
          <div className="field">
            <label>3. Do you have any allergies that can affect your trip?</label>
            <Toggle value={draft['Do you have any allergies that can affect your trip?']}
                    onChange={v=>setDraft({...draft, ['Do you have any allergies that can affect your trip?']: v})}/>
          </div>
          <div className="field">
            <label>4. Have you been advised to produce a fit-to-fly certificate?</label>
            <Toggle value={draft['Have you been advised to produce a fit-to-fly certificate?']}
                    onChange={v=>setDraft({...draft, ['Have you been advised to produce a fit-to-fly certificate?']: v})}/>
          </div>
          <div className="actions"><button className="btn block">Save Information &amp; Continue</button></div>
        </form>
      </div>
    </section>
  )
}
