import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { api, API_URL, errMsg } from '../lib/api'
import { playMessageSound } from '../lib/sound'
import { convTitle, previewOf } from '../lib/utils'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const ChatContext = createContext(null)
export const useChat = () => useContext(ChatContext)

const byActivity = (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
const withoutTemp = (items) => items.filter((m) => !String(m._id).startsWith('tmp-'))

export function ChatProvider({ children }) {
  const { user, setUser, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [convLoading, setConvLoading] = useState(true)
  const [msgs, setMsgs] = useState({})
  const [onlineIds, setOnlineIds] = useState(() => new Set())
  const [lastSeen, setLastSeen] = useState({})
  const [typing, setTyping] = useState({})
  const [connected, setConnected] = useState(false)
  const [activeId, setActiveId] = useState(null)

  const socketRef = useRef(null)
  const convsRef = useRef([])
  const userRef = useRef(user)
  const activeRef = useRef(null)
  const msgsRef = useRef({})
  const typingTimers = useRef({})
  const firstConnect = useRef(true)

  useEffect(() => void (convsRef.current = conversations), [conversations])
  useEffect(() => void (userRef.current = user), [user])
  useEffect(() => void (activeRef.current = activeId), [activeId])
  useEffect(() => void (msgsRef.current = msgs), [msgs])

  // ───────── helpers ─────────
  const upsertConversation = useCallback((conv, { keepUnread = false } = {}) => {
    setConversations((list) => {
      const existing = list.find((c) => c._id === conv._id)
      const merged = existing && keepUnread ? { ...conv, unread: existing.unread } : conv
      const next = existing ? list.map((c) => (c._id === conv._id ? merged : c)) : [merged, ...list]
      return next.sort(byActivity)
    })
  }, [])

  const patchConversation = useCallback((id, patch) => {
    setConversations((list) => list.map((c) => (c._id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)))
  }, [])

  const patchMsgs = useCallback((convId, fn) => {
    setMsgs((prev) => {
      const cur = prev[convId]
      if (!cur) return prev
      const next = fn(cur)
      return next === cur ? prev : { ...prev, [convId]: next }
    })
  }, [])

  // ───────── loading ─────────
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations')
      setConversations(data.conversations.sort(byActivity))
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setConvLoading(false)
    }
  }, [toast])

  const loadMessages = useCallback(async (convId, { around } = {}) => {
    setMsgs((p) => ({ ...p, [convId]: { items: p[convId]?.items || [], hasMore: false, ...(p[convId] || {}), status: 'loading', error: null } }))
    try {
      const { data } = await api.get(`/conversations/${convId}/messages`, { params: around ? { around } : { limit: 30 } })
      setMsgs((p) => ({
        ...p,
        [convId]: { items: data.messages, hasMore: data.hasMore, detached: Boolean(data.detached), status: 'ready', focusId: around || null, focusNonce: Date.now(), error: null },
      }))
    } catch (e) {
      setMsgs((p) => ({ ...p, [convId]: { items: p[convId]?.items || [], hasMore: false, status: 'error', error: errMsg(e) } }))
    }
  }, [])

  const loadOlder = useCallback(async (convId) => {
    const cur = msgsRef.current[convId]
    if (!cur || cur.loadingOlder || !cur.hasMore) return
    const first = withoutTemp(cur.items)[0]
    if (!first) return
    patchMsgs(convId, (c) => ({ ...c, loadingOlder: true }))
    try {
      const { data } = await api.get(`/conversations/${convId}/messages`, { params: { before: first._id, limit: 30 } })
      patchMsgs(convId, (c) => {
        const have = new Set(c.items.map((m) => m._id))
        return { ...c, items: [...data.messages.filter((m) => !have.has(m._id)), ...c.items], hasMore: data.hasMore, loadingOlder: false, prepended: Date.now() }
      })
    } catch (e) {
      patchMsgs(convId, (c) => ({ ...c, loadingOlder: false }))
      toast.error(errMsg(e))
    }
  }, [patchMsgs, toast])

  const markRead = useCallback(
    async (convId) => {
      const conv = convsRef.current.find((c) => c._id === convId)
      if (!conv || !conv.unread) return
      patchConversation(convId, { unread: 0 })
      try {
        await api.post(`/conversations/${convId}/read`)
      } catch {
        /* will retry on next open */
      }
    },
    [patchConversation]
  )

  const openConversation = useCallback(
    async (convId) => {
      const cur = msgsRef.current[convId]
      if (!cur || cur.status === 'error' || cur.detached) await loadMessages(convId)
      markRead(convId)
    },
    [loadMessages, markRead]
  )

  const jumpToMessage = useCallback(
    async (convId, messageId) => {
      const cur = msgsRef.current[convId]
      if (cur?.items.some((m) => m._id === messageId)) {
        patchMsgs(convId, (c) => ({ ...c, focusId: messageId, focusNonce: Date.now() }))
      } else {
        await loadMessages(convId, { around: messageId })
      }
    },
    [loadMessages, patchMsgs]
  )

  const jumpToLatest = useCallback((convId) => loadMessages(convId), [loadMessages])

  // ───────── notifications ─────────
  const notify = useCallback(
    (msg, conv) => {
      const me = userRef.current
      const s = me?.notifications || {}
      if (conv.muted) return
      if (conv.isGroup && s.groups === false) return
      const title = convTitle(conv, me._id)
      const body = s.preview === false ? 'New message' : previewOf(msg, me._id, { withSender: conv.isGroup })
      if (s.sound !== false) playMessageSound()
      const open = () => {
        window.focus()
        navigate(`/app/c/${conv._id}`)
      }
      if (document.visibilityState === 'hidden') {
        if (s.desktop !== false && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(title, { body, icon: '/favicon.svg', tag: conv._id })
            n.onclick = () => {
              open()
              n.close()
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        toast.message(body, { title, onClick: open })
      }
    },
    [navigate, toast]
  )

  // ───────── socket events ─────────
  const handleNewMessage = useCallback(
    async (msg) => {
      const me = userRef.current
      const mine = String(msg.sender?._id) === String(me._id)
      const convId = String(msg.conversation)
      let conv = convsRef.current.find((c) => c._id === convId)

      if (!conv) {
        try {
          const { data } = await api.get(`/conversations/${convId}`)
          conv = data.conversation
          upsertConversation(conv)
        } catch {
          return
        }
      }

      patchMsgs(convId, (c) => {
        if (c.detached || c.items.some((m) => m._id === msg._id)) return c
        return { ...c, items: [...c.items, msg] }
      })

      const looking = activeRef.current === convId && document.visibilityState === 'visible'
      const countsAsUnread = !mine && msg.type !== 'system'
      patchConversation(convId, (c) => ({
        lastMessage: msg,
        lastActivity: msg.createdAt,
        archived: false,
        unread: countsAsUnread && !looking ? (c.unread || 0) + 1 : looking ? 0 : c.unread,
      }))
      setConversations((l) => [...l].sort(byActivity))

      if (looking && countsAsUnread) {
        api.post(`/conversations/${convId}/read`).catch(() => {})
      } else if (countsAsUnread) {
        notify(msg, conv)
      }
    },
    [notify, patchConversation, patchMsgs, upsertConversation]
  )

  useEffect(() => {
    if (!user) return undefined

    const socket = io(API_URL || undefined, { withCredentials: true, transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      if (!firstConnect.current) {
        // we were offline for a while → catch up
        loadConversations()
        const id = activeRef.current
        if (id && msgsRef.current[id]) loadMessages(id)
      }
      firstConnect.current = false
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        // session gone (logged out elsewhere, suspended, password reset…)
        socket.disconnect()
        window.dispatchEvent(new Event('connectly:unauthorized'))
      }
    })

    socket.on('presence:list', ({ online }) => setOnlineIds(new Set(online)))
    socket.on('presence', ({ userId, online, lastSeen: seen }) => {
      setOnlineIds((s) => {
        const n = new Set(s)
        if (online) n.add(userId)
        else n.delete(userId)
        return n
      })
      if (!online && seen) setLastSeen((l) => ({ ...l, [userId]: seen }))
    })

    socket.on('message:new', handleNewMessage)

    socket.on('message:updated', (msg) => {
      const convId = String(msg.conversation)
      patchMsgs(convId, (c) => ({ ...c, items: c.items.map((m) => (m._id === msg._id ? { ...m, ...msg, _status: undefined } : m)) }))
      patchConversation(convId, (c) => (c.lastMessage?._id === msg._id ? { lastMessage: msg } : {}))
    })

    socket.on('message:status', ({ conversationId, messageIds, userId }) => {
      const ids = new Set(messageIds)
      patchMsgs(conversationId, (c) => ({
        ...c,
        items: c.items.map((m) => (ids.has(m._id) && !m.deliveredTo.includes(userId) ? { ...m, deliveredTo: [...m.deliveredTo, userId] } : m)),
      }))
    })

    socket.on('messages:read', ({ conversationId, userId }) => {
      const meId = String(userRef.current._id)
      patchMsgs(conversationId, (c) => ({
        ...c,
        items: c.items.map((m) =>
          String(m.sender?._id) === meId && !m.seenBy.includes(userId)
            ? { ...m, seenBy: [...m.seenBy, userId], deliveredTo: m.deliveredTo.includes(userId) ? m.deliveredTo : [...m.deliveredTo, userId] }
            : m
        ),
      }))
      patchConversation(conversationId, (c) => {
        const lm = c.lastMessage
        if (lm && String(lm.sender?._id) === meId && !lm.seenBy.includes(userId)) return { lastMessage: { ...lm, seenBy: [...lm.seenBy, userId] } }
        return {}
      })
    })

    socket.on('typing', ({ conversationId, userId, isTyping }) => {
      const key = `${conversationId}:${userId}`
      clearTimeout(typingTimers.current[key])
      setTyping((t) => {
        const cur = { ...(t[conversationId] || {}) }
        if (isTyping) cur[userId] = true
        else delete cur[userId]
        return { ...t, [conversationId]: cur }
      })
      if (isTyping) {
        typingTimers.current[key] = setTimeout(() => {
          setTyping((t) => {
            const cur = { ...(t[conversationId] || {}) }
            delete cur[userId]
            return { ...t, [conversationId]: cur }
          })
        }, 5000)
      }
    })

    socket.on('conversation:new', (conv) => upsertConversation(conv))
    socket.on('conversation:updated', (conv) => upsertConversation(conv, { keepUnread: true }))
    socket.on('conversation:removed', ({ conversationId }) => {
      setConversations((l) => l.filter((c) => c._id !== conversationId))
      setMsgs((p) => {
        const { [conversationId]: _gone, ...rest } = p
        return rest
      })
      if (activeRef.current === conversationId) {
        toast.info('That conversation is no longer available to you.')
        navigate('/app', { replace: true })
      }
    })

    socket.on('user:updated', (u) => {
      const swap = (x) => (x && String(x._id) === String(u._id) ? { ...x, ...u } : x)
      setConversations((list) =>
        list.map((c) => ({
          ...c,
          members: c.members.map((m) => ({ ...m, user: swap(m.user) })),
          lastMessage: c.lastMessage ? { ...c.lastMessage, sender: swap(c.lastMessage.sender) } : c.lastMessage,
        }))
      )
      setMsgs((p) => {
        const out = {}
        for (const [k, v] of Object.entries(p)) out[k] = { ...v, items: v.items.map((m) => (String(m.sender?._id) === String(u._id) ? { ...m, sender: swap(m.sender) } : m)) }
        return out
      })
    })

    socket.on('account:suspended', ({ reason }) => {
      toast.error(reason || 'Your session was ended by an administrator.', { title: 'Signed out', duration: 8000 })
      logout()
    })

    loadConversations()

    const timers = typingTimers.current
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      firstConnect.current = true
      Object.values(timers).forEach(clearTimeout)
      setConnected(false)
      setConversations([])
      setMsgs({})
      setConvLoading(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id])

  // reflect profile edits made elsewhere / by this user
  useEffect(() => {
    if (!user) return
    setConversations((list) =>
      list.map((c) => ({
        ...c,
        members: c.members.map((m) => (String(m.user?._id) === String(user._id) ? { ...m, user: { ...m.user, name: user.name, username: user.username, avatar: user.avatar, bio: user.bio, statusMessage: user.statusMessage } } : m)),
      }))
    )
  }, [user?.name, user?.username, user?.avatar, user?.bio, user?.statusMessage]) // eslint-disable-line

  // when the tab becomes visible again, clear unread for the open chat
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && activeRef.current) markRead(activeRef.current)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [markRead])

  const totalUnread = useMemo(() => conversations.reduce((n, c) => n + (c.archived || c.muted ? 0 : c.unread || 0), 0), [conversations])
  useEffect(() => {
    document.title = totalUnread ? `(${totalUnread > 99 ? '99+' : totalUnread}) Connectly` : 'Connectly'
    return () => void (document.title = 'Connectly')
  }, [totalUnread])

  // ───────── actions ─────────
  const sendTyping = useCallback((conversationId, isTyping) => socketRef.current?.emit('typing', { conversationId, isTyping }), [])

  const dispatchSend = useCallback(
    async (tempId, convId, payload) => {
      try {
        const { data } = await api.post(`/conversations/${convId}/messages`, payload)
        const real = data.message
        patchMsgs(convId, (c) => {
          const items = c.items.filter((m) => m._id !== tempId)
          return { ...c, items: items.some((m) => m._id === real._id) ? items : c.detached ? items : [...items, real] }
        })
        patchConversation(convId, { lastMessage: real, lastActivity: real.createdAt, archived: false })
        setConversations((l) => [...l].sort(byActivity))
      } catch (e) {
        patchMsgs(convId, (c) => ({ ...c, items: c.items.map((m) => (m._id === tempId ? { ...m, _status: 'failed', _error: errMsg(e) } : m)) }))
      }
    },
    [patchConversation, patchMsgs]
  )

  const sendMessage = useCallback(
    async (convId, { text = '', attachments = [], replyTo = null }) => {
      const me = userRef.current
      if (msgsRef.current[convId]?.detached) await loadMessages(convId)
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const kinds = new Set(attachments.map((a) => a.kind))
      const temp = {
        _id: tempId,
        conversation: convId,
        sender: { _id: me._id, name: me.name, username: me.username, avatar: me.avatar },
        type: !attachments.length ? 'text' : kinds.size === 1 ? [...kinds][0] : 'file',
        text,
        attachments,
        replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, type: replyTo.type, isDeleted: replyTo.isDeleted, attachment: replyTo.attachments?.[0] || null, sender: replyTo.sender } : null,
        reactions: [],
        deliveredTo: [],
        seenBy: [],
        createdAt: new Date().toISOString(),
        _status: 'sending',
        _payload: { text, attachments, replyTo: replyTo?._id || undefined },
      }
      patchMsgs(convId, (c) => ({ ...c, items: [...c.items, temp] }))
      await dispatchSend(tempId, convId, temp._payload)
    },
    [dispatchSend, loadMessages, patchMsgs]
  )

  const retryMessage = useCallback(
    async (convId, tempId) => {
      const m = msgsRef.current[convId]?.items.find((x) => x._id === tempId)
      if (!m?._payload) return
      patchMsgs(convId, (c) => ({ ...c, items: c.items.map((x) => (x._id === tempId ? { ...x, _status: 'sending', _error: undefined } : x)) }))
      await dispatchSend(tempId, convId, m._payload)
    },
    [dispatchSend, patchMsgs]
  )

  const discardMessage = useCallback((convId, tempId) => patchMsgs(convId, (c) => ({ ...c, items: c.items.filter((m) => m._id !== tempId) })), [patchMsgs])

  const applyMessage = useCallback(
    (msg) => {
      const convId = String(msg.conversation)
      patchMsgs(convId, (c) => ({ ...c, items: c.items.map((m) => (m._id === msg._id ? { ...m, ...msg } : m)) }))
      patchConversation(convId, (c) => (c.lastMessage?._id === msg._id ? { lastMessage: msg } : {}))
    },
    [patchConversation, patchMsgs]
  )

  const editMessage = useCallback(async (id, text) => applyMessage((await api.put(`/messages/${id}`, { text })).data.message), [applyMessage])
  const reactToMessage = useCallback(async (id, emoji) => applyMessage((await api.post(`/messages/${id}/react`, { emoji })).data.message), [applyMessage])

  const deleteMessage = useCallback(
    async (convId, id, scope) => {
      const { data } = await api.delete(`/messages/${id}`, { params: { scope } })
      if (scope === 'everyone' && data.message) applyMessage(data.message)
      else {
        patchMsgs(convId, (c) => ({ ...c, items: c.items.filter((m) => m._id !== id) }))
        // if it was the preview line, fall back to the previous message
        const items = msgsRef.current[convId]?.items.filter((m) => m._id !== id)
        patchConversation(convId, (c) => (c.lastMessage?._id === id ? { lastMessage: items?.[items.length - 1] || null } : {}))
      }
    },
    [applyMessage, patchConversation, patchMsgs]
  )

  const forwardMessage = useCallback(async (id, conversationIds) => (await api.post(`/messages/${id}/forward`, { conversationIds })).data.messages, [])

  const setPreference = useCallback(
    async (convId, prefs) => {
      const { data } = await api.put(`/conversations/${convId}/preferences`, prefs)
      upsertConversation(data.conversation)
    },
    [upsertConversation]
  )

  const clearChat = useCallback(
    async (convId) => {
      await api.post(`/conversations/${convId}/clear`)
      patchMsgs(convId, (c) => ({ ...c, items: [], hasMore: false }))
      patchConversation(convId, { lastMessage: null, unread: 0 })
    },
    [patchConversation, patchMsgs]
  )

  const startDirect = useCallback(
    async (userId) => {
      const { data } = await api.post('/conversations/direct', { userId })
      upsertConversation(data.conversation, { keepUnread: true })
      return data.conversation
    },
    [upsertConversation]
  )

  const createGroup = useCallback(
    async (payload) => {
      const { data } = await api.post('/conversations/group', payload)
      upsertConversation(data.conversation)
      return data.conversation
    },
    [upsertConversation]
  )

  const groupAction = useCallback(
    async (fn) => {
      const { data } = await fn()
      if (data.conversation) upsertConversation(data.conversation, { keepUnread: true })
      return data
    },
    [upsertConversation]
  )

  const updateGroup = useCallback((id, body) => groupAction(() => api.put(`/conversations/${id}`, body)), [groupAction])
  const addMembers = useCallback((id, userIds) => groupAction(() => api.post(`/conversations/${id}/members`, { userIds })), [groupAction])
  const removeMember = useCallback((id, userId) => groupAction(() => api.delete(`/conversations/${id}/members/${userId}`)), [groupAction])
  const toggleAdmin = useCallback((id, userId) => groupAction(() => api.put(`/conversations/${id}/admins/${userId}`)), [groupAction])

  const dropConversation = useCallback((id) => {
    setConversations((l) => l.filter((c) => c._id !== id))
    setMsgs((p) => {
      const { [id]: _gone, ...rest } = p
      return rest
    })
  }, [])
  const leaveGroup = useCallback(
    async (id) => {
      await api.post(`/conversations/${id}/leave`)
      dropConversation(id)
    },
    [dropConversation]
  )
  const deleteGroup = useCallback(
    async (id) => {
      await api.delete(`/conversations/${id}`)
      dropConversation(id)
    },
    [dropConversation]
  )

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'granted') return 'granted'
    return Notification.requestPermission()
  }, [])

  const isOnline = useCallback((userId) => onlineIds.has(String(userId)), [onlineIds])
  const lastSeenOf = useCallback((u) => lastSeen[String(u?._id)] || u?.lastSeen || null, [lastSeen])

  const value = useMemo(
    () => ({
      conversations, convLoading, msgs, connected, totalUnread, activeId, setActiveId, typing,
      isOnline, lastSeenOf, loadConversations, loadMessages, loadOlder, openConversation, jumpToMessage, jumpToLatest, markRead,
      sendMessage, retryMessage, discardMessage, editMessage, reactToMessage, deleteMessage, forwardMessage,
      setPreference, clearChat, startDirect, createGroup, updateGroup, addMembers, removeMember, toggleAdmin, leaveGroup, deleteGroup,
      sendTyping, requestNotificationPermission, setUser,
    }),
    [
      conversations, convLoading, msgs, connected, totalUnread, activeId, typing, isOnline, lastSeenOf, loadConversations, loadMessages, loadOlder,
      openConversation, jumpToMessage, jumpToLatest, markRead, sendMessage, retryMessage, discardMessage, editMessage, reactToMessage, deleteMessage,
      forwardMessage, setPreference, clearChat, startDirect, createGroup, updateGroup, addMembers, removeMember, toggleAdmin, leaveGroup, deleteGroup,
      sendTyping, requestNotificationPermission, setUser,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
