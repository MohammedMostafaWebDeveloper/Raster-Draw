var pixels = [40, 40]

var before_order, after_order

document.querySelectorAll("canvas").forEach(canvas_element => {
    canvas_element.width = pixels[0]
    canvas_element.height = pixels[1]
})
var background = document.querySelector("#background")
var cbj = background.getContext("2d")

var undo_list = []
var redo_list = []

var max_memory = navigator.deviceMemory * 1024 * 1024 * 1024 * 0.025

for (var i = 0; i < pixels[0]; i++) {
    for (var j = 0; j < pixels[1]; j++) {
        if ((i * j) % 2 == 0 && (j % 2 != 0 || i % 2 != 0)) {
            cbj.fillStyle = "#ffffff"
        }
        else {
            cbj.fillStyle = "#cccccc"
        }
        cbj.fillRect(i, j, 1, 1)
    }
}

var canvas = document.querySelector("#layer1")
var c = canvas.getContext("2d", {willReadFrequently: true})

var effects = document.querySelector("#effects")
var ce = effects.getContext("2d")

var combined_canvas = document.createElement("canvas")
combined_canvas.width = pixels[0]
combined_canvas.height = pixels[1]
var cc = combined_canvas.getContext("2d", {willReadFrequently: true})

var primary_color = document.getElementById("primary-color")
var seconday_color = document.getElementById("secondary-color")

var selected_tool = "pencil"

var tools = document.querySelectorAll(".tool-btn")

var editor = document.getElementById("editor")

var layers_bar = document.getElementById("layersbar")

var zoom = 1
var tx = 0
var ty = 0
var shift = [0, 0]
var layer_count = 1

c.imageSmoothingEnabled = false
cc.imageSmoothingEnabled = false

function updateCombinedCanvas(width, height, background) {
    if (width && height) {
        combined_canvas.width = width
        combined_canvas.height = height
    }
    else {
        combined_canvas.width = pixels[0]
        combined_canvas.height = pixels[1]
    }
    cc.imageSmoothingEnabled = false
    if (background) {
        cc.fillStyle = background
        cc.fillRect(0, 0, combined_canvas.width, combined_canvas.height)
    }
    [...document.getElementById("layers").children].forEach(child => {
        cc.drawImage(child, 0, 0, combined_canvas.width, combined_canvas.height)
    })
}

function zoomCanvas(amount, e) {
    if ((Math.pow(1.1, zoom) < 0.25 && amount < 0) || (Math.pow(1.1, zoom) > Math.max(pixels[0], pixels[1]) / 4 && amount > 0)) {
        return
    }
    var old_zoom = Math.pow(1.1, zoom)
    zoom += amount
    var new_zoom = Math.pow(1.1, zoom)
    var rect = canvas.getBoundingClientRect()
    var posX = (rect.left + rect.width / 2) - e.clientX
    var posY = (rect.top + rect.height / 2) - e.clientY

    var incX = posX / old_zoom * new_zoom - posX 
    var incY = posY / old_zoom * new_zoom - posY

    tx += incX
    ty += incY

    editor.style.setProperty("--scale", Math.pow(1.1, zoom))

    editor.style.setProperty("--translateX", tx + "px")
    editor.style.setProperty("--translateY", ty + "px")
}

editor.onwheel = function (e) {
    
    zoomCanvas(-e.deltaY / 100, e)
}

function undoCheck() {
    while(new Blob([JSON.stringify(undo_list)]).size > max_memory) {
        undo_list.shift()
    }
    redo_list = []
}

function swap_colors() {
    var temp = primary_color.value
    primary_color.value = seconday_color.value 
    seconday_color.value = temp
}

function setCursor() {
    if (selected_tool == "hand") {
        editor.style.cursor = "grab"
    }
    else if (selected_tool == "dropper") {
        editor.style.cursor = 'url("assets/Eye dropper.svg") 4 29, auto'
    }
    else if (selected_tool == "line" || selected_tool == "circle" || selected_tool == "rectangle") {
        editor.style.cursor = "crosshair"
    }
    else {
        editor.style.cursor = "pointer"
    }
}

