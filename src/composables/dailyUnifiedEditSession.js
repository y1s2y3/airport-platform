// Store only a recovery token, never form inputs. IndexedDB remains the prototype's lease authority.
export function createDailyUnifiedEditSession(repo) {
  const browserLocks = globalThis.navigator?.locks
  let presenceToken = '', releasePresence = null
  const storageKey = key => 'airport-unified-edit-session-v1:' + key
  const presenceName = token => 'airport-unified-edit-live:' + token
  function read(key) { try { return JSON.parse(sessionStorage.getItem(storageKey(key)) || 'null') } catch { return null } }
  function remember(lock, resumable) { try { sessionStorage.setItem(storageKey(lock.key), JSON.stringify({ token: lock.token, ownerId: lock.owner.id, resumable })) } catch { /* Session recovery is unavailable when storage is disabled. */ } }
  function finish(lock) {
    if (!lock) return
    if (read(lock.key)?.token === lock.token) try { sessionStorage.removeItem(storageKey(lock.key)) } catch { /* Nothing persisted. */ }
    if (presenceToken === lock.token) { releasePresence?.(); releasePresence = null; presenceToken = '' }
  }
  async function markPresent(lock) {
    if (!browserLocks?.request || !browserLocks?.query) return false
    return new Promise(resolve => {
      browserLocks.request(presenceName(lock.token), { ifAvailable: true }, held => {
        if (!held) { resolve(false); return }
        const lifetime = new Promise(release => { releasePresence = release; presenceToken = lock.token })
        resolve(true)
        return lifetime
      }).catch(() => resolve(false))
    })
  }
  async function acquire(key, owner) {
    const previous = read(key)
    let resumeToken = ''
    // A copied tab must not take a live editor's token. A discarded/reloaded document releases its presence.
    if (previous?.resumable && previous.ownerId === owner.id && browserLocks?.query) {
      try { const snapshot = await browserLocks.query(); if (!snapshot.held.some(held => held.name === presenceName(previous.token))) resumeToken = previous.token } catch { /* Fall back to normal lease acquisition. */ }
    }
    const lock = await repo.acquire(key, owner, { resumeToken })
    const resumable = await markPresent(lock)
    remember(lock, resumable)
    return lock
  }
  async function release(lock) { await repo.release(lock); finish(lock) }
  return { acquire, release, finish }
}
