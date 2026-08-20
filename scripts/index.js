var pixels = [40, 40]

var framesData = {frame1 : {layer1 : new Uint8ClampedArray(pixels[0] * pixels[1] * 4)}}

var state = ""

if (sessionStorage.getItem("state")) {
    state = sessionStorage.getItem("state")
}

if (state == "") {
    window.location.href = "index.html"
}
else if (state == "new") {
    if (sessionStorage.getItem("width")) {
        pixels[0] = sessionStorage.getItem("width")
    }
    if (sessionStorage.getItem("height")) {
        pixels[1] = sessionStorage.getItem("height")
    }
    if (sessionStorage.getItem("name")) {
        document.querySelector("#project-name").value = sessionStorage.getItem("name")
    }
    framesData = {frame1 : {layer1 : new Uint8ClampedArray(pixels[0] * pixels[1] * 4)}}
}
else if (state == "upload") {
    var request = indexedDB.open("file", 1)
    request.onsuccess = async (e) => {
        var db = e.target.result
        var data = db.transaction("data", "readonly")
        var getRequest = data.objectStore("data").get(1)

        getRequest.onsuccess = async () => {
            var file = getRequest.result.file
            var text = await file.text()
            var data = JSON.parse(text)
            loadFile(data)
        }
    }
}
function loadFile(data) {
    document.querySelector("#project-name").value = data.name
    pixels[0] = data.width
    pixels[1] = data.height
    
    frame_count = data.frame_count
    layer_count = data.layer_count
    document.querySelectorAll("canvas").forEach(canvas_element => {
        if (canvas_element.id !== "selection-canvas" && canvas_element.id !== "trace") {
            canvas_element.width = pixels[0]
            canvas_element.height = pixels[1]
        }
    })
    redefine()
    for (var i = 0; i < pixels[0]; i++) {
        for (var j = 0; j < pixels[1]; j++) {
            if ((i * j) % 2 == 0 && (j % 2 != 0 || i % 2 != 0)) {
                cbg.fillStyle = "#ffffff"
            }
            else {
                cbg.fillStyle = "#cccccc"
            }
            cbg.fillRect(i, j, 1, 1)
        }
    }
    
    [...document.querySelector("#layers").children].forEach(layer => {
        if (layer.id !== "selection") {
            layer.remove()
        }
    })
    document.querySelector("#layersbar").innerHTML = ""
    document.querySelector("#clips").innerHTML = ""
    framesData = {}
    for (var [id, frame] of Object.entries(data.frames)) {
        framesData[id] = {}

        for (var [layer_id, layer] of Object.entries(frame)) {
            framesData[id][layer_id] = new Uint8ClampedArray(layer)
        }
    }
    data.layers.forEach(layer => {
        newLayer(layer, data.names[data.layers.indexOf(layer)])
    })
    data.clips.forEach(clip => {
        addFrame(clip)
    })
    framesData = {}
    for (var [id, frame] of Object.entries(data.frames)) {
        framesData[id] = {}
       

        for (var [layer_id, layer] of Object.entries(frame)) {
            framesData[id][layer_id] = new Uint8ClampedArray(layer)
        }
    }
    var layers = [...document.querySelector("#layers").children]
    var element = document.querySelector(".active-frame")
    layers.forEach(layer => {
        if (layer.id == "selection") {
            return
        }

        var image = layer.getContext("2d").getImageData(0, 0, pixels[0], pixels[1])
        image.data.set(framesData[element.id][layer.id])
        
        layer.getContext("2d").putImageData(image, 0, 0)
    })
    updateBeforeAfter()
    redefine()
    undo_list = []
    redo_list = []
}


var ctrlPressed = false

var before_order, after_order
document.querySelectorAll("canvas").forEach(canvas_element => {
    canvas_element.width = pixels[0]
    canvas_element.height = pixels[1]
})
var background = document.querySelector("#background")
var cbg = background.getContext("2d")

var undo_list = []
var redo_list = []

var max_memory = (navigator.deviceMemory || 4) * 1024 * 1024 * 1024 * 0.025

for (var i = 0; i < pixels[0]; i++) {
    for (var j = 0; j < pixels[1]; j++) {
        if ((i * j) % 2 == 0 && (j % 2 != 0 || i % 2 != 0)) {
            cbg.fillStyle = "#ffffff"
        }
        else {
            cbg.fillStyle = "#cccccc"
        }
        cbg.fillRect(i, j, 1, 1)
    }
}

