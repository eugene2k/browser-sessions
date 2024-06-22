document.addEventListener("DOMContentLoaded", async () => {
    let themeElementIds = ["sidebar_bg_color",
        "toolbar_bg_color",
        "toolbar_btn_color",
        "toolbar_btn_hover_color",
        "toolbar_item_color",
        "toolbar_item_hover_color"]
    let stored_colors = await browser.storage.local.get(themeElementIds)
    for (let elementId of themeElementIds) {
        let element = (document.getElementById(elementId) as HTMLInputElement)
        element.value = stored_colors[elementId]
        element.onchange = (ev) => {
            browser.storage.local.set({ [element.id]: element.value })
        }
    }
    let folderList = document.getElementById("folder_list")
    if (folderList) {
        let root = (await browser.bookmarks.getSubTree("unfiled_____"))[0]
        let selected = await browser.storage.local.get("bookmarks_folder")
        let option = document.createElement("option")
        option.append(root.title)
        option.value = root.id
        folderList.append(option)
        if (root.children) {
            for (let item of root.children) {
                if (item.type != "folder") continue
                let option = document.createElement("option")
                option.append(item.title)
                option.value = item.id
                if (selected && selected.id == item.id) {
                    option.selected = true
                }
                folderList.append(option)
            }
        }
    }
})
browser.bookmarks.onCreated.addListener(async (id, bookmark) => {
    let rootId = (await browser.bookmarks.getTree())[0].id
    if (bookmark.parentId && bookmark.parentId == rootId && bookmark.type && bookmark.type == "folder") {
        let folderList = document.getElementById("folder_list")
        if (folderList) {
            let option = document.createElement("option")
            option.append(bookmark.title)
            option.value = bookmark.id
            folderList.append(option)
        }
    }
})
//TODO: react when a bookmark folder is removed