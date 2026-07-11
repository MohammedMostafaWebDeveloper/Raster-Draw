var is_drawing = false

var pos = {x: undefined, y: undefined}
var pos0 = {x: undefined, y: undefined}

var stroke_visited = new Set()

function colorMatch(a, b, tolerence) {
    return (
        Math.abs(a[0] - b[0]) <= tolerence / 100 * 255 &&
        Math.abs(a[1] - b[1]) <= tolerence / 100 * 255 &&
        Math.abs(a[2] - b[2]) <= tolerence / 100 * 255 &&
        Math.abs(a[3] - b[3]) <= tolerence / 100 * 255
    )
}

function drawPixel(drawing_canvas, x, y, color, alpha) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (isNaN(x) || isNaN(y) || x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
        return;
    }
    var key = x + "," + y
    if (stroke_visited.has(key) && is_drawing && ((selected_tool == "pencil" && !document.querySelector("#pencil-cust").querySelector(".soft-checkbox").checked) || (selected_tool == "eraser" && !document.querySelector("#eraser-cust").querySelector(".soft-checkbox").checked))) {
        return
    }
    var mirrorX = document.getElementById("mirrorx-checkbox").checked
    var mirrorY = document.getElementById("mirrory-checkbox").checked
    stroke_visited.add(key)
    drawing_canvas.globalAlpha = alpha / 255
    if (selected_tool == "eraser") {
        drawing_canvas.save()
        drawing_canvas.globalCompositeOperation = "destination-out"
        drawing_canvas.fillStyle = "#000000"
        drawing_canvas.fillRect(x, y, 1, 1)
        if (mirrorX) {
            drawing_canvas.fillRect(canvas.width - 1 - x, y, 1, 1)
        }
        if (mirrorY) {
            drawing_canvas.fillRect(x, canvas.height - 1 - y, 1, 1)
        }
        if (mirrorX && mirrorY) {
            drawing_canvas.fillRect(canvas.width - 1 - x, canvas.height - 1 - y, 1, 1)
        }
        drawing_canvas.restore()
        return
    }
    drawing_canvas.fillStyle = color
    drawing_canvas.fillRect(x, y, 1, 1)
    if (selected_tool == "hand" || selected_tool == "fill" || selected_tool == "dropper") { 
        return
    }
    if (mirrorX) {
        drawing_canvas.fillRect(canvas.width - 1 - x, y, 1, 1)
    }
    if (mirrorY) {
        drawing_canvas.fillRect(x, canvas.height - 1 - y, 1, 1)
    }
    if (mirrorX && mirrorY) {
        drawing_canvas.fillRect(canvas.width - 1 - x, canvas.height - 1 - y, 1, 1)
    }
}

function drawLine(drawing_canvas, x1, y1, x2, y2, color, alpha, thickness) {
    var visited = new Set()
    
    var cells = []
    var length = -(thickness - 1) * 0.5
    for (var i = 0; i < thickness; i++) {
        for (var j = 0; j < thickness; j++) {
            cells.push([Math.floor(x1 + length + i) + 0.5, Math.floor(y1 + length + j) + 0.5])
        }
    }

    var dx = -Math.floor(x1) + Math.floor(x2)
    var dy = -Math.floor(y1) + Math.floor(y2)

    var steps = Math.max(Math.abs(dx), Math.abs(dy))

    for (var i = 0; i <= steps; i++) {
        cells.forEach(cell => {
            var x = Math.floor(cell[0] + dx * (i / steps))
            var y = Math.floor(cell[1] + dy * (i / steps))
            var key = x + "," + y
            if (!visited.has(key)) {
                drawPixel(drawing_canvas, x, y, color, alpha)
                visited.add(key)
            }
        })
    }
}

function fill(x, y, color, tolerence, alpha) {
    var rect = canvas.getBoundingClientRect()
    var init_color = c.getImageData(x, y, 1, 1).data
    var pixels = [[Math.floor(x), Math.floor(y)]]
    var new_pixels = []
    var visited = new Set()

    while (pixels.length > 0) {
        new_pixels = []
        pixels.forEach(pixel => {
            var key = pixel[0] + "," + pixel[1]
            if (visited.has(key)) {
                return
            }
            visited.add(key)
            drawPixel(c, pixel[0], pixel[1], color, alpha)
            new_pixels.push([pixel[0] + 1, pixel[1]], [pixel[0] - 1, pixel[1]], [pixel[0], pixel[1] + 1], [pixel[0], pixel[1] - 1])
        })
        pixels = []
        new_pixels.forEach(new_pixel => {
            if (new_pixel[0] < 0 || new_pixel[0] > canvas.width - 1 || new_pixel[1] < 0 || new_pixel[1] > canvas.height - 1) {
                return
            }
            var new_color = c.getImageData(new_pixel[0], new_pixel[1], 1, 1).data
            if (colorMatch(new_color, init_color, tolerence)) {
                pixels.push(new_pixel)
            }
        })
    }
}