var canvas = document.querySelector("#layer1")
var c = canvas.getContext("2d", {willReadFrequently: true})

var select_move = document.querySelector("#selection")
var sm = select_move.getContext("2d")

var effects = document.querySelector("#effects")
var ce = effects.getContext("2d")

var selection_canvas = document.querySelector("#selection-canvas")
var trace = document.querySelector("#trace")
var crect = selection_canvas.getBoundingClientRect()
selection_canvas.width = crect.width
selection_canvas.height = crect.height
trace.width = crect.width
trace.height = crect.height
var sc = selection_canvas.getContext("2d")
var tc = trace.getContext("2d")

var combined_canvas = document.createElement("canvas")
combined_canvas.width = pixels[0]
combined_canvas.height = pixels[1]
var cc = combined_canvas.getContext("2d", {willReadFrequently: true})

var observer = new ResizeObserver(entries => {
    for (var element of entries) {
        element.target.width = element.contentRect.width
        element.target.height = element.contentRect.height
    }
})

observer.observe(selection_canvas)
observer.observe(trace)

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
var frame_count = 1

c.imageSmoothingEnabled = false
cc.imageSmoothingEnabled = false

var pre_selection = new Set()
var selection = new Set()
var temp_selection = new Set()

var dash_count = 0

var is_drawing = false

var moving = false

var selected_pixels = []

var before_edit, after_edit

var temp_hand = false

var pos = {x: undefined, y: undefined}
var pos0 = {x: undefined, y: undefined}

var move_pos = [0, 0]

var stroke_visited = new Set()

var select_start

var clips = document.querySelector("#clips")

var playing = false

var play_interval = null

function redefine() {
    background = document.querySelector("#background")
    cbg = background.getContext("2d")
    canvas = document.querySelector("#layer1")
    c = canvas.getContext("2d", {willReadFrequently: true})

    select_move = document.querySelector("#selection")
    sm = select_move.getContext("2d")

    effects = document.querySelector("#effects")
    ce = effects.getContext("2d")

    selection_canvas = document.querySelector("#selection-canvas")
    trace = document.querySelector("#trace")
    crect = selection_canvas.getBoundingClientRect()
    selection_canvas.width = crect.width
    selection_canvas.height = crect.height
    trace.width = crect.width
    trace.height = crect.height
    sc = selection_canvas.getContext("2d")
    tc = trace.getContext("2d")

    combined_canvas = document.createElement("canvas")
    combined_canvas.width = pixels[0]
    combined_canvas.height = pixels[1]
    cc = combined_canvas.getContext("2d", {willReadFrequently: true})

    observer = new ResizeObserver(entries => {
        for (var element of entries) {
            element.target.width = element.contentRect.width
            element.target.height = element.contentRect.height
        }
    })

    observer.observe(selection_canvas)
    observer.observe(trace)

    primary_color = document.getElementById("primary-color")
    seconday_color = document.getElementById("secondary-color")

    selected_tool = "pencil"

    tools = document.querySelectorAll(".tool-btn")

    editor = document.getElementById("editor")

    layers_bar = document.getElementById("layersbar")
}

function changeSelectIcon() {
    document.getElementsByName("select-tool").forEach(element => {
        if (element.checked) {
            document.getElementById("select").querySelector("img").src = element.nextElementSibling.querySelector("img").src
        }
    })
}

function deselect() {
    placeSelection()
    moving = false
    selection.clear()
    drawSelection()
}

function placeSelection() {
    c.drawImage(select_move, 0, 0)
    sm.clearRect(0, 0, canvas.width, canvas.height)
    selected_pixels = []
    moving = false
    move_pos = [0, 0]
    pre_selection.clear()
    selection.forEach(cell => {
        var [x, y] = cell.split(",").map(Number)
        if (x < 0 || y < 0 || x >= pixels[0] || y >= pixels[1]) {
            selection.delete(cell)
        }
    })
}

function getIndex(x, y) {
    return (Math.floor(y) * pixels[0] + Math.floor(x)) * 4
}

function getCoordinates(index) {
    var pixel = index / 4
    return [pixel % pixels[0], Math.floor(pixel / pixels[0])]
}

