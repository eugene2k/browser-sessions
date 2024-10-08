import { Bookmarks } from "webextension-polyfill/namespaces/bookmarks";

document.addEventListener("DOMContentLoaded", async ev => {
    let bookmarksList = assert(document.getElementById("store")) as HTMLUListElement
    let folderId = await getFolderId()
    populateListWithBookmarksFromFolder(bookmarksList, folderId)
    let currentFolder = await getBookmark(folderId)
    let folderChooserBtn = assert(document.getElementById("folderChooserBtn"))
    setElementTextAndAttribute(folderChooserBtn, currentFolder.title, "folderId", folderId)
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
                    let folder = await getBookmark(newFolderId)
                    setElementTextAndAttribute(folderChooserBtn, folder.title, "folderId", newFolderId)
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
    setElementTextAndAttribute(li, bookmark.title, "parentId", bookmark.parentId!)
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
    setElementTextAndAttribute(li, bookmark.title, "folderId", bookmark.id)
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
    let title = bookmark.title ? bookmark.title : bookmark.url!
    setElementTextAndAttribute(li, title, "bookmarkId", bookmark.id)
    // if (faviconUrl) {
    //     let favicon = document.createElement("img")
    //     favicon.src = faviconUrl
    //     favicon.width = 16
    //     favicon.height = 16
    //     li.append(favicon)
    // }
    li.title = title
    li.onclick = async () => {
        let bookmarkId = li.getAttribute("bookmarkId");
        if (bookmarkId) {
            let bookmark = await getBookmark(bookmarkId)
            browser.tabs.create({ url: bookmark.url })
            browser.bookmarks.remove(bookmarkId)
        }
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
function setElementTextAndAttribute(element: HTMLElement, text: string, attr: string, val: string) {
    element.setAttribute(attr, val)
    element.textContent = text
}

browser.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
    let folderId = await getFolderId()
    let storeElement = document.getElementById("store") as HTMLUListElement
    if (folderId == id) {
        browser.storage.local.set({ "folderId": removeInfo.parentId })
        let folderChooserBtn = assert(document.getElementById("folderChooserBtn"))
        let folder = await getBookmark(removeInfo.parentId)
        setElementTextAndAttribute(folderChooserBtn, folder.title, "folderId", removeInfo.parentId)
        storeElement.replaceChildren()
        populateListWithBookmarksFromFolder(storeElement, removeInfo.parentId)
    } else if (folderId == removeInfo.parentId) {
        let child = storeElement?.firstChild as HTMLLIElement
        while (child) {
            if (child.getAttribute("bookmarkId") == id) {
                child.remove()
                break
            }
            child = child.nextSibling as HTMLLIElement
        }
    } else {
        let parentsList = document.getElementById("parentsList")
        let lastParent = parentsList?.lastChild as HTMLLIElement
        let childrenList = document.getElementById("childrenList") as HTMLUListElement
        // if the bookmark is a sibling find it in the childrenList and remove it
        if (lastParent.getAttribute("parentId") == removeInfo.parentId) {
            let child = childrenList?.firstChild as HTMLLIElement
            while (child) {
                if (child.getAttribute("folderId") == id) {
                    child.remove()
                    break
                }
            }
        } else {
            // check if the bookmark is a grandparent
            let parent = parentsList?.firstChild as HTMLLIElement
            let removeFlag = false
            while (parent) {
                if (parent.getAttribute("parentId") == id || removeFlag) {
                    let parentId = parent.previousElementSibling?.getAttribute("parentId")
                    childrenList.replaceChildren()
                    populateListWithFoldersFromFolder(childrenList, parentId!)
                    parent.remove()
                }
                parent = parent.nextSibling as HTMLLIElement
            }
        }
    }
})
browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
    let currentFolderId = await getFolderId()
    if (bookmark.parentId == currentFolderId) {
        let storeElement = document.getElementById("store") as HTMLUListElement
        let li = createStoreListItem(bookmark)
        storeElement.firstChild?.before(li)
    }
})

//FIXME: update folder view if a folder title is changed
browser.bookmarks.onChanged.addListener(async (id, changeInfo) => {
    let currentFolderId = await getFolderId()
    if (currentFolderId == id) {
        let folderChooserBtn = assert(document.getElementById("folderChooserBtn"))
        folderChooserBtn.textContent = changeInfo.title
    } else {
        let changedBookmark = await getBookmark(id)
        if (changedBookmark.parentId == currentFolderId) {
            let storeElement = document.getElementById("store") as HTMLUListElement
            let child = storeElement?.firstChild as HTMLLIElement
            while (child) {
                if (child.getAttribute("bookmarkId") == id) {
                    child.textContent = changeInfo.title
                    break
                }
                child = child.nextSibling as HTMLLIElement
            }
        }
    }
})

//FIXME: update folder view if a folder is moved into or out of the currently viewed folder
browser.bookmarks.onMoved.addListener(async (id, moveInfo) => {
    if (moveInfo.oldParentId != moveInfo.parentId) {
        let currentFolderId = await getFolderId()
        let storeElement = document.getElementById("store") as HTMLUListElement
        if (moveInfo.oldParentId == currentFolderId) {
            let child = storeElement?.firstChild as HTMLLIElement
            while (child) {
                if (child.getAttribute("bookmarkId") == id) {
                    child.remove()
                    break
                }
                child = child.nextSibling as HTMLLIElement
            }
        } else if (moveInfo.parentId == currentFolderId) {
            let bookmark = await getBookmark(id)
            let li = createStoreListItem(bookmark)
            storeElement.firstChild?.before(li) //FIXME: add the moved bookmark according to its index
        }
    }
})