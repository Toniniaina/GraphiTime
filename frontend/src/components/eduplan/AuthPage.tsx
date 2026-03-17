import { useState } from 'react'
import type { DbMe } from './types'

export function AuthPage({
  onAuthed,
}: {
  onAuthed: (me: DbMe) => void | Promise<void>
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [schoolName, setSchoolName] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdVisible, setPwdVisible] = useState(false)
  const [confirmPwdVisible, setConfirmPwdVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string>('')

  const validatePasswordLength = (password: string): string | null => {
    if (password.length > 72) {
      return 'Le mot de passe ne doit pas dépasser 72 caractères.'
    }
    return null
  }

  async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query, variables }),
    })

    const json = await res.json()
    if (!res.ok || json?.errors?.length) {
      throw new Error(json?.errors?.[0]?.message ?? `HTTP ${res.status}`)
    }
    return json.data as T
  }

  function showToast(html: string) {
    setToast(html)
    window.setTimeout(() => setToast(''), 3500)
  }

  async function submit() {
    setBusy(true)
    setError('')
    try {
      const l = login.trim()
      const p = password
      if (!l || !p) return

      if (mode === 'register') {
        const sn = schoolName.trim()
        if (!sn) return
        const pwLenErr = validatePasswordLength(password)
        if (pwLenErr) {
          setError(pwLenErr)
          return
        }
        if (p.length < 6) {
          setError('Mot de passe: 6 caractères minimum')
          return
        }
        if (p !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas')
          return
        }
        const data = await graphql<{ registerSchool: { ok: boolean; error?: string | null; me?: DbMe | null } }>(
          'mutation ($input: RegisterSchoolInput!) { registerSchool(input: $input) { ok error me { accountId login school { id name } } } }',
          { input: { schoolName: sn, login: l, password: p } },
        )
        if (!data.registerSchool.ok || !data.registerSchool.me) {
          throw new Error(data.registerSchool.error ?? "Inscription impossible")
        }
        showToast('✦ École créée. <span class="toast-gold">Connexion…</span>')
        await onAuthed(data.registerSchool.me)
        return
      }

      const pwLenErr = validatePasswordLength(password)
      if (pwLenErr) {
        setError(pwLenErr)
        return
      }
      if (!password) {
        setError('Le mot de passe est requis')
        return
      }

      const data = await graphql<{ login: { ok: boolean; error?: string | null; me?: DbMe | null } }>(
        'mutation ($input: LoginInput!) { login(input: $input) { ok error me { accountId login school { id name } } } }',
        { input: { login: l, password: p } },
      )
      if (!data.login.ok || !data.login.me) {
        throw new Error(data.login.error ?? 'Connexion impossible')
      }
      showToast('✦ Bienvenue ! <span class="toast-gold">Redirection…</span>')
      await onAuthed(data.login.me)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <style>
        {`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --navy:#0d1f35; --navy2:#1a3a5c; --gold:#c8922a; --gold2:#e8b84b; --cream:#f4f0e8; --cream2:#ede8de; --red:#c0392b; --green:#2d6a4f; --serif:'Georgia','Times New Roman',serif; }
        html, body { height: 100%; font-family: var(--serif); background: var(--cream); color: var(--navy); }
        .auth-root { display:flex; min-height:100vh; }
        .panel-left { width:420px; flex-shrink:0; background:var(--navy); display:flex; flex-direction:column; justify-content:space-between; padding:48px 44px; position:relative; overflow:hidden; }
        .panel-left::before { content:''; position:absolute; top:-80px; right:-80px; width:280px; height:280px; border:1.5px solid rgba(200,146,42,0.15); border-radius:50%; pointer-events:none; }
        .panel-left::after { content:''; position:absolute; bottom:-60px; left:-60px; width:220px; height:220px; border:1.5px solid rgba(200,146,42,0.1); border-radius:50%; pointer-events:none; }
        .geo-ring { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:360px; height:360px; border:1px solid rgba(200,146,42,0.06); border-radius:50%; pointer-events:none; }
        .logo { display:flex; align-items:center; gap:12px; position:relative; z-index:1; }
        .logo-star { font-size:28px; color:var(--gold); line-height:1; }
        .logo-text { font-size:26px; font-weight:700; color:#f4f0e8; letter-spacing:0.04em; }
        .panel-left-body { position:relative; z-index:1; }
        .panel-tagline { font-size:32px; font-weight:700; color:#f4f0e8; line-height:1.25; margin-bottom:18px; }
        .panel-tagline em { font-style:normal; color:var(--gold); }
        .panel-desc { font-size:14px; color:rgba(244,240,232,0.55); line-height:1.7; max-width:300px; }
        .features { list-style:none; margin-top:36px; display:flex; flex-direction:column; gap:14px; }
        .features li { display:flex; align-items:center; gap:12px; font-size:13px; color:rgba(244,240,232,0.7); }
        .feat-icon { width:32px; height:32px; background:rgba(200,146,42,0.12); border:1px solid rgba(200,146,42,0.2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; color:var(--gold); flex-shrink:0; }
        .school-badge { display:flex; align-items:center; gap:10px; background:rgba(200,146,42,0.08); border:1px solid rgba(200,146,42,0.2); border-radius:12px; padding:14px 18px; position:relative; z-index:1; }
        .school-dot { width:8px; height:8px; background:var(--gold); border-radius:50%; flex-shrink:0; }
        .school-name { font-size:13px; font-weight:600; color:#f4f0e8; }
        .school-sub { font-size:11px; color:rgba(244,240,232,0.45); margin-top:2px; }
        .panel-right { flex:1; display:flex; align-items:center; justify-content:center; padding:48px 32px; background:var(--cream); }
        .auth-card { width:100%; max-width:460px; animation:fadeUp 0.5s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .auth-tabs { display:flex; background:white; border:1px solid rgba(13,31,53,0.1); border-radius:14px; padding:4px; margin-bottom:32px; }
        .tab-btn { flex:1; padding:10px 0; background:transparent; border:none; border-radius:10px; font-family:var(--serif); font-size:14px; font-weight:600; color:rgba(13,31,53,0.4); cursor:pointer; transition:all 0.25s; letter-spacing:0.02em; }
        .tab-btn.active { background:var(--navy); color:var(--gold); box-shadow:0 2px 10px rgba(13,31,53,0.15); }
        .form-title { font-size:26px; font-weight:700; color:var(--navy); letter-spacing:-0.01em; margin-bottom:6px; }
        .form-sub { font-size:13px; color:rgba(13,31,53,0.45); margin-bottom:28px; line-height:1.5; }
        .form-group { display:flex; flex-direction:column; gap:6px; margin-bottom:16px; }
        label { font-size:11px; font-weight:700; letter-spacing:0.08em; color:rgba(13,31,53,0.5); text-transform:uppercase; }
        .input-wrap { position:relative; }
        .input-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); font-size:15px; color:rgba(13,31,53,0.3); pointer-events:none; }
        input[type="text"], input[type="email"], input[type="password"] { width:100%; background:white; border:1.5px solid rgba(13,31,53,0.12); border-radius:11px; padding:11px 14px 11px 40px; font-family:var(--serif); font-size:14px; color:var(--navy); outline:none; transition:border-color 0.2s, box-shadow 0.2s; }
        input:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(200,146,42,0.12); }
        .pwd-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:15px; color:rgba(13,31,53,0.35); padding:2px; transition:color 0.15s; }
        .pwd-toggle:hover { color:var(--navy); }
        .submit-btn { width:100%; background:var(--navy); color:var(--gold); border:none; border-radius:12px; padding:13px 0; font-family:var(--serif); font-size:15px; font-weight:700; letter-spacing:0.03em; cursor:pointer; transition:all 0.2s; margin-bottom:14px; position:relative; overflow:hidden; }
        .submit-btn::after { content:''; position:absolute; inset:0; background:rgba(200,146,42,0.08); opacity:0; transition:opacity 0.2s; }
        .submit-btn:hover::after { opacity:1; }
        .submit-btn:active { transform:scale(0.99); }
        .submit-btn[disabled] { opacity:0.65; cursor:not-allowed; }
        .alert { border-radius:11px; padding:12px 16px; font-size:13px; margin-bottom:18px; }
        .alert-error { background:rgba(192,57,43,0.08); border:1px solid rgba(192,57,43,0.2); color:var(--red); }
        .toast { position:fixed; bottom:32px; left:50%; transform:translateX(-50%) translateY(80px); background:var(--navy); color:#f4f0e8; border:1px solid rgba(200,146,42,0.3); border-radius:12px; padding:13px 24px; font-size:14px; font-family:var(--serif); box-shadow:0 8px 32px rgba(13,31,53,0.3); opacity:0; transition:all 0.35s cubic-bezier(.4,0,.2,1); z-index:999; white-space:nowrap; }
        .toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
        .toast .toast-gold { color:var(--gold); font-weight:700; }
        @media (max-width: 760px) { .panel-left { display:none; } .panel-right { padding:32px 20px; } }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:rgba(13,31,53,0.15); border-radius:99px; }
        `}
      </style>

      <div className="auth-root">
        <div className="panel-left">
          <div className="geo-ring" />
          <div className="logo">
            <span className="logo-star">✦</span>
            <span className="logo-text">GraphiTime</span>
          </div>

          <div className="panel-left-body">
            <div className="panel-tagline">
              Gérez votre école<br />avec <em>élégance</em>
            </div>
            <p className="panel-desc">
              Planifiez les emplois du temps, gérez les classes, les professeurs et les salles — tout en un seul endroit.
            </p>
            <ul className="features">
              <li>
                <div className="feat-icon">◉</div>
                Planning visuel hebdomadaire
              </li>
              <li>
                <div className="feat-icon">⊞</div>
                Gestion des classes & effectifs
              </li>
              <li>
                <div className="feat-icon">⊛</div>
                Suivi des professeurs & matières
              </li>
              <li>
                <div className="feat-icon">◈</div>
                Attribution intelligente des salles
              </li>
            </ul>
          </div>

          <div className="school-badge">
            <div className="school-dot" />
            <div>
              <div className="school-name">Connexion établissement</div>
              <div className="school-sub">Compte admin par école</div>
            </div>
          </div>
        </div>

        <div className="panel-right">
          <div className="auth-card">
            <div className="auth-tabs">
              <button
                className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  if (busy) return
                  setMode('login')
                  setError('')
                }}
                type="button"
              >
                Connexion
              </button>
              <button
                className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  if (busy) return
                  setMode('register')
                  setError('')
                }}
                type="button"
              >
                Créer une école
              </button>
            </div>

            {mode === 'login' ? (
              <div>
                <div className="form-title">Bon retour 👋</div>
                <p className="form-sub">Connectez-vous avec l'identifiant admin de votre école</p>

                {error ? <div className="alert alert-error">⚠ {error}</div> : null}

                <div className="form-group">
                  <label>Identifiant admin</label>
                  <div className="input-wrap">
                    <span className="input-icon">◎</span>
                    <input
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="admin@mon-ecole"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mot de passe</label>
                  <div className="input-wrap">
                    <span className="input-icon">◈</span>
                    <input
                      type={pwdVisible ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      className="pwd-toggle"
                      type="button"
                      onClick={() => setPwdVisible((v) => !v)}
                      tabIndex={-1}
                    >
                      {pwdVisible ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button className="submit-btn" onClick={submit} disabled={busy} type="button">
                  {busy ? '⟳ Connexion en cours…' : 'Connexion →'}
                </button>

                <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(13,31,53,0.45)' }}>
                  Votre école n'est pas encore créée ?{' '}
                  <a
                    href="#"
                    style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}
                    onClick={(e) => {
                      e.preventDefault()
                      if (busy) return
                      setMode('register')
                      setError('')
                    }}
                  >
                    Créer une école
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <div className="form-title">Créer une école</div>
                <p className="form-sub">Crée l'école + le compte admin associé (1 admin par école)</p>

                {error ? <div className="alert alert-error">⚠ {error}</div> : null}

                <div className="form-group">
                  <label>Nom de l'école</label>
                  <div className="input-wrap">
                    <span className="input-icon">⊞</span>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Ex: Collège …"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Identifiant admin</label>
                  <div className="input-wrap">
                    <span className="input-icon">◎</span>
                    <input
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="admin@mon-ecole"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mot de passe</label>
                  <div className="input-wrap">
                    <span className="input-icon">◈</span>
                    <input
                      type={pwdVisible ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 caractères"
                      autoComplete="new-password"
                    />
                    <button
                      className="pwd-toggle"
                      type="button"
                      onClick={() => setPwdVisible((v) => !v)}
                      tabIndex={-1}
                    >
                      {pwdVisible ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirmer le mot de passe</label>
                  <div className="input-wrap">
                    <span className="input-icon">◈</span>
                    <input
                      type={confirmPwdVisible ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      autoComplete="new-password"
                    />
                    <button
                      className="pwd-toggle"
                      type="button"
                      onClick={() => setConfirmPwdVisible((v) => !v)}
                      tabIndex={-1}
                    >
                      {confirmPwdVisible ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <button className="submit-btn" onClick={submit} disabled={busy} type="button">
                  {busy ? '⟳ Création en cours…' : 'Créer mon compte →'}
                </button>

                <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(13,31,53,0.45)' }}>
                  Déjà un compte ?{' '}
                  <a
                    href="#"
                    style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}
                    onClick={(e) => {
                      e.preventDefault()
                      if (busy) return
                      setMode('login')
                      setError('')
                    }}
                  >
                    Se connecter
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`} dangerouslySetInnerHTML={{ __html: toast }} />
    </>
  )
}
