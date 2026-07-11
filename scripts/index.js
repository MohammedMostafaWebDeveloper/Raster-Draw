var pixels = [41, 41]
document.querySelectorAll("canvas").forEach(canvas_element => {
    canvas_element.width = pixels[0]
    canvas_element.height = pixels[1]
})
var background = document.querySelector("#background")
var cbj = background.getContext("2d")

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

var primary_color = document.getElementById("primary-color")
var seconday_color = document.getElementById("secondary-color")

var selected_tool = "pencil"

var tools = document.querySelectorAll(".tool-btn")

var editor = document.getElementById("editor")

var zoom = 1
var tx = 0
var ty = 0
var shift = [0, 0]

editor.onwheel = function (e) {
    if (Math.pow(1.1, zoom) < 0.25 && e.deltaY > 0 || Math.pow(1.1, zoom) > Math.max(pixels[0], pixels[1]) / 4 && e.deltaY < 0) {
        return
    }
    var old_zoom = Math.pow(1.1, zoom)
    zoom += -e.deltaY / 100
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

function swap_colors() {
    var temp = primary_color.value
    primary_color.value = seconday_color.value 
    seconday_color.value = temp
}

function changeTool(tool) {
    selected_tool = tool.id
    if (selected_tool == "hand") {
        editor.style.cursor = "grab"
    }
    else if (selected_tool == "dropper") {
        editor.style.cursor = 'url("assets/Eye dropper.svg") 4 29, auto'
    }
    else {
        editor.style.cursor = "pointer"
    }
    document.querySelector(".selected").classList.remove("selected")
    tool.classList.add("selected")
    Array.from(document.getElementById("custbar").children).forEach(child => {
        if (child.classList.contains("cust-con")) {
            child.style.display = "none"
        }
    })
    document.getElementById(selected_tool + "-cust").style.display = "flex"
}

tools.forEach(tool => {
    tool.onclick = function () {
        changeTool(tool)
    }
})

c.imageSmoothingEnabled = false

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
changeSliderWithNumber(".size-range", ".size-number")
changeSliderWithNumber(".alpha-range", ".alpha-number")
changeSliderWithNumber(".tolerance-range", ".tolerance-number")
changeSliderWithNumber(".thickness  -range", ".thickness-number")