function mapPoint(x, y) {
    var rect1 = canvas.getBoundingClientRect()
    var rect2 = selection_canvas.getBoundingClientRect()
    x = rect1.left + x * (rect1.width / pixels[0]) - rect2.left
    y = rect1.top + y * (rect1.height / pixels[1]) - rect2.top
    return [x, y, rect1.width / pixels[0]]
}

function selectInside() {
    for (var i = 0; i < pixels[1]; i++) {
        var cells = []
        temp_selection.forEach(cell => {
            var [x, y] = cell.split(",").map(Number)
            if (y == i) {
                cells.push(x)
            }
        })
        cells.sort((a, b) => a - b) // 2 5 9
        var j = 0
        while (j + 1 < cells.length) {
            if (Math.abs(cells[j] - cells[j + 1]) == 1) {
                j++
            }
            else {
                for (var k = cells[j]; k < cells[j + 1]; k++) {
                    temp_selection.add(k + "," + i)
                }
                j += 2
            }
        }
    }
}

function updateSelection() {
    if (temp_selection.size == 0) {
        return
    }
    if (!document.querySelector("#select-cust").querySelector("#rectangle-select-option").checked) {
        selectInside()
    }
    var temp = new Set()
    temp_selection.forEach(cell => {
        var [x, y] = cell.split(",").map(Number)
        if (x < 0 || x >= pixels[0] || y < 0 || y >= pixels[1]) {
            return
        }
        else if (document.querySelector("#select-cust").querySelector("#union-mode").checked
                || document.querySelector("#select-cust").querySelector("#normal-mode").checked) {
            selection.add(cell)
        }
        else if (document.querySelector("#select-cust").querySelector("#subtract-mode").checked) {
            selection.delete(cell)
        }
        else if (document.querySelector("#select-cust").querySelector("#intersect-mode").checked) {
            if (selection.has(cell)) {
                temp.add(cell)
            }
        }
        else if (document.querySelector("#select-cust").querySelector("#intersect-mode").checked) {
            if (selection.has(cell)) {
                temp.add(cell)
            }
        }
        else if (document.querySelector("#select-cust").querySelector("#exclude-mode").checked) {
            if (selection.has(cell)) {
                selection.delete(cell)
            }
            else {
                selection.add(cell)
            }
        }
    })
    if (document.querySelector("#select-cust").querySelector("#intersect-mode").checked) {
        selection = new Set(temp)
    }
    temp_selection.clear()
    drawSelection()
}

function drawSelection() {
    if (selection.size == 0) {
        document.querySelector("#deselect").style.display = "none"
    }
    else {
        document.querySelector("#deselect").style.display = "block"
    }
    sc.clearRect(0, 0, selection_canvas.width, selection_canvas.height)
    selection.forEach(cell =>{
        var [ox, oy] = cell.split(",").map(Number)
        var [x, y, cell_size] = mapPoint(ox, oy)
        sc.lineWidth = 1;
        sc.setLineDash([5, 5]);
        
        
        if (selection.has((ox + 1) + "," + oy) == false) {
            sc.beginPath()
            sc.moveTo(x + cell_size, y)
            sc.lineTo(x + cell_size, y + cell_size)
            sc.lineDashOffset = dash_count;
            sc.strokeStyle = "black";
            sc.stroke()
            sc.lineDashOffset = dash_count + 5;
            sc.strokeStyle = "white";
            sc.stroke()
        }
        if (selection.has((ox - 1) + "," + oy) == false) {
            sc.beginPath()
            sc.moveTo(x, y)
            sc.lineTo(x, y + cell_size)
            sc.lineDashOffset = dash_count;
            sc.strokeStyle = "black";
            sc.stroke()
            sc.lineDashOffset = dash_count + 5;
            sc.strokeStyle = "white";
            sc.stroke()
        }
        if (selection.has(ox + "," + (oy + 1)) == false) {
            sc.beginPath()
            sc.moveTo(x, y + cell_size)
            sc.lineTo(x + cell_size, y + cell_size)
            sc.lineDashOffset = dash_count;
            sc.strokeStyle = "black";
            sc.stroke()
            sc.lineDashOffset = dash_count + 5;
            sc.strokeStyle = "white";
            sc.stroke()
        }
        if (selection.has(ox + "," + (oy - 1)) == false) {
            sc.beginPath()
            sc.moveTo(x, y)
            sc.lineTo(x + cell_size, y)
            sc.lineDashOffset = dash_count;
            sc.strokeStyle = "black";
            sc.stroke()
            sc.lineDashOffset = dash_count + 5;
            sc.strokeStyle = "white";
            sc.stroke()
        }

    })
}

