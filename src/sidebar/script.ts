import { Bookmarks } from "webextension-polyfill/namespaces/bookmarks";

document.addEventListener("DOMContentLoaded", async ev => {
    let bookmarksList = assert(document.getElementById("store")) as HTMLUListElement
    let folderId = await getFolderId()
    populateListWithBookmarksFromFolder(bookmarksList, folderId)
    let currentFolder = await getBookmark(folderId)
    let folderChooserBtn = assert(document.getElementById("folderChooserBtn"))
    folderChooserBtn.append(currentFolder.title)
    folderChooserBtn.setAttribute("folderId", folderId)
    folderChooserBtn.onclick = async (ev) => {
        let self = ev.target as HTMLDivElement
        let childrenList = assert(document.getElementById("childrenList"))
        let item = childrenList.firstChild as HTMLLIElement
        while (item) {
            if (item.getAttribute("folderId") == self.getAttribute("folderId")) {
                item.setAttribute("selected", "")
                break
            }
            item = item.nextSibling as HTMLLIElement
        }
        assert(document.getElementById("folderChooser")).removeAttribute("hidden")
        assert(document.getElementById("defaultView")).setAttribute("hidden", "")
    }
    let setFolderBtn = assert(document.getElementById("setFolder"))
    setFolderBtn.onclick = async () => {
        let oldFolderId = assert(folderChooserBtn.getAttribute("folderId"))
        // TODO: iterate through the childrenList to find the selected child and get its folderId attribute
        let store = assert(document.getElementById("store")) as HTMLUListElement
        let childrenList = assert(document.getElementById("childrenList"))
        let item = childrenList.firstChild as HTMLLIElement
        while (item) {
            if (item.hasAttribute("selected")) {
                let newFolderId = assert(item.getAttribute("folderId"))
                if (newFolderId != oldFolderId) {
                    browser.storage.local.set({ "folderId": item.getAttribute("folderId") })
                    folderChooserBtn.setAttribute("folderId", newFolderId)
                    folderChooserBtn.replaceChildren()
                    let folder = await getBookmark(newFolderId)
                    folderChooserBtn.append(folder.title)
                    store.replaceChildren()
                    populateListWithBookmarksFromFolder(store, newFolderId)
                }
                let folderChooser = assert(document.getElementById("folderChooser"))
                let defaultView = assert(document.getElementById("defaultView"))
                folderChooser.setAttribute("hidden", "")
                defaultView.removeAttribute("hidden")
                break
            }
            item = item.nextSibling as HTMLLIElement
        }
    }
    let saveOneBtn = assert(document.getElementById("storeCurrent"))
    saveOneBtn.onclick = async () => {
        let folderId = await getFolderId()
        let currentWin = await browser.windows.getLastFocused({ populate: true })
        let currentTab = currentWin.tabs?.find((tab) => tab.active)
        if (currentTab && currentTab.url && currentTab.url.startsWith("http")) {
            let bookmark = await browser.bookmarks.create({ url: currentTab.url, title: currentTab.title, parentId: folderId, index: 0 })
            bookmarksList?.append(createStoreListItem(bookmark))
            if (currentTab.id)
                browser.tabs.remove(currentTab.id)
        }
    }
    let saveDiscardedBtn = assert(document.getElementById("storeDiscarded"))
    saveDiscardedBtn.onclick = async () => {
        let currentWin = await browser.windows.getLastFocused({ populate: true })
        if (currentWin.tabs) {
            let folderId = await getFolderId()
            for (let tab of currentWin.tabs) {
                if (tab.url && tab.url.startsWith("http") && tab.discarded) {
                    let bookmark = await browser.bookmarks.create({ url: tab.url, title: tab.title, parentId: folderId, index: 0 })
                    bookmarksList?.append(createStoreListItem(bookmark))
                    if (tab.id)
                        browser.tabs.remove(tab.id)
                }
            }
        }
    }
    let childrenList = assert(document.getElementById("childrenList")) as HTMLUListElement
    populateListWithFoldersFromFolder(childrenList, currentFolder.parentId!)

    let parentsList = await getParentsList(currentFolder)
    let parentsListElement = assert(document.getElementById("parentsList")) as HTMLUListElement
    for (let element of parentsList) {
        let li = await createParentsListItem(element)
        parentsListElement.append(li)
    }
})

async function createParentsListItem(bookmark: Bookmarks.BookmarkTreeNode): Promise<HTMLLIElement> {
    let li = document.createElement("li")
    li.append(bookmark.title)
    li.setAttribute("parentId", bookmark.parentId!)
    li.onclick = async () => {
        let childrenList = assert(document.getElementById("childrenList")) as HTMLUListElement
        let parentId = assert(li.getAttribute("parentId"))
        childrenList.replaceChildren()
        populateListWithFoldersFromFolder(childrenList, parentId)
        while (li.nextSibling) li.nextSibling.remove()
        li.remove()
    }
    return li
}

