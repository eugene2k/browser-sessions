import { Browser } from "webextension-polyfill"
declare global {
    const browser: Browser;
}

// maintain a global HashMap<WindowId, HashMap<TabId, TabData>> where TabData = (PageTitle, PageURL)

// browser.windows.onCreated.addListener(window => {
//     // Add the window to a global list of currently open windows
// })

browser.windows.onRemoved.addListener(window => {
    // If this window had no tabs except those that contain the launcher, then remove it from the sessions list
})

browser.tabs.onCreated.addListener(tab => {
    // If the opener tab id is not null and current window is not in sessions list add the window to the list along with the current tab
    // elsewise open the launcher page.
})

browser.tabs.onUpdated.addListener(tab => {
    // If current tab id is not in HashMap<TabId, TabData> of current window, then insert it into the hashmap, otherwise just update the TabData
})

browser.tabs.onRemoved.addListener(tab => {
    // Remove current tab from HashMap<TabId. TabData>
})