function animateDashes() {
    requestAnimationFrame(animateDashes)
    dash_count = (dash_count - 0.1) % 10
    drawSelection()
}
animateDashes()

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
    else if (selected_tool == "line" || selected_tool == "circle" || selected_tool == "rectangle" || selected_tool == "select") {
        editor.style.cursor = "crosshair"
    }
    else if (selected_tool == "move") {
        editor.style.cursor = "move"
    }
    else {
        editor.style.cursor = "pointer"
    }
}

function changeTool(tool) {
    pause()
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
    else if (e.ctrlKey && e.keyCode == 68) {
        e.preventDefault()
        placeSelection()
        moving = false
        selection.clear()
        drawSelection()
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
    
    if (e.keyCode == 17) {
        ctrlPressed = true
    }
}

window.onkeyup = function (e) {
    if (e.keyCode == 17) {
        ctrlPressed = false
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

function newLayer(layer_id, layer_name) {
    pause()
    var id
    var name
    if (layer_id) {
        id = [layer_id, layer_id.replace("r", "r-con")]
        name = layer_name
    }
    else {
        layer_count ++
        id = [`layer${layer_count}`, `layer-con${layer_count}`]
        name = "Layer " + layer_count
    }
    
    var new_layer = document.createElement("div")
    new_layer.className = "layer-con"
    new_layer.id = id[1]
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

    new_layer.innerHTML = `<button class="layer-tool hide" onclick="show_hide(this)" style="height: 25px;"><img src="assets/Show.svg"></button><label class="layer-text">${name}</label><input class="layer-name hidden" value="Layer ${layer_count}" onblur="rename(this)" onkeydown="if (event.keyCode == 13) {rename(this)}">`
    layers_bar.insertBefore(new_layer, layers_bar.firstChild)
    var new_canvas = document.createElement("canvas")
    new_canvas.id = id[0]
    new_canvas.width = pixels[0]
    new_canvas.height = pixels[1]
    document.querySelector("#layers").appendChild(new_canvas)
    undo_list.push(["new layer", [...layers_bar.children].indexOf(new_layer), new_layer, new_canvas])
    var frames = [...clips.children]
    frames.forEach(frame => { 
        framesData[frame.id][new_canvas.id] = new Uint8ClampedArray(pixels[0] * pixels[1] * 4)
    })
    changeLayer(new_layer)
    undoCheck()
}
function changeLayer(layer, e) {
    pause()
    var show_and_hide = layer.querySelector(".layer-tool")
    var icon = layer.querySelector("img")
    if (e && (e.target == show_and_hide || e.target == icon)) {
        return
    }
    if (document.querySelector(".active")) {
        document.querySelector(".active").classList.remove("active")
    }
    layer.classList.add("active")
    var canvas_id = layer.id.replace("-con", "")

    canvas = document.querySelector(`#${canvas_id}`)
    c = canvas.getContext("2d", {willReadFrequently: true})
    updateCanvases()
}
function renaming(layer, e) {
    pause()
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
    pause()
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
    pause()
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
    updateBeforeAfter()
}
function dublicatelayer() {
    pause()
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
    var frames = [...clips.children]
    frames.forEach(frame => {
        framesData[frame.id][new_canvas.id] = new_canvas.getContext("2d").getImageData(0, 0, pixels[0], pixels[1]).data
    })
    undoCheck()
}
function layerUp() {
    pause()
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
    pause()
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
    pause()
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
    var element = document.querySelector(".dragging.layer-con")
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
        if (layer.classList.contains("active")) {
            document.querySelector("#layers").appendChild(document.querySelector('#selection'))
        }
    })
    var image = c.getImageData(0, 0, pixels[0], pixels[1])
    var data = image.data
    selected_pixels = [...data].fill(0)
    selection.forEach(cell => {
        var [x, y] = cell.split(",").map(Number)
        var index = getIndex(x, y)
        selected_pixels[index] = data[index]
        selected_pixels[index + 1] = data[index + 1]
        selected_pixels[index + 2] = data[index + 2]
        selected_pixels[index + 3] = data[index + 3]
        data[index] = 0
        data[index + 1] = 0
        data[index + 2] = 0
        data[index + 3] = 0
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
        var all_frames = [...clips.children]
        all_frames.forEach(clip => {
            delete framesData[clip.id][undo[2].id]
        })
        redo_list.push(undo)
        return
    }
    else if (undo[0] == "delete layer") {
        var siblings = [...layers_bar.children]
        layers_bar.insertBefore(undo[2], siblings[undo[1]])
        document.querySelector("#layers").appendChild(undo[3])
        redo_list.push(undo)
        updateBeforeAfter()
        return
    }
    else if (undo[0] == "order") {
        updateOrder(undo[1])
        redo_list.push(undo)
        return
    }
    else if (undo[0] == "new frame") {
        frame_count --
        var clips = [...document.querySelector("#clips").children]
        if (undo[3].classList.contains("active-frame")) {
            changeKeyframe(clips[undo[1] - 1])
        }
        delete framesData[undo[3].id]
        undo[3].remove()
        updateBeforeAfter()
        redo_list.push(undo)
        return
    }
    else if (undo[0] == "delete frame") {
        var clips = document.querySelector("#clips")
        var clips_elements = [...clips.children]
        clips.insertBefore(undo[2], clips_elements[undo[1]])
        framesData[undo[2].id] = undo[3]
        changeKeyframe(undo[2])
        updateBeforeAfter()
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
        var all_frames = [...clips.children]
        all_frames.forEach(clip => {
            framesData[clip.id][redo[2].id] = Uint8ClampedArray(pixels[0] * pixels[1] * 4)
        })
        undo_list.push(redo)
        return
    }
    else if (redo[0] == "delete layer") {
        redo[2].remove()
        redo[3].remove()
        undo_list.push(redo)
        updateBeforeAfter()
        return
    }
    else if (redo[0] == "order") {
        updateOrder(redo[2])
        undo_list.push(redo)
        return
    }
    else if (redo[0] == "new frame") {
        frame_count ++
        var clips = document.querySelector("#clips")
        var clips_elements = [...clips.children]
        clips.insertBefore(redo[3], clips_elements[redo[1]])
        framesData[redo[3].id] = redo[2]
        changeKeyframe(redo[3])
        updateBeforeAfter()
        undo_list.push(redo)
        return
    }
    else if (redo[0] == "delete frame") {
        var clips = [...document.querySelector("#clips").children]
        if (undo[2].classList.contains("active-frame")) {
            changeKeyframe(undo[2])
        }
        delete framesData[redo[2].id]
        redo[2].remove()
        updateBeforeAfter()
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
    updateDim(document.querySelector(".scale-number"))
}
function showFile() {
    document.querySelector("#file-ui").classList.add("popedup")
}
function hideFile() {
    document.querySelector("#file-ui").classList.remove("popedup")
}
window.onclick = (e) => {
    if (e.target.id !== "show-file-btn") {
        hideFile()
    }
}
function showNew() {
    document.querySelector("#new-cover").classList.add("popedup")
}
function uploadFile() {
    document.querySelector("#upload-file").click()
}
function showResize() {
    document.querySelector("#resize-cover").classList.add("popedup")
    document.querySelector("#file-width").value = pixels[0]
    document.querySelector("#file-height").value = pixels[1]
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
    var frames = [...document.querySelector("#clips").children]
    var virtual = document.createElement("canvas")
    virtual.height = height
    virtual.width = width * frames.length
    var vc = virtual.getContext("2d")
    for (var i = 0; i < frames.length; i++) {
        changeKeyframe(frames[i])
        if (export_ui.querySelector("#jpeg").checked) {
            updateCombinedCanvas(width, height, "white")
        }
        else {
            updateCombinedCanvas(width, height)
        }
        vc.drawImage(combined_canvas, width * i, 0, width, height)
    }
    
    var image_type = export_ui.querySelector("input[name='format']:checked").id
    var url = virtual.toDataURL(`image/${image_type}`)
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
function updateKeyframes() {
    var children = [...clips.children]
    var count = 1
    children.forEach(element => {
        element.innerHTML = count
        count ++
    })
}
function updateBeforeAfter(element) {
    var frames = [...clips.children]
    var index = frames.indexOf(element)
    var previous = frames[index - 1]
    var next = frames[index + 1]
    document.querySelector("#before").getContext("2d").clearRect(0, 0, pixels[0], pixels[1])
    document.querySelector("#after").getContext("2d").clearRect(0, 0, pixels[0], pixels[1])
    if (previous) {
        var image = document.querySelector("#before").getContext("2d").getImageData(0, 0, pixels[0], pixels[1])
        var data = image.data
        var all_layers = [...document.querySelector("#layers").children]
        all_layers.forEach(child => {
            var frame = framesData[previous.id][child.id]
            if (child.id !== "selection") {
                for (var i = 0; i < frame.length; i += 4) {
                    data[i + 1] = 255
                    data[i + 3] += frame[i + 3] * 150 / 255
                }
            }
        })
        document.querySelector("#before").getContext("2d").putImageData(image, 0, 0)
    }
    if (next) {
        var image = document.querySelector("#after").getContext("2d").getImageData(0, 0, pixels[0], pixels[1])
        var data = image.data
        var all_layers = [...document.querySelector("#layers").children]
        all_layers.forEach(child => {
            var frame = framesData[next.id][child.id]
            if (child.id !== "selection") {
                for (var i = 0; i < frame.length; i += 4) {
                    data[i] = 255
                    data[i + 3] += frame[i + 3] * 150 / 255
                }
            }
        })
        document.querySelector("#after").getContext("2d").putImageData(image, 0, 0)
    }
}
function changeKeyframe(element) {
    var layers = [...document.querySelector("#layers").children]
    var current = document.querySelector(".active-frame")
    if (current && !playing) {
        layers.forEach(layer => {
            if (layer.id == "selection") {
                return
            }
            var image = layer.getContext("2d").getImageData(0, 0, pixels[0], pixels[1])
            framesData[current.id][layer.id] = image.data
        })
    }
    if (document.querySelector(".active-frame")) {
        document.querySelector(".active-frame").classList.remove("active-frame")
    }
    
    element.classList.add("active-frame")

    
    layers.forEach(layer => {
        if (layer.id == "selection") {
            return
        }

        var image = layer.getContext("2d").getImageData(0, 0, pixels[0], pixels[1])
        image.data.set(framesData[element.id][layer.id])
        
        layer.getContext("2d").putImageData(image, 0, 0)
    })
    if (!play_interval) {
        updateBeforeAfter(element)
    }
    else {
        document.querySelector("#before").getContext("2d").clearRect(0, 0, pixels[0], pixels[1])
        document.querySelector("#after").getContext("2d").clearRect(0, 0, pixels[0], pixels[1])
    }
    
}
function addFrame(clip_id) {
    pause()
    var id
    if (!clip_id) {
        frame_count ++
        id = "frame" + frame_count
    }
    else {
        id = clip_id
    }
    
    var clip_con = document.createElement("div")
    clip_con.classList.add("clip")
    clip_con.draggable = true
    clip_con.id = id
    clip_con.ondragstart = function () {
        startDrag(clip_con)
    }
    clip_con.ondragend = function () {
        endDrag(clip_con)
        updateKeyframes()
    }
    clip_con.onclick = function () {
        changeKeyframe(clip_con)
    }
    clips.appendChild(clip_con)
    updateKeyframes()
    var layers = [...document.querySelector("#layers").children]
    framesData["frame" + frame_count] = {}
    layers.forEach(layer => {
        if (layer.id != "selection") {
            framesData[id][layer.id] = new Uint8ClampedArray(pixels[0] * pixels[1] * 4)
        }
    })
    changeKeyframe(clip_con)
    var clips_elements = [...document.querySelector("#clips").children]
    undo_list.push(["new frame", clips_elements.indexOf(clip_con), framesData[id], clip_con])
}
function dublicateFrame() {
    pause()
    frame_count ++
    var clip_con = document.createElement("div")
    var element = document.querySelector(".active-frame")
    var next = element.nextElementSibling
    clip_con.classList.add("clip")
    clip_con.draggable = true
    clip_con.id = "frame" + frame_count
    clip_con.ondragstart = function () {
        startDrag(clip_con)
    }
    clip_con.ondragend = function () {
        endDrag(clip_con)
        updateKeyframes()
    }
    clip_con.onclick = function () {
        changeKeyframe(clip_con)
    }
    if (next) {
        clips.insertBefore(clip_con, next)
    }
    else {
        clips.append(clip_con)
    }
    
    updateKeyframes()
    var layers = [...document.querySelector("#layers").children]
    
    framesData["frame" + frame_count] = {}
    layers.forEach(layer => {
        if (layer.id != "selection") {
            framesData["frame" + frame_count][layer.id] = new Uint8ClampedArray(pixels[0] * pixels[1] * 4)
        }
    })
    changeKeyframe(clip_con)
    var clips_elements = document.querySelector("#clips")
    undo_list.push(["new frame", clips_elements.indexOf(clip_con), framesData["frame" + frame_count], clip_con])
}
function removeFrame() {
    pause()
    var frames = [...document.querySelector("#clips").children]
    if (frames.length <= 1) {
        alert("Couldn't delete the last frame")
        return
    }
    var element = document.querySelector(".active-frame")
    var index = frames.indexOf(element)
    if (index + 1 < frames.length) {
        changeKeyframe(frames[index + 1])
    }
    else {
        changeKeyframe(frames[index - 1])
    }
    undo_list.push(["delete frame", index, element, framesData[element.id]])
    delete framesData[element.id]
    element.remove()
    updateKeyframes()
}
clips.addEventListener("dragover", (e) => {
    e.preventDefault()
    var element = document.querySelector(".dragging.clip")
    var siblings = [...document.querySelectorAll(".clip:not(.dragging)")]

    var replace_element = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect()
        return e.clientX <= rect.left + rect.width / 2
    })

    clips.insertBefore(element, replace_element)
    updateCanvases()
})
clips.addEventListener("dragenter", (e) => {
    e.preventDefault()
})

function startPlay() {
    var frames = [...clips.children]
    var index = frames.indexOf(document.querySelector(".active-frame"))
    if (index < frames.length - 1) {
        changeKeyframe(frames[index + 1])
    }
    else {
        changeKeyframe(frames[0])
    }
}
function play() {
    var element = document.querySelector("#play-pause-btn")
    element.classList.remove("paused")
    element.classList.add("played")
    element.querySelector("img").src = "assets/Pause.svg"
    play_interval = setInterval(() => {
        startPlay()
    }, parseInt(document.querySelector("#delay").value))
}
function pause() {
    var element = document.querySelector("#play-pause-btn")
    element.classList.remove("played")
    element.classList.add("paused")
    element.querySelector("img").src = "assets/Play.svg"
    clearInterval(play_interval)
    play_interval = null
    updateBeforeAfter(document.querySelector(".active-frame"))
}
function playPause() {
    var element = document.querySelector("#play-pause-btn")
    if (element.classList.contains("paused")) {
        play(element)
    }
    else if (element.classList.contains("played")) {
        pause(element)
    }
}
function backward() {
    var frames = [...clips.children]
    changeKeyframe(frames[0])
    pause()
}
function backwardStep() {
    var frames = [...clips.children]
    var element = document.querySelector(".active-frame")
    var index = frames.indexOf(element)
    if (index == 0) {
        changeKeyframe(frames[frames.length - 1])
    }
    else {
        changeKeyframe(frames[index - 1])
    }
    pause()
}
function forwardStep() {
    var frames = [...clips.children]
    var element = document.querySelector(".active-frame")
    var index = frames.indexOf(element)
    if (index == frames.length - 1) {
        changeKeyframe(frames[0])
    }
    else {
        changeKeyframe(frames[index + 1])
    }
    pause()
}
function forward() {
    var frames = [...clips.children]
    changeKeyframe(frames[frames.length - 1])
    pause()
}
function changeDelay() {
    if (play_interval !== null) {
        clearInterval(play_interval)
        play_interval = null
        play_interval = setInterval(() => {
            startPlay()
        }, parseInt(document.querySelector("#delay").value))
    }
}
var forbiddenChars = ['/', '\\', ':', '*', '"', '?', '<', '>', '|']
function showError(text, duration) {
    document.querySelector("#error-content").innerText = text
    document.querySelector("#error").style.translate = "0px 0px"
    setTimeout(() => {
        document.querySelector("#error").style.translate = "calc(100% + 15px) 0px"
    }, duration * 1000)
}
function checkChars(element) {
    var initText = element.value
    forbiddenChars.forEach(char => {
        element.value = element.value.replaceAll(char, "")
    })
    if (element.value != initText) {
        showError("Project name can't contain these characters " + '/ \\ : * " ? < > |', 5)
    }
}
function resizeCanvas() {
    var width = document.querySelector("#file-width").value
    var height = document.querySelector("#file-height").value

    if (width < 1 || height < 1) {
        showError("Width and height must be at least 1px", 5)
    }
    else if (width > 1024 || height > 1024) {
        showError("Width and height can't exceed 1024px", 5)
    }
    else {
        pixels[0] = width
        pixels[1] = height
        var frames = [...document.querySelector("#clips").children]
        var current = document.querySelector(".active-frame")
        for (var i = 0; i < frames.length; i++) {
            changeKeyframe(frames[i])
            var all_layers = [...document.querySelector("#layers").children]
            all_layers.forEach(layer => {
                var temp = document.createElement("canvas")
                temp.width = layer.width
                temp.height = layer.height
                var temp_c = temp.getContext("2d")

                temp_c.drawImage(layer, 0, 0)

                layer.width = pixels[0]
                layer.height = pixels[1]

                layer.getContext("2d").drawImage(temp, 0, 0)
            })
        }
        document.querySelector("#before").width = pixels[0]
        document.querySelector("#before").height = pixels[1]
        document.querySelector("#after").width = pixels[0]
        document.querySelector("#after").height = pixels[1]
        effects.width = pixels[0]
        effects.height = pixels[1]
        var ce = effects.getContext("2d")
        background.width = pixels[0]
        background.height = pixels[1]
        var cbg = background.getContext("2d")
        for (var i = 0; i < pixels[0]; i++) {
            for (var j = 0; j < pixels[1]; j++) {
                if ((i * j) % 2 == 0 && (j % 2 != 0 || i % 2 != 0)) {
                    cbg.fillStyle = "#ffffff"
                }
                else {
                    cbg.fillStyle = "#cccccc"
                }
                cbg.fillRect(i, j, 1, 1)
            }
        }
    }
}
function createFile() {
    var name = document.querySelector("#new-name").value
    var width = document.querySelector("#new-width").value
    var height = document.querySelector("#new-height").value

    if (name == "") {
        showError("Please enter a name for the project")
        return
    }
    else if (width < 1 || height < 1) {
        showError("The width and the height can't be less than 1 px")
        return
    }
    else if (width > 1024 || height > 1024) {
        showError("The width and the height can't exceed 1024 px")
        return
    }

    sessionStorage.setItem("width", width)
    sessionStorage.setItem("height", height)
    sessionStorage.setItem("name", name)

    window.location.reload()
}
function downloadRasart() {
    changeKeyframe(document.querySelector(".active-frame"))
    var name = document.querySelector("#project-name")
    if (!name.value) {
        name.value = "Untitled Project"
    }
    var data = {
        name : name.value,
        width : pixels[0],
        height : pixels[1],
        frames : {},
        layer_count : layer_count,
        frame_count : frame_count,
        names: [],
        layers : [],
        clips : []
    }
    for (var [id, frame] of Object.entries(framesData)) {
        data.frames[id] = {}

        for (var [layer_id, layer] of Object.entries(frame)) {
            data.frames[id][layer_id] = Array.from(layer)
        }
    }
    var layers = [...document.querySelector("#layers").children]
    var clips = [...document.querySelector("#clips").children]
    layers.forEach(layer => {
        if (layer.id !== "selection") {
            data.layers.push(layer.id)
            data.names.push(document.getElementById(layer.id.replace("r", "r-con")).querySelector(".layer-text").innerText)
        }
    })

    clips.forEach(clip => {
        data.clips.push(clip.id)
    })
    var json = JSON.stringify(data)
    var blob = new Blob([json], {
        type: "application/json"
    })
    var url = URL.createObjectURL(blob)

    var link = document.createElement("a")
    link.href = url

    link.download = name.value + ".rasart"
    link.click()

    URL.revokeObjectURL(url)
}
function uploadProject(element) {
    var file = element.files[0]
    if (file) {
        var request = indexedDB.open("file", 1)
        request.onupgradeneeded = (event) => {
            var db = event.target.result

            db.createObjectStore("data", {keyPath: "id"})
        }
        request.onsuccess = (event) => {
            var db = event.target.result
            var edit = db.transaction("data", "readwrite")
            edit.objectStore("data").put({id: 1, file: file})
            edit.oncomplete = () => {
                sessionStorage.setItem("state", "upload")
                window.location.reload()
            }
        }
    }
}