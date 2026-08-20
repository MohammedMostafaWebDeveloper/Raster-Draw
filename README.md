# Raster Draw
A simple online pixel art editor (no need to download)
## Why to use Raster Draw
* Easy to use
* Works online
* Light-weighted

# Features
* Landing page
* Drawing platform
* Many drawing tools
* Keyframe animations and export
* Convert image to pixel art

# Preview
### Landing Page
<img width="1366" height="651" alt="image" src="https://github.com/user-attachments/assets/ad19e520-6215-4f44-a903-61d1dd8f5a73" />
### Drawing Page
<img width="1366" height="651" alt="image" src="https://github.com/user-attachments/assets/e231968f-d508-4319-b538-16215cf88023" />
### Convert Image to Pixel Art Page
<img width="1366" height="640" alt="image" src="https://github.com/user-attachments/assets/fa803903-641d-4310-8b4b-bcaeb5f8693d" />

# How to use?
To use this app, you can visit the page https://mohammedmostafawebdeveloper.github.io/Raster-Draw/ or download it and open index.html file with live server by downloading live server extension on VScode and running it on index.html file of this repository to access it offline

# Tools
### Landing page
The landing page contains 3 main tools :
1. Create a new project (name the project and give it an initial width and height)
2. Upload an existing project on your PC (.rasart)
3. Upload an image to convert it to pixel art (.png .jpg .jpeg .webp .avif .gif .svg)

### Drawing page
This page has many sections which are :
Topbar:
1. Rename the project (Untitled Project by default)
2. Undo and Redo (Undo and redo changes you made on the project up to 2.5% of the user RAM)
3. File:
   * Create a new project
   * Upload an existing project
   * Export the project as image
   * Download the project as rasart
4. Resize the canvas (Enter the width and height you want)
5. Export as image (you can control the image type, image scale preffered to be higher than 10, and file name)
   
Toolbar (left) :
1. Move tool (Move your selection)
2. Selection tool (Select an area of the canvas)
   * Select the selection tool : circle, rectangle or lasso
   * Select the selection mode : normal, add, subtract, intersect or exclude
3. Pencil tool (Draw on your canvas)
   * Change the size of the pencil
   * Change the opacity (alpha) of the pencil
   * Check soft brush to get a soft drawing and be able to draw an area more than once
4. Fill tool (Fill an enclosed area on the canvas)
   * Change the tolerance (the difference percentage between colors to fill them)
   * Change the opacity (alpha) of the fill
   * Check ignore other layers to fill the current layer based on it drawings only 
5. Eraser tool (Erase from your canvas)
   * Change the size of the eraser
   * Change the opacity (alpha) of the eraser
   * Check soft brush to get a soft erasing and be able to erase an area more than once
6. Line tool (Draw a line basically)
   * Change the thickness of the stroke
   * Change the opacity (alpha) of the line
7. Ellipse tool (Draw a line basically)
   * Change the thickness of the stroke
   * Change the opacity (alpha) of the ellipse
8. Rectangle tool (Draw a line basically)
   * Change the thickness of the stroke
   * Change the opacity (alpha) of the rectangle
9. Eye dropper (pick a color from the canvas)
10. Hand tool (drag the canvas)
11. Zoom tool (Zoom in and out the canvas)
   * Change the amount to zoom per click
   * Choose whether to zoom in or out
12. Color tool (Choose a color)
   * Pick a primary and secondary colors
   * Swap the colors once needed
     
Rightbar:
1. Tools customizations mentioned above
2. Mirror (Mirror your drawing in X or Y axes or both)
3. Layers (Manage the layers of the app)
   * Add a new layer
   * Duplicate a layer
   * Move a layer up
   * Move a layer down
   * Delete a layer
   * Drag the layers to rearrange them

Canvas:
It is the area where you draw, there are some mouse gestures :
1. Scroll up and down on the canvas to zoom in and out
2. Hold right click and move mouse to move the canvas

Keyframes: 
1. Go to the first frame
2. Go to the previous frame
3. Start or stop animation
4. Go to the next frame
5. Go to the last frame
6. Choose the delay between frames on animation
7. Add a new frame
8. Duplicate a frame
9. Delete a frame
It also shows you the previous and next frames in the form of red and green traces

Shortcuts:
1. Press the first letter of each tool to equip it
2. Press ctrl + z to undo
3. Press ctrl + y to redo
4. Press ctrl + d to deselect
