import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Users } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Textarea } from '../ui/Input'
import Avatar from '../ui/Avatar'
import UserPicker from './UserPicker'
import { useChat } from '../../context/ChatContext'
import { useToast } from '../../context/ToastContext'
import { api, errMsg } from '../../lib/api'

export function NewChatModal({ open, onClose, onGroup }) {
  const { startDirect } = useChat()
  const toast = useToast()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)

  const pick = async (u) => {
    if (busy) return
    setBusy(true)
    try {
      const conv = await startDirect(u._id)
      onClose()
      nav(`/app/c/${conv._id}`)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New conversation" subtitle="Choose someone to message">
      <button onClick={onGroup} className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-500/5 px-3 py-3 text-left transition hover:bg-brand-500/10">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-gradient text-white">
          <Users className="h-5 w-5" />
        </span>
        <span>
          <span className="font-display block text-xl leading-tight">New group</span>
          <span className="text-xs text-mute">Chat with several people at once</span>
        </span>
      </button>
      <UserPicker onPick={pick} />
    </Modal>
  )
}

export function NewGroupModal({ open, onClose }) {
  const { createGroup } = useChat()
  const toast = useToast()
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState([])
  const [picked, setPicked] = useState({})
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setStep(1)
    setSelected([])
    setPicked({})
    setName('')
    setDescription('')
    setAvatar(null)
  }
  const close = () => {
    reset()
    onClose()
  }

  const toggle = (u) => {
    setPicked((p) => ({ ...p, [u._id]: u }))
    setSelected((s) => (s.includes(u._id) ? s.filter((x) => x !== u._id) : [...s, u._id]))
  }

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const { data } = await api.post('/upload/image', fd)
      setAvatar(data.url)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setUploading(false)
    }
  }

  const create = async () => {
    if (name.trim().length < 2) return toast.error('Give your group a name (at least 2 characters).')
    setBusy(true)
    try {
      const conv = await createGroup({ name: name.trim(), description: description.trim(), memberIds: selected, avatar })
      toast.success(`“${conv.name}” created`)
      close()
      nav(`/app/c/${conv._id}`)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={step === 1 ? 'Add group members' : 'Group details'}
      subtitle={step === 1 ? `${selected.length} selected` : 'Name your group and add a picture'}
      footer={
        step === 1 ? (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button disabled={!selected.length} onClick={() => setStep(2)}>Next</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button loading={busy} onClick={create}>Create group</Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <>
          {selected.length > 0 && (
            <div className="scroll-hide mb-3 flex gap-2 overflow-x-auto pb-1">
              {selected.map((id) => (
                <button key={id} onClick={() => toggle(picked[id])} className="flex shrink-0 items-center gap-2 rounded-full bg-brand-500/10 py-1 pl-1 pr-3 text-sm font-medium">
                  <Avatar src={picked[id]?.avatar} name={picked[id]?.name} size="xs" />
                  {picked[id]?.name.split(' ')[0]} ✕
                </button>
              ))}
            </div>
          )}
          <UserPicker selected={selected} onToggle={toggle} height="h-64" />
        </>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-center">
            <label className="group relative cursor-pointer" data-cursor="Upload">
              <Avatar src={avatar} name={name || 'Group'} size="2xl" group />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                <Camera className="h-6 w-6" />
              </span>
              {uploading && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-bold text-white">Uploading…</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
          </div>
          <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Weekend plans ✨" autoFocus />
          <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="What is this group about?" className="min-h-20" />
        </div>
      )}
    </Modal>
  )
}
