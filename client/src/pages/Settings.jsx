import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AtSign, Bell, Camera, Check, KeyRound, Lock, LogOut, MapPin, Monitor, Moon, Palette, Shield, Sun, Trash2, User } from 'lucide-react'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Input, { Textarea } from '../components/ui/Input'
import { Badge, Toggle } from '../components/ui/misc'
import { ConfirmModal } from '../components/chat/GroupModals'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { ACCENTS, useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { api, errMsg } from '../lib/api'
import { cn } from '../lib/utils'

const TABS = [
  ['profile', 'Profile', User],
  ['appearance', 'Appearance', Palette],
  ['notifications', 'Notifications', Bell],
  ['privacy', 'Privacy', Shield],
  ['security', 'Security', Lock],
]

function Card({ title, text, children }) {
  return (
    <section className="shadow-soft rounded-3xl border border-line bg-card p-5 sm:p-7">
      <h3 className="text-3xl leading-tight">{title}</h3>
      {text && <p className="mt-1 text-sm text-mute">{text}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Row({ title, text, children }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-line py-4 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{title}</p>
        {text && <p className="mt-0.5 text-[13px] leading-snug text-mute">{text}</p>}
      </div>
      {children}
    </div>
  )
}

function ProfileTab() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name, username: user.username, bio: user.bio, statusMessage: user.statusMessage, location: user.location, website: user.website })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value }))
  const dirty = Object.keys(form).some((k) => form[k] !== user[k])

  const uploadAvatar = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/users/me/avatar', fd)
      setUser(data.user)
      toast.success('Profile picture updated')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const removeAvatar = async () => {
    try {
      const { data } = await api.delete('/users/me/avatar')
      setUser(data.user)
      toast.success('Profile picture removed')
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    try {
      const { data } = await api.put('/users/me', form)
      setUser(data.user)
      toast.success('Profile saved')
    } catch (err) {
      const fields = err.serverData?.errors
      if (fields?.length) setErrors(Object.fromEntries(fields.map((f) => [f.field, f.message])))
      else if (err.serverCode === 'DUPLICATE') setErrors({ username: err.userMessage })
      else toast.error(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Your photo" text="This is how people see you across Connectly.">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative">
            <Avatar src={user.avatar} name={user.name} size="2xl" />
            {uploading && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-xs font-bold text-white">Uploading…</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={Camera} variant="outline" onClick={() => fileRef.current?.click()} loading={uploading}>Upload new photo</Button>
            {user.avatar && <Button variant="dangerSoft" onClick={removeAvatar}>Remove</Button>}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
            <p className="w-full text-xs text-mute">PNG, JPG, WEBP or GIF up to 6 MB.</p>
          </div>
        </div>
      </Card>

      <Card title="Personal details">
        <form onSubmit={save} className="grid gap-5 sm:grid-cols-2" noValidate>
          <Input label="Full name" icon={User} value={form.name} onChange={set('name')} error={errors.name} />
          <Input label="Username" icon={AtSign} value={form.username} onChange={set('username')} error={errors.username} />
          <Input wrapperClassName="sm:col-span-2" label="Custom status" value={form.statusMessage} onChange={set('statusMessage')} maxLength={80} placeholder="What's on your mind? ✨" error={errors.statusMessage} hint="Shown to people you chat with." />
          <Textarea wrapperClassName="sm:col-span-2" label="Bio" value={form.bio} onChange={set('bio')} maxLength={240} placeholder="Tell people a little about yourself" error={errors.bio} hint={`${form.bio.length}/240`} />
          <Input label="Location" icon={MapPin} value={form.location} onChange={set('location')} maxLength={60} placeholder="Karachi, Pakistan" error={errors.location} />
          <Input label="Website" value={form.website} onChange={set('website')} placeholder="https://yoursite.com" error={errors.website} />
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <p className="text-sm text-mute">{user.email}{user.isVerified && <Badge tone="green" className="ml-2"><Check className="h-3 w-3" /> verified</Badge>}</p>
            <Button type="submit" loading={saving} disabled={!dirty}>Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function AppearanceTab() {
  const { mode, setTheme, accent, setAccent, cursorFx, setCursorFx } = useTheme()
  return (
    <div className="space-y-6">
      <Card title="Theme" text="Choose how Connectly looks on this device.">
        <div className="grid grid-cols-3 gap-3">
          {[
            ['light', 'Light', Sun],
            ['dark', 'Dark', Moon],
            ['system', 'System', Monitor],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn('flex flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-5 text-sm font-semibold transition', mode === id ? 'border-brand-500 bg-brand-500/8 text-brand-600' : 'border-line hover:border-brand-300')}
            >
              <Icon className="h-6 w-6" />
              {label}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Accent colour" text="Pick the colour that fits your mood.">
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              className={cn('flex h-12 w-12 items-center justify-center rounded-full text-white shadow-soft transition hover:scale-110', accent === a.id && 'ring-4 ring-offset-2 ring-offset-card')}
              style={{ background: a.color, '--tw-ring-color': a.color }}
              aria-label={a.id}
              title={a.id}
            >
              {accent === a.id && <Check className="h-5 w-5" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Motion & cursor">
        <Row title="Animated cursor" text="A trailing ring with sparkles that reacts to buttons and text. Only on devices with a mouse.">
          <Toggle checked={cursorFx} onChange={setCursorFx} label="Animated cursor" />
        </Row>
      </Card>
    </div>
  )
}

function NotificationsTab() {
  const { user, setUser } = useAuth()
  const { requestNotificationPermission } = useChat()
  const toast = useToast()
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'))

  const update = async (key, value) => {
    const prev = user.notifications
    setUser({ ...user, notifications: { ...prev, [key]: value } })
    try {
      const { data } = await api.put('/users/me/settings', { notifications: { [key]: value } })
      setUser(data.user)
    } catch (e) {
      setUser({ ...user, notifications: prev })
      toast.error(errMsg(e))
    }
  }

  const ask = async () => {
    const result = await requestNotificationPermission()
    setPerm(result)
    if (result === 'granted') toast.success('Browser notifications enabled')
    else if (result === 'denied') toast.error('Notifications are blocked. Allow them in your browser’s site settings.')
  }

  const n = user.notifications
  return (
    <div className="space-y-6">
      <Card title="Message alerts" text="Control how Connectly gets your attention.">
        <Row title="Sound" text="Play a soft tone when a new message arrives.">
          <Toggle checked={n.sound} onChange={(v) => update('sound', v)} label="Sound" />
        </Row>
        <Row title="Browser notifications" text={perm === 'granted' ? 'Alerts appear when this tab is in the background.' : perm === 'denied' ? 'Blocked by your browser — allow notifications for this site to enable.' : perm === 'unsupported' ? 'Your browser does not support notifications.' : 'Allow your browser to show alerts for new messages.'}>
          {perm === 'granted' ? <Toggle checked={n.desktop} onChange={(v) => update('desktop', v)} label="Browser notifications" /> : perm === 'default' ? <Button size="sm" onClick={ask}>Enable</Button> : <Badge tone="gray">{perm === 'denied' ? 'Blocked' : 'Unavailable'}</Badge>}
        </Row>
        <Row title="Message previews" text="Show the message text in notifications. Turn off to only show “New message”.">
          <Toggle checked={n.preview} onChange={(v) => update('preview', v)} label="Previews" />
        </Row>
        <Row title="Group notifications" text="Get alerted for messages in group chats.">
          <Toggle checked={n.groups} onChange={(v) => update('groups', v)} label="Group notifications" />
        </Row>
      </Card>
      <p className="px-2 text-sm text-mute">Tip: you can also mute individual chats from the chat menu.</p>
    </div>
  )
}

function PrivacyTab() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const update = async (key, value) => {
    const prev = user.privacy
    setUser({ ...user, privacy: { ...prev, [key]: value } })
    try {
      const { data } = await api.put('/users/me/settings', { privacy: { [key]: value } })
      setUser(data.user)
    } catch (e) {
      setUser({ ...user, privacy: prev })
      toast.error(errMsg(e))
    }
  }
  const p = user.privacy
  return (
    <Card title="Privacy" text="Decide what other people can see about you.">
      <Row title="Show online status" text="Let others see when you're online. If off, you also won't see theirs.">
        <Toggle checked={p.showOnlineStatus} onChange={(v) => update('showOnlineStatus', v)} label="Online status" />
      </Row>
      <Row title="Show last seen" text="Let others see when you were last active.">
        <Toggle checked={p.showLastSeen} onChange={(v) => update('showLastSeen', v)} label="Last seen" />
      </Row>
      <Row title="Read receipts" text="Let people know you've read their messages (blue ticks).">
        <Toggle checked={p.readReceipts} onChange={(v) => update('readReceipts', v)} label="Read receipts" />
      </Row>
    </Card>
  )
}

function SecurityTab() {
  const { user, setUser, logout } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [delPass, setDelPass] = useState('')
  const [delBusy, setDelBusy] = useState(false)
  const [allAsk, setAllAsk] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    setErr('')
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return setErr('Use at least 8 characters with a letter and a number.')
    if (next !== confirm) return setErr("The new passwords don't match.")
    setBusy(true)
    try {
      await api.put('/users/me/password', { currentPassword: cur, newPassword: next })
      toast.success('Password updated. Other devices were signed out.')
      setOpen(false)
      setCur('')
      setNext('')
      setConfirm('')
      setUser({ ...user, hasPassword: true })
    } catch (e2) {
      setErr(errMsg(e2))
    } finally {
      setBusy(false)
    }
  }

  const deleteAccount = async () => {
    setDelBusy(true)
    try {
      await api.delete('/users/me', { data: { password: delPass } })
      toast.success('Your account was deleted.')
      setUser(null)
      nav('/', { replace: true })
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setDelBusy(false)
    }
  }

  const logoutAll = async () => {
    try {
      await api.post('/auth/logout-all')
    } catch (e) {
      toast.error(errMsg(e))
      return
    }
    setUser(null)
  }

  return (
    <div className="space-y-6">
      <Card title="Account security">
        <Row title="Password" text={!user.hasPassword ? 'You sign in with Google. Set a password to also log in with email.' : 'Change your password regularly and never reuse it elsewhere.'}>
          <Button variant="outline" size="sm" icon={KeyRound} onClick={() => setOpen(true)}>{user.hasPassword ? 'Change' : 'Set password'}</Button>
        </Row>
        <Row title="Sign out of all devices" text="Ends every active session, including this one.">
          <Button variant="outline" size="sm" icon={LogOut} onClick={() => setAllAsk(true)}>Sign out everywhere</Button>
        </Row>
        <Row title="Log out" text="Sign out of this browser only.">
          <Button variant="secondary" size="sm" onClick={logout}>Log out</Button>
        </Row>
      </Card>

      <Card title="Danger zone" text="Deleting your account removes your profile and direct chats permanently.">
        <Button variant="dangerSoft" icon={Trash2} onClick={() => setDelOpen(true)}>Delete my account</Button>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={user.hasPassword ? 'Change password' : 'Set a password'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={busy} onClick={changePassword}>Update password</Button>
          </>
        }
      >
        <form onSubmit={changePassword} className="space-y-4" noValidate>
          {err && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">{err}</p>}
          {user.hasPassword && <Input label="Current password" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />}
          <Input label="New password" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" hint="At least 8 characters with a letter and a number." />
          <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <Modal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        size="sm"
        title="Delete account?"
        subtitle="This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={delBusy} onClick={deleteAccount}>Delete forever</Button>
          </>
        }
      >
        <p className="mb-4 text-sm leading-relaxed text-mute">Your profile and one-to-one conversations will be deleted. You'll be removed from all groups.</p>
        {user.hasPassword ? <Input label="Confirm with your password" type="password" value={delPass} onChange={(e) => setDelPass(e.target.value)} autoComplete="current-password" /> : null}
      </Modal>

      <ConfirmModal open={allAsk} onClose={() => setAllAsk(false)} title="Sign out everywhere?" text="You'll be logged out on every device, including this one." confirmLabel="Sign out everywhere" danger onConfirm={logoutAll} />
    </div>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('profile')
  const nav = useNavigate()
  const body = { profile: <ProfileTab />, appearance: <AppearanceTab />, notifications: <NotificationsTab />, privacy: <PrivacyTab />, security: <SecurityTab /> }[tab]
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-6 flex items-end justify-between">
          <h1 className="text-5xl leading-none sm:text-6xl">Settings</h1>
          <button onClick={() => nav('/app')} className="text-sm font-semibold text-brand-600 hover:underline md:hidden">Back to chats</button>
        </div>
        <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
          <div className="scroll-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
            {TABS.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn('flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition', tab === id ? 'bg-brand-500/12 text-brand-600' : 'text-mute hover:bg-soft hover:text-ink')}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </button>
            ))}
          </div>
          <div key={tab} className="animate-slide-up min-w-0">{body}</div>
        </div>
      </div>
    </div>
  )
}
