import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'

export default function Login(){
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  async function submit(e: React.FormEvent){ e.preventDefault(); try{ await login(email,password); nav('/home') } catch(e:any){ setErr(e.message) } }
  return (
    <div style={{padding:16}}>
      <h2>Login</h2>
      <form className="grid" onSubmit={submit}>
        <label>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label>Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {err && <div style={{color:'#f87171'}}>{err}</div>}
        <button className="btn">Continue</button>
      </form>
    </div>
  )
}
