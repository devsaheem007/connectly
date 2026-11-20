// Shared Socket.IO state so controllers can emit events without circular imports.
let ioInstance = null

/** userId -> Set of socket ids (a user can be connected from several tabs/devices) */
export const online = new Map()

export const setIO = (io) => {
  ioInstance = io
}
export const getIO = () => ioInstance

export const isOnline = (userId) => online.has(String(userId))
export const onlineIds = () => [...online.keys()]

export function emitToUser(userId, event, payload) {
  ioInstance?.to(`user:${userId}`).emit(event, payload)
}

export function emitToUsers(userIds, event, payload) {
  for (const id of userIds) emitToUser(String(id), event, payload)
}

export function disconnectUser(userId) {
  ioInstance?.in(`user:${userId}`).disconnectSockets(true)
}
