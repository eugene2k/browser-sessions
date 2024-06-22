import { Browser } from "webextension-polyfill"
declare global {
    const browser: Browser;
}

browser.sessions.onChanged.addListener(async () => {
    let recentlyClosed = await browser.sessions.getRecentlyClosed({ maxResults: 1 })
    let session = recentlyClosed[0]
    if (session.window != undefined) {
        let tabs = session.window.tabs
        if (tabs != undefined && tabs.length > 1) {
            let storage = await browser.storage.local.get("folderId")
            let folderId = assert(storage.folderId)
            for (let i = 0; i < tabs.length; i++) {
                let tab = tabs[i]
                if (tab.url?.startsWith("http")) {
                    browser.bookmarks.create({ url: tab.url, title: tab.title, parentId: folderId, index: 0 })
                }
            }
        }
    }
})


browser.runtime.onInstalled.addListener(async (details) => {
    let store = await browser.storage.local.get("folderId")
    if (!store.folderId)
        await browser.storage.local.set({ "folderId": "unfiled_____" })
})

function assert<T>(expr: T | null | undefined): T {
    if (expr === null || expr === undefined) throw "expr is null"
    return expr
}