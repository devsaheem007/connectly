import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Textarea } from '../ui/Input'
import Avatar from '../ui/Avatar'
import UserPicker from './UserPicker'
import { useChat } from '../../context/ChatContext'
import { useToast } from '../../context/ToastContext'
import { api, errMsg } from '../../lib/api'

export function EditGroupModal({ conv, open, onClose }) {
  const { updateGroup } = useChat()
  const toast = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName(conv.name)
      setDescription(conv.description || '')
      setAvatar(conv.avatar)
    }
  }, [open, conv])

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

  const save = async () => {
    if (name.trim().length < 2) return toast.error('Group name must be at least 2 characters.')
    setBusy(true)
    try {
      await updateGroup(conv._id, { name: name.trim(), description: description.trim(), avatar })
      toast.success('Group updated')
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit group"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={save}>Save changes</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2">
          <label className="group relative cursor-pointer" data-cursor="Change">
            <Avatar src={avatar} name={name || 'Group'} size="2xl" group />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
              <Camera className="h-6 w-6" />
            </span>
            {uploading && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-bold text-white">Uploading…</span>}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {avatar && (
            <button onClick={() => setAvatar(null)} className="text-xs font-semibold text-rose-500 hover:underline">
              Remove picture
            </button>
          )}
        </div>
        <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} className="min-h-20" />
      </div>
    </Modal>
  )
}

export function AddMembersModal({ conv, open, onClose }) {
  const { addMembers } = useChat()
  const toast = useToast()
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) setSelected([])
  }, [open])

  const toggle = (u) => setSelected((s) => (s.includes(u._id) ? s.filter((x) => x !== u._id) : [...s, u._id]))

  const add = async () => {
    setBusy(true)
    try {
      await addMembers(conv._id, selected)
      toast.success(`Added ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`)
      onClose()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add members"
      subtitle={`${selected.length} selected`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!selected.length} loading={busy} onClick={add}>Add to group</Button>
        </>
      }
    >
      <UserPicker selected={selected} onToggle={toggle} exclude={conv.members.map((m) => m.user._id)} height="h-64" />
    </Modal>
  )
}

export function ConfirmModal({ open, onClose, title, text, confirmLabel = 'Confirm', danger = false, onConfirm }) {
  const [busy, setBusy] = useState(false)
  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={run}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-[15px] leading-relaxed text-mute">{text}</p>
    </Modal>
  )
}

export function DeleteMessageModal({ message, mine, onClose, onDelete }) {
  const [busy, setBusy] = useState(false)
  const go = async (scope) => {
    setBusy(true)
    try {
      await onDelete(message, scope)
      onClose()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={Boolean(message)} onClose={onClose} size="sm" title="Delete message?" subtitle={mine && !message?.isDeleted ? 'Choose how to delete it' : 'It will be removed from your view only'}>
      <div className="flex flex-col gap-2">
        {mine && !message?.isDeleted && (
          <Button variant="danger" loading={busy} onClick={() => go('everyone')}>
            Delete for everyone
          </Button>
        )}
        <Button variant={mine && !message?.isDeleted ? 'dangerSoft' : 'danger'} loading={busy} onClick={() => go('me')}>
          Delete for me
        </Button>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  )
}