function changeTool(tool) {
    selected_tool = tool.id
    setCursor()
    document.querySelector(".selected").classList.remove("selected")
    tool.classList.add("selected")
    Array.from(document.getElementById("custbar").children).forEach(child => {
        if (child.classList.contains("cust-con")) {
            child.style.display = "none"
        }
    })
    document.getElementById(selected_tool + "-cust").style.display = "flex"
}

window.onkeydown = function (e) {
    if (e.target.localName == "input") {
        return
    }
    if (e.keyCode == 66) {
        changeTool(document.querySelector("#pencil"))
    }
    else if (e.keyCode == 70) {
        changeTool(document.querySelector("#fill"))
    }
    else if (e.keyCode == 69) {
        changeTool(document.querySelector("#eraser"))
    }
    else if (e.keyCode == 76) {
        changeTool(document.querySelector("#line"))
    }
    else if (e.keyCode == 67) {
        changeTool(document.querySelector("#circle"))
    }
    else if (e.keyCode == 82) {
        changeTool(document.querySelector("#rectangle"))
    }
    else if (e.keyCode == 72) {
        changeTool(document.querySelector("#hand"))
    }
    else if (e.keyCode == 68) {
        changeTool(document.querySelector("#dropper"))
    }
    else if (!e.ctrlKey && e.keyCode == 90) {
        changeTool(document.querySelector("#zoom"))
    }
    else if (e.ctrlKey && e.keyCode == 90) {
        undo()
    }
    else if (e.ctrlKey && e.keyCode == 89) {
        redo()
    }
}

tools.forEach(tool => {
    tool.onclick = function () {
        changeTool(tool)
    }
})

function changeNumberWithSlider(slider, number) {
    document.querySelectorAll(slider).forEach(element => {
        element.addEventListener("input", () => {
            if (parseInt(element.value) > parseInt(element.max)) {
                element.value = element.max
            }
            else if (parseInt(element.value) < parseInt(element.min)) {
                element.value = element.min
            }
            var other = element.closest(".cust-con").querySelector(number)
            if (element.max == other.max && element.min == other.min) {
                other.value = element.value
            }
            else {
                other.value = Math.round((other.max ** (1 / element.max)) ** element.value)
            }
            
        })
    })
}
function changeSliderWithNumber(slider, number) {
    document.querySelectorAll(number).forEach(element => {
        element.addEventListener("input", () => {
            if (parseInt(element.value) > parseInt(element.max)) {
                element.value = element.max
            }
            else if (parseInt(element.value) < parseInt(element.min)) {
                element.value = element.min
            }
            element.value = Math.round(element.value)
            var other = element.closest(".cust-con").querySelector(slider)
            if (element.max == other.max && element.min == other.min) {
                other.value = element.value
            }
            else {
                other.value = Math.round(Math.log(element.value) / Math.log((element.max ** (1 / other.max))))
            }
        })
    })
}
changeNumberWithSlider(".size-range", ".size-number")
changeNumberWithSlider(".alpha-range", ".alpha-number")
changeNumberWithSlider(".tolerance-range", ".tolerance-number")
changeNumberWithSlider(".thickness-range", ".thickness-number")
changeNumberWithSlider(".zoom-range", ".zoom-number")
changeNumberWithSlider(".scale-range", ".scale-number")
changeSliderWithNumber(".size-range", ".size-number")
changeSliderWithNumber(".alpha-range", ".alpha-number")
changeSliderWithNumber(".tolerance-range", ".tolerance-number")
changeSliderWithNumber(".thickness-range", ".thickness-number")
changeSliderWithNumber(".zoom-range", ".zoom-number")
changeSliderWithNumber(".scale-range", ".scale-number")