async function getParentsList(bookmark: Bookmarks.BookmarkTreeNode): Promise<Bookmarks.BookmarkTreeNode[]> {
    let parent_bookmark = await getBookmark(bookmark.parentId!)
    if (parent_bookmark.parentId) {
        let list = await getParentsList(parent_bookmark)
        list.push(parent_bookmark)
        return list
    }
    return []
}

async function populateListWithFoldersFromFolder(list: HTMLUListElement, folderId: string) {
    let children = await browser.bookmarks.getChildren(folderId)
    for (let bookmark of children) {
        if (bookmark.type == "folder") {
            let li = await createFolderListItem(bookmark)
            list.append(li)
        }
    }
}


async function populateListWithBookmarksFromFolder(list: HTMLUListElement, folderId: string) {
    let children = await browser.bookmarks.getChildren(folderId)
    for (let bookmark of children) {
        if (bookmark.url) {
            let li = createStoreListItem(bookmark)
            list.append(li)
        }
    }
}

async function createFolderListItem(bookmark: Bookmarks.BookmarkTreeNode): Promise<HTMLLIElement> {
    let li = document.createElement("li") as HTMLLIElement
    li.append(bookmark.title)
    li.setAttribute("folderId", bookmark.id)
    li.onclick = async (ev) => {
        // check if this function should trigger or if the event is meant for a child element
        if (ev.target != ev.currentTarget) return
        let element = li.parentElement!.firstChild as HTMLLIElement
        while (element) {
            if (element.hasAttribute("selected")) {
                element.removeAttribute("selected")
                break
            }
            element = element.nextSibling as HTMLLIElement
        }
        li.setAttribute("selected", "")
    }
    bookmark.children = await browser.bookmarks.getChildren(bookmark.id)
    let subFolders = bookmark.children!.filter((val) => val.type == "folder")
    if (subFolders.length > 0) {
        let enterBtn = document.createElement("div") as HTMLDivElement
        enterBtn.className = "enterBtn"
        enterBtn.onclick = async () => {
            let parentsList = document.getElementById("parentsList") as HTMLUListElement
            let li = await createParentsListItem(bookmark)
            parentsList.append(li)
            let childrenList = enterBtn.parentElement!.parentElement!
            childrenList.replaceChildren()
            for (let subFolder of subFolders) {
                childrenList.append(await createFolderListItem(subFolder))
            }
        }
        li.append(enterBtn)
    }
    return li
}

function createStoreListItem(bookmark: Bookmarks.BookmarkTreeNode): HTMLLIElement {
    let li = document.createElement("li")
    li.setAttribute("bookmarkId", bookmark.id)
    // if (faviconUrl) {
    //     let favicon = document.createElement("img")
    //     favicon.src = faviconUrl
    //     favicon.width = 16
    //     favicon.height = 16
    //     li.append(favicon)
    // }
    let title = bookmark.title ? bookmark.title : bookmark.url!
    li.append(title)
    li.title = title
    li.onclick = async () => {
        let bookmarkId = li.getAttribute("bookmarkId");
        if (bookmarkId) {
            let bookmark = await getBookmark(bookmarkId)
            browser.tabs.create({ url: bookmark.url })
            browser.bookmarks.remove(bookmarkId)
        }
        li.remove()
    }
    return li
}

async function getFolderId(): Promise<string> {
    let store = await browser.storage.local.get("folderId")
    return assert(store.folderId)
}
async function getBookmark(id: string): Promise<Bookmarks.BookmarkTreeNode> {
    return (await browser.bookmarks.get(id))[0]
}
function assert<T>(expr: T | null | undefined): T {
    if (expr === null || expr === undefined) throw "Assert failed: null or undefined value!"
    return expr
}

browser.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
    if (await getFolderId() == id) {
        browser.storage.local.set({ "folderId": "unfiled_____" })
    }
    // TODO: if the sidebar has defaultView currently, then 
    // 1. check if id is any of the bookmarks in the #store and delete the appropriate list element if so
    // 2. check if id matches current folderId and update the local storage as well as the folderChooserBtn and subsequently the list of bookmarks if so
    // otherwise check if id is any of matches any folderId attributes in parentsList and delete the appropriate list elements if so
})

//TODO: add a listener for onChanged to update the list of parents if any of the parent folders have changed parents or their names and to update the list of bookmarks if a bookmark has changed parents or a url/title