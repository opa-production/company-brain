// In-memory cache of the last data each page showed, so returning to a page
// is instant while a fresh copy loads. Cleared on sign-out so nothing from one
// account is ever shown to the next.
export const pageCache = new Map()
export const clearPageCache = () => pageCache.clear()