function updateOrder(order) {
    order.forEach(id => {
        layers_bar.appendChild(document.getElementById(id))
    })
    updateCanvases()
}

function getOrder() {
    return [...layers_bar.children].map(layer => layer.id)
}

function show_hide(element) {
    var layer = element.parentElement
    var canvas_id = layer.id.replace("-con", "")
    if (element.classList.contains("hide")) {
        element.classList.remove("hide")
        element.classList.add("show")
        element.querySelector("img").src = "assets/Hide.svg"
        document.getElementById(canvas_id).classList.add("hidden")
    }
    else {
        element.classList.remove("show")
        element.classList.add("hide")
        element.querySelector("img").src = "assets/Show.svg"
        document.getElementById(canvas_id).classList.remove("hidden")
    }
}

function newLayer() {
    layer_count ++
    var new_layer = document.createElement("div")
    new_layer.className = "layer-con"
    new_layer.id = `layer-con${layer_count}`
    new_layer.draggable = true
    new_layer.ondragstart = function () {
        startDrag(new_layer)
    }
    new_layer.ondragend = function () {
        endDrag(new_layer)
    }
    new_layer.onclick = function(e) {
        changeLayer(new_layer, e)
    }
    new_layer.ondblclick = function (e) {
        renaming(this, e)
    }

    new_layer.innerHTML = `<button class="layer-tool hide" onclick="show_hide(this)"><img src="assets/Show.svg"></button><label class="layer-text">Layer ${layer_count}</label><input class="layer-name hidden" value="Layer ${layer_count}" onblur="rename(this)" onkeydown="if (event.keyCode == 13) {rename(this)}">`
    layers_bar.insertBefore(new_layer, layers_bar.firstChild)
    var new_canvas = document.createElement("canvas")
    new_canvas.id = `layer${layer_count}`
    new_canvas.width = pixels[0]
    new_canvas.height = pixels[1]
    document.querySelector("#layers").appendChild(new_canvas)
    undo_list.push(["new layer", [...layers_bar.children].indexOf(new_layer), new_layer, new_canvas])
    undoCheck()
}
function changeLayer(layer, e) {
    
    var show_and_hide = layer.querySelector(".layer-tool")
    var icon = layer.querySelector("img")
    if (e && (e.target == show_and_hide || e.target == icon)) {
        return
    }
    document.querySelector(".active").classList.remove("active")
    layer.classList.add("active")
    var canvas_id = layer.id.replace("-con", "")

    canvas = document.querySelector(`#${canvas_id}`)
    c = canvas.getContext("2d", {willReadFrequently: true})
}
function renaming(layer, e) {
    
    var show_and_hide = layer.querySelector(".layer-tool")
    var icon = layer.querySelector("img")
    if (e && (e.target == show_and_hide || e.target == icon)) {
        return
    }
    var label = layer.querySelector("label")
    var rename_input = layer.querySelector(".layer-name")
    if (label.classList.contains("hidden")) {
        return
    }
    layer.draggable = false
    rename_input.value = label.innerText
    show_and_hide.classList.add("hidden")
    label.classList.add("hidden")
    rename_input.classList.remove("hidden")
    rename_input.focus()
    rename_input.select()
}
function rename(name) {
    var layer = name.parentElement
    var label = layer.querySelector("label")
    var show_and_hide = layer.querySelector(".layer-tool")
    name.blur()
    layer.draggable = true
    show_and_hide.classList.remove("hidden")
    label.classList.remove("hidden")
    name.classList.add("hidden")
    if (name.value == "" || name.value == label.innerText) {
        return
    }
    undo_list.push(["rename", layer.id, label.innerText, name.value])
    undoCheck()
    label.innerText = name.value
}
function deleteLayer() {
    var all_layers = [...document.querySelectorAll(".layer-con")]
    if (all_layers.length == 1) {
        alert("Couldn't delete the last layer!")
        return
    }
    var element = document.querySelector(".active")
    var index = all_layers.indexOf(element)
    if (index + 1 < all_layers.length) {
        changeLayer(all_layers[index + 1])
    }
    else {
        changeLayer(all_layers[index - 1])
    }
    
    var canvas_id = element.id.replace("-con", "")
    var canvas_element = document.getElementById(canvas_id)
    undo_list.push(["delete layer", index, element, canvas_element])
    undoCheck()
    element.remove()
    canvas_element.remove()
}
function dublicatelayer() {
    layer_count ++
    var element = document.querySelector(".active")
    var canvas_id = element.id.replace("-con", "")
    var canvas_element = document.getElementById(canvas_id)
    var new_layer = element.cloneNode(true)
    new_layer.ondragstart = function () {
        startDrag(new_layer)
    }
    new_layer.ondragend = function () {
        endDrag(new_layer)
    }
    new_layer.onclick = function (e) {
        changeLayer(new_layer, e)
    }
    new_layer.ondblclick = function (e) {
        renaming(this, e)
    }
    new_layer.id = `layer-con${layer_count}`
    new_layer.querySelector("label").innerHTML += " - copy"
    new_layer.querySelector(".layer-name").value = new_layer.querySelector("label").innerHTML
    new_layer.classList.remove("active")
    var new_canvas = canvas_element.cloneNode()
    new_canvas.id = `layer${layer_count}`
    new_canvas.getContext("2d").drawImage(canvas_element, 0, 0)
    document.querySelector("#layers").insertBefore(new_canvas, canvas_element.nextSibling)
    layers_bar.insertBefore(new_layer, element)
    undo_list.push(["new layer", [...layers_bar.children].indexOf(new_layer), new_layer, new_canvas])
    undoCheck
}
function layerUp() {
    var element = document.querySelector(".active")
    if (!element.previousElementSibling) {
        return
    }
    before_order = getOrder()
    layers_bar.insertBefore(element, element.previousElementSibling)
    updateCanvases()
    after_order = getOrder()
    if (JSON.stringify(after_order) != JSON.stringify(before_order)) {
        undo_list.push(["order", before_order, after_order])
        undoCheck()
    }
}
function layerDown() {
    var element = document.querySelector(".active")
    if (!element.nextElementSibling) {
        return
    }
    before_order = getOrder()
    layers_bar.insertBefore(element.nextElementSibling, element)
    updateCanvases()
    after_order = getOrder()
    if (JSON.stringify(after_order) != JSON.stringify(before_order)) {
        undo_list.push(["order", before_order, after_order])
        undoCheck()
    }
}
function startDrag(element) {
    if (element.draggable == false) {
        e.preventDefault()
        return
    }
    before_order = getOrder()
    setTimeout(() => element.classList.add("dragging"), 0)
}
function endDrag(element) {
    element.classList.remove("dragging")
    after_order = getOrder()
    if (JSON.stringify(after_order) != JSON.stringify(before_order)) {
        undo_list.push(["order", before_order, after_order])
        undoCheck()
    }
}
layers_bar.addEventListener("dragover", (e) => {
    e.preventDefault()
    var element = document.querySelector(".dragging")
    var siblings = [...document.querySelectorAll(".layer-con:not(.dragging)")]

    var replace_element = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect()
        return e.clientY <= rect.top + rect.height / 2
    })

    layers_bar.insertBefore(element, replace_element)
    updateCanvases()
})
layers_bar.addEventListener("dragenter", (e) => {
    e.preventDefault()
})
function updateCanvases() {
    [...layers_bar.children].reverse().forEach(layer => {
        var canvas_id = layer.id.replace("-con", "")
        document.querySelector("#layers").appendChild(document.querySelector(`#${canvas_id}`))
    })
}
function undo() {
    if (undo_list.length == 0) {
        return
    }
    var undo = undo_list.pop()
    if (undo[0] == "rename") {
        document.getElementById(undo[1]).querySelector(".layer-text").innerText = undo[2]
        redo_list.push(undo)
        return
    }
    else if (undo[0] == "new layer") {
        layer_count --
        if (undo[2].classList.contains("active")) {
            changeLayer(layers_bar.children[undo[1] + 1])
        }
        undo[2].remove()
        undo[3].remove()
        redo_list.push(undo)
        return
    }
    else if (undo[0] == "delete layer") {
        var siblings = [...layers_bar.children]
        layers_bar.insertBefore(undo[2], siblings[undo[1]])
        document.querySelector("#layers").appendChild(undo[3])
        redo_list.push(undo)
        return
    }
    else if (undo[0] == "order") {
        updateOrder(undo[1])
        redo_list.push(undo)
        return
    }

    var [layer_id, changes] = undo
    redo_list.push([layer_id, changes])
    var id = layer_id.slice(0, 5) + "-con" + layer_id.slice(5)
    changeLayer(document.querySelector(`#${id}`))
    var data = c.getImageData(0, 0, canvas.width, canvas.height)
    changes.forEach(change => {
        data.data[change[0]] = change[1]
    })
    c.putImageData(data, 0, 0)
}
function redo() {
    if (redo_list.length == 0) {
        return
    }
    var redo = redo_list.pop()
    if (redo[0] == "rename") {
        document.getElementById(redo[1]).querySelector(".layer-text").innerText = redo[3]
        undo_list.push(redo)
        return
    }
    else if (redo[0] == "new layer") {
        layer_count ++
        var siblings = [...layers_bar.children]
        layers_bar.insertBefore(redo[2], siblings[redo[1]])
        document.querySelector("#layers").appendChild(redo[3])
        updateCanvases()
        undo_list.push(redo)
        return
    }
    else if (redo[0] == "delete layer") {
        redo[2].remove()
        redo[3].remove()
        undo_list.push(redo)
        return
    }
    else if (redo[0] == "order") {
        updateOrder(redo[2])
        undo_list.push(redo)
        return
    }
    var [layer_id, changes] = redo
    undo_list.push([layer_id, changes])
    var id = layer_id.slice(0, 5) + "-con" + layer_id.slice(5)
    changeLayer(document.querySelector(`#${id}`))
    var data = c.getImageData(0, 0, canvas.width, canvas.height)
    changes.forEach(change => {
        data.data[change[0]] = change[2]
    })
    c.putImageData(data, 0, 0)
}
function showExport() {
    document.querySelector("#export-cover").classList.add("popedup")
    var file_name = document.getElementById("project-name").value
    if (file_name == "") {
        file_name = "Untitled Project"
    }
    document.querySelector("#file-name").value = file_name
    document.querySelector("#file-name").setAttribute("placeholder", file_name)
    updateDim()
}
function showResize() {
    document.querySelector("#resize-cover").classList.add("popedup")
}
function hideCover(element, e) {
    if (e.target == element && element.classList.contains("clicked")) {
        element.classList.remove("popedup")
    }
    element.classList.remove("clicked")
}
function downloadImage() {
    var export_ui = document.querySelector("#export-ui")
    var scale = export_ui.querySelector(".scale-number").value
    var width = pixels[0] * scale
    var height = pixels[1] * scale
    if (export_ui.querySelector("#jpeg").checked) {
        updateCombinedCanvas(width, height, "white")
    }
    else {
        updateCombinedCanvas(width, height)
    }
    var image_type = export_ui.querySelector("input[name='format']:checked").id
    var url = combined_canvas.toDataURL(`image/${image_type}`)
    var name = export_ui.querySelector("#file-name").value
    if (name == "") {
        name = export_ui.querySelector("#file-name").getAttribute("placeholder")
    }

    var link = document.createElement("a")
    link.href = url
    link.download = name + "." + image_type
    link.click()
}
function updateDim(element) {
    document.querySelector("#width-num").innerText = (parseInt(element.value) * pixels[0]) + "px"
    document.querySelector("#height-num").innerText = (parseInt(element.value) * pixels[1]) + "px"
}