function drawRectangle(drawing_canvas, x1, y1, x2, y2, color, alpha, thickness) {
    var start = {x: Math.min(x1, x2), y: Math.min(y1, y2)}
    var end = {x: Math.max(x1, x2), y: Math.max(y1, y2)}

    

    if (Math.round(end.x + thickness / 2) - Math.round(start.x - thickness / 2) <= thickness * 2 || Math.round(end.y + thickness / 2) - Math.round(start.y - thickness / 2) <= thickness * 2) {
        start.x = Math.round(start.x - thickness / 2)
        start.y = Math.round(start.y - thickness / 2)
        end.x = Math.round(end.x + thickness / 2)
        end.y = Math.round(end.y + thickness / 2)
        var dx = end.x - start.x
        var dy = end.y - start.y
        drawing_canvas.beginPath()
        drawing_canvas.globalAlpha = alpha / 255
        drawing_canvas.fillStyle = color
        drawing_canvas.fillRect(start.x, start.y, dx, dy)
    }
    else {
        if (thickness % 2 == 0) {
            start.x = Math.round(start.x)
            start.y = Math.round(start.y)
            end.x = Math.round(end.x)
            end.y = Math.round(end.y)
        }
        drawLine(drawing_canvas, start.x + thickness, start.y, end.x, start.y, color, alpha, thickness)
        drawLine(drawing_canvas, end.x, start.y + thickness, end.x, end.y, color, alpha, thickness)
        drawLine(drawing_canvas, end.x - thickness, end.y, start.x, end.y, color, alpha, thickness)
        drawLine(drawing_canvas, start.x, end.y - thickness, start.x, start.y, color, alpha, thickness)
    }
}

function drawEllipse(drawing_canvas, x1, y1, x2, y2, color, alpha, thickenss) {
    x1 = Math.floor(x1) + (thickenss % 2) * 0.5
    x2 = Math.floor(x2) + (thickenss % 2) * 0.5
    y1 = Math.floor(y1) + (thickenss % 2) * 0.5
    y2 = Math.floor(y2) + (thickenss % 2) * 0.5
    var centerX = (x1 + x2) / 2
    var centerY = (y1 + y2) / 2
    var radiusX = Math.abs(x2 - x1) / 2
    var radiusY = Math.abs(y2 - y1) / 2
    var increment = 0.8 /(radiusX + radiusY)
    var length = (thickenss - 1) / 2
    var visited = new Set()
    for (var i = 0; i < Math.PI / 2; i += increment) {
        for (var j = 0; j < thickenss; j++) {
            var newRX = radiusX + length - j
            var newRY = radiusY + length - j
            var cells = [[centerX + Math.cos(i) * newRX, centerY + Math.sin(i) * newRY], [centerX + Math.cos(i) * -newRX, centerY + Math.sin(i) * newRY], [centerX + Math.cos(i) * newRX, centerY + Math.sin(i) * -newRY], [centerX + Math.cos(i) * -newRX, centerY + Math.sin(i) * -newRY]]
            cells.forEach(cell => {
                var key = Math.floor(cell[0]) + "," + Math.floor(cell[1])
                if (!visited.has(key)) {
                    drawPixel(drawing_canvas, cell[0], cell[1], color, alpha)
                    visited.add(key)
                } 
            })
        }
    }
    
}

editor.onpointerdown = function (e) {
    var rect = canvas.getBoundingClientRect()
    
    pos0.x = (e.clientX - rect.left) / rect.width * canvas.width
    pos0.y = (e.clientY - rect.top) / rect.height * canvas.height

    is_drawing = true
    var size = parseInt(document.querySelector("#pencil-cust").querySelector(".size-number").value)
    var length = -(size - 1) * 0.5
    if (selected_tool == "pencil") {
        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                var x = Math.floor(pos0.x + length + i) + 0.5
                var y = Math.floor(pos0.y + length + j) + 0.5
                drawPixel(c, x, y, primary_color.value, parseInt(document.querySelector("#pencil-cust").querySelector(".alpha-number").value))
            }
        }
        
    }
    else if (selected_tool == "eraser") {
        
        drawPixel(c, pos0.x, pos0.y, "#000000", parseInt(document.querySelector("#eraser-cust").querySelector(".alpha-number").value))
    }
}

editor.onpointerup = function(e) {
    var rect = canvas.getBoundingClientRect()
    var x = (e.clientX - rect.left) / rect.width * canvas.width
    var y = (e.clientY - rect.top) / rect.height * canvas.height

    if (selected_tool == "fill") {
        fill(x, y, primary_color.value, parseInt(document.querySelector("#fill-cust").querySelector(".tolerance-number").value), parseInt(document.querySelector("#fill-cust").querySelector(".alpha-number").value))
    }
    else if (selected_tool == "dropper") {
        var color = c.getImageData(x, y, 1, 1).data
        var r = color[0].toString(16).padStart(2, '0')
        var g = color[1].toString(16).padStart(2, '0')
        var b = color[2].toString(16).padStart(2, '0')
        primary_color.value = "#" + r + g + b
    }
    
}
window.onpointerup = function (e) {
    var rect = canvas.getBoundingClientRect()
    pos.x = (e.clientX - rect.left) / rect.width * canvas.width
    pos.y = (e.clientY - rect.top) / rect.height * canvas.height
    if (selected_tool == "line" && is_drawing) {
        drawLine(c, pos0.x, pos0.y, pos.x, pos.y, primary_color.value, parseInt(document.querySelector("#line-cust").querySelector(".alpha-number").value), parseInt(document.querySelector("#line-cust").querySelector(".thickness-number").value))
    }
    else if (selected_tool == "rectangle" && is_drawing) {
        var alpha = parseInt(document.querySelector("#rectangle-cust").querySelector(".alpha-number").value)
        var thickness = parseInt(document.querySelector("#rectangle-cust").querySelector(".thickness-number").value)
        drawRectangle(c, pos0.x, pos0.y, pos.x, pos.y, primary_color.value, alpha, thickness)
    }
    else if (selected_tool == "circle" && is_drawing) {
        drawEllipse(c, pos0.x, pos0.y, pos.x, pos.y, primary_color.value, parseInt(document.querySelector("#circle-cust").querySelector(".alpha-number").value), parseInt(document.querySelector("#circle-cust").querySelector(".thickness-number").value))
    }
    pos0.x = (e.clientX - rect.left) / rect.width * canvas.width
    pos0.y = (e.clientY - rect.top) / rect.height * canvas.height
    
    is_drawing = false
    stroke_visited.clear()

    if (selected_tool == "hand") {
        editor.style.cursor = "grab"
    }

}

window.onpointermove = function (e) {
    ce.clearRect(0, 0, effects.width, effects.height)
    var cerect = canvas.getBoundingClientRect()
    var x = (e.clientX - cerect.left) / cerect.width * canvas.width
    var y = (e.clientY - cerect.top) / cerect.height * canvas.height

    ce.fillStyle = "rgba(125, 125, 125, 0.5)"
    ce.fillRect(Math.floor(x), Math.floor(y), 1, 1)

    var rect = canvas.getBoundingClientRect()
    pos.x = (e.clientX - rect.left) / rect.width * canvas.width
    pos.y = (e.clientY - rect.top) / rect.height * canvas.height
    if (is_drawing) {

        if (selected_tool == "pencil") {
            drawLine(c, pos.x, pos.y, pos0.x, pos0.y, primary_color.value, parseInt(document.querySelector("#pencil-cust").querySelector(".alpha-number").value), parseInt(document.querySelector("#pencil-cust").querySelector(".size-number").value))
            pos0.x = pos.x
            pos0.y = pos.y
        }
        else if (selected_tool == "eraser") {
            drawLine(c, pos.x, pos.y, pos0.x, pos0.y, "#000000", parseInt(document.querySelector("#eraser-cust").querySelector(".alpha-number").value), parseInt(document.querySelector("#eraser-cust").querySelector(".size-number").value))
            pos0.x = pos.x
            pos0.y = pos.y
        }
        else if (selected_tool == "line") {
            drawLine(ce, pos0.x, pos0.y, pos.x, pos.y, primary_color.value, parseInt(document.querySelector("#line-cust").querySelector(".alpha-number").value), parseInt(document.querySelector("#line-cust").querySelector(".thickness-number").value))
        }
        else if (selected_tool == "rectangle") {
            var alpha = parseInt(document.querySelector("#rectangle-cust").querySelector(".alpha-number").value)
            var thickness = parseInt(document.querySelector("#rectangle-cust").querySelector(".thickness-number").value)
            drawRectangle(ce, pos0.x, pos0.y, pos.x, pos.y, primary_color.value, alpha, thickness)  
        }
        else if (selected_tool == "circle") {
            drawEllipse(ce, pos0.x, pos0.y, pos.x, pos.y, primary_color.value, parseInt(document.querySelector("#circle-cust").querySelector(".alpha-number").value), parseInt(document.querySelector("#circle-cust").querySelector(".thickness-number").value))
        }
        else if (selected_tool == "hand") {
            editor.style.cursor = "grabbing"
            tx += (pos.x - pos0.x) * rect.width / canvas.width
            ty += (pos.y - pos0.y) * rect.height / canvas.height

            editor.style.setProperty("--translateX", tx + "px")
            editor.style.setProperty("--translateY", ty + "px")
        }
    }   
}
