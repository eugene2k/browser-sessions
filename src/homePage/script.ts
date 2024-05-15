document.addEventListener("DOMContentLoaded", async ev => {
    let list = document.getElementById("topSites")
    let topSites = await browser.topSites.get()
    if (!list) return
    for (var site of topSites) {
        let li = document.createElement("li")
        let anchor = document.createElement("a")
        anchor.href = site.url
        let img = document.createElement("img")
        if (site.favicon) {
            img.src = site.favicon
        } else {
            img.src = new URL(site.url).origin + "/favicon.ico"
        }
        anchor.append(img)
        if (site.title) {
            let text = document.createElement("text")
            text.textContent = site.title
            anchor.append(text)
        }
        li.append(anchor)
        list.append(li)
    }
})