document.addEventListener('DOMContentLoaded', () => {
    const toolbarHeight = document.querySelector('.toolbar')?.offsetHeight || 0;
    const drawingArea = document.getElementById("drawingArea");
    const brushSizeSlider = document.getElementById("brushSize");
    const clearBtn = document.getElementById("clearBtn");
    const colorPalette = document.getElementById("colorPalette");
    const colorSwatches = document.querySelectorAll(".color-swatch");
    const textModeBtn = document.getElementById("textModeBtn");
    const fontSelect = document.getElementById("fontSelect");
    const saveBtn = document.getElementById("saveBtn");
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const canvasNameEl = document.getElementById("canvasName");

    let drawing = false;
    let color = "black";
    let brushSize = parseInt(brushSizeSlider?.value || "5", 10);
    let currentStroke = [];
    let drawingHistory = [];
    let redoStack = [];
    let lastPosition = { x: null, y: null };
    let isTextMode = false;
    let currentFont = fontSelect?.value || "Arial";
    let currentCanvasId = null;
    const token = localStorage.getItem('token');
    const socket = io('http://localhost:3000', {
        auth: {
            token: token
        }
    });
    const cursors = new Map(); // Map of userId to { cursor: DOMElement, name: string, isDrawing: boolean }

    if (!token) {
        alert('Unauthorized. Redirecting to login.');
        window.location.href = '../login/login.html';
        return;
    }

    function resizeDrawingArea() {
        if (drawingArea) {
            drawingArea.style.width = `${window.innerWidth}px`;
            drawingArea.style.height = `${window.innerHeight - toolbarHeight}px`;
            drawingArea.style.top = `${toolbarHeight}px`;
        }
    }
    resizeDrawingArea();
    window.addEventListener('resize', resizeDrawingArea);

    function getCanvasIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id');
    }
    currentCanvasId = getCanvasIdFromUrl();
    if (currentCanvasId) {
        socket.emit('joinCanvas', currentCanvasId);
        loadDrawingFromBackend(currentCanvasId);
    }

    socket.on('cursorUpdate', ({ userId, x, y, name }) => {
        updateCursorPosition(userId, x, y, name || 'Unknown');
    });

    socket.on('drawPoint', ({ x, y, color, brushSize, name }) => {
        const userId = [...cursors.entries()].find(([id, info]) => info.name === (name || 'Unknown'))?.[0];
        if (userId) {
            const cursorInfo = cursors.get(userId);
            if (cursorInfo) {
                cursorInfo.isDrawing = true;
                updateCursorPosition(userId, x, y, name || 'Unknown');
            }
        }
        drawDot(x, y, color, brushSize);
        drawingHistory.push({ type: "BRUSH", points: [{ x, y, color, brushSize, name: name || 'Unknown' }] });
        redoStack = [];
    });

    socket.on('addText', ({ x, y, text, font, name }) => {
        const textBox = document.createElement("div");
        textBox.innerText = text;
        textBox.style.position = "absolute";
        textBox.style.left = `${x}px`;
        textBox.style.top = `${y}px`;
        textBox.style.fontFamily = font;
        textBox.style.padding = "5px";
        textBox.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
        textBox.style.color = "#000";
        drawingArea.appendChild(textBox);
        drawingHistory.push({ type: "TEXT", x, y, text, font, name: name || 'Unknown' });
        redoStack = [];
    });

    socket.on('clearCanvas', () => {
        drawingArea.innerHTML = "";
        drawingHistory = [];
        redoStack = [];
    });

    socket.on('userJoined', ({ userId, name }) => {
        const cursor = document.createElement("div");
        cursor.classList.add("user-cursor");
        cursor.dataset.userId = userId;

        const label = document.createElement("div");
        label.classList.add("cursor-label");
        label.textContent = name || 'Unknown';
        cursor.appendChild(label);

        drawingArea.appendChild(cursor);
        cursors.set(userId, { cursor, name: name || 'Unknown', isDrawing: false });
    });

    socket.on('userLeft', ({ userId }) => {
        const cursorInfo = cursors.get(userId);
        if (cursorInfo) {
            cursorInfo.cursor.remove();
            cursors.delete(userId);
        }
    });

    colorSwatches.forEach(swatch => {
        swatch.addEventListener("click", () => {
            colorSwatches.forEach(s => s.classList.remove("selected"));
            swatch.classList.add("selected");
            color = swatch.style.backgroundColor;
            isTextMode = false;
            updateCursor();
            textModeBtn?.classList.remove("active");
        });
    });

    brushSizeSlider?.addEventListener("input", () => {
        brushSize = parseInt(brushSizeSlider.value, 10);
        isTextMode = false;
        updateCursor();
        textModeBtn?.classList.remove("active");
    });

    fontSelect?.addEventListener("change", () => {
        currentFont = fontSelect.value;
    });

    function recordPoint(x, y, c = color, size = brushSize) {
        const point = { x, y, color: c, brushSize: size };
        currentStroke.push(point);
        drawDot(x, y, c, size);
        socket.emit('drawPoint', { canvasId: currentCanvasId, x, y, color: c, brushSize: size });
    }

    function drawDot(x, y, dotColor, dotSize) {
        const dot = document.createElement("div");
        dot.classList.add("brush-dot");
        dot.style.width = `${dotSize}px`;
        dot.style.height = `${dotSize}px`;
        dot.style.borderRadius = "50%";
        dot.style.backgroundColor = dotColor;
        dot.style.position = "absolute";
        dot.style.left = `${x - dotSize / 2}px`;
        dot.style.top = `${y - dotSize / 2}px`;
        drawingArea.appendChild(dot);
    }

    drawingArea?.addEventListener("mousedown", (e) => {
        if (!isTextMode) {
            drawing = true;
            lastPosition = { x: e.clientX, y: e.clientY - toolbarHeight };
            currentStroke = [];
            recordPoint(e.clientX, e.clientY - toolbarHeight);
        }
    });

    ["mouseup", "mouseleave"].forEach(eventType => {
        drawingArea?.addEventListener(eventType, () => {
            drawing = false;
            lastPosition = { x: null, y: null };
            if (currentStroke.length > 0) {
                drawingHistory.push({ type: "BRUSH", points: [...currentStroke] });
                redoStack = [];
            }
            currentStroke = [];
            cursors.forEach((cursorInfo, userId) => {
                cursorInfo.isDrawing = false;
                updateCursorPosition(userId, parseInt(cursorInfo.cursor.style.left), parseInt(cursorInfo.cursor.style.top), cursorInfo.name);
            });
        });
    });

    drawingArea?.addEventListener("mousemove", (e) => {
        const x = e.clientX;
        const y = e.clientY - toolbarHeight;
        socket.emit('cursorMove', { canvasId: currentCanvasId, x, y, userId: socket.id });

        if (!drawing || isTextMode) return;

        const currentPosition = { x, y };
        if (lastPosition.x !== null && lastPosition.y !== null) {
            drawSmoothLine(lastPosition.x, lastPosition.y, currentPosition.x, currentPosition.y, color, brushSize);
        }
        lastPosition = currentPosition;
    });

    function drawSmoothLine(startX, startY, endX, endY, c, size) {
        const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const steps = Math.max(1, Math.floor(distance / (size / 4)));

        for (let i = 0; i <= steps; i++) {
            const x = startX + (endX - startX) * (i / steps);
            const y = startY + (endY - startY) * (i / steps);
            recordPoint(x, y, c, size);
        }
    }

    clearBtn?.addEventListener("click", () => {
        drawingArea.innerHTML = "";
        drawingHistory = [];
        redoStack = [];
        isTextMode = false;
        updateCursor();
        textModeBtn?.classList.remove("active");
        socket.emit('clearCanvas', currentCanvasId);
    });

    textModeBtn?.addEventListener("click", () => {
        isTextMode = !isTextMode;
        textModeBtn.classList.toggle("active", isTextMode);
        updateCursor();
    });

    drawingArea?.addEventListener("click", (e) => {
        if (isTextMode) {
            createTextInput(e.clientX, e.clientY - toolbarHeight, currentFont);
        }
    });

    function createTextInput(x, y, font) {
        const textBox = document.createElement("div");
        textBox.contentEditable = true;
        textBox.style.position = "absolute";
        textBox.style.left = `${x}px`;
        textBox.style.top = `${y}px`;
        textBox.style.padding = "5px";
        textBox.style.zIndex = 100;
        textBox.style.fontFamily = font;
        textBox.style.border = "none";
        drawingArea.appendChild(textBox);
        textBox.focus();

        textBox.addEventListener("blur", () => {
            const text = textBox.innerText;
            if (text) {
                drawingHistory.push({
                    type: "TEXT",
                    x: parseFloat(textBox.style.left),
                    y: parseFloat(textBox.style.top),
                    text,
                    font
                });
                redoStack = [];
                socket.emit('addText', { canvasId: currentCanvasId, x, y, text, font });
            }
            textBox.contentEditable = false;
        });

        textBox.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                textBox.blur();
                event.preventDefault();
            }
        });
    }

    function updateCursor() {
        drawingArea.style.cursor = isTextMode ? "text" : "crosshair";
    }

    function updateCursorPosition(userId, x, y, name) {
        let cursorInfo = cursors.get(userId);
        if (!cursorInfo) {
            cursorInfo = { cursor: document.createElement("div"), name, isDrawing: false };
            cursorInfo.cursor.classList.add("user-cursor");
            cursorInfo.cursor.dataset.userId = userId;

            const label = document.createElement("div");
            label.classList.add("cursor-label");
            label.textContent = name;
            cursorInfo.cursor.appendChild(label);

            drawingArea.appendChild(cursorInfo.cursor);
            cursors.set(userId, cursorInfo);
        }
        cursorInfo.cursor.style.left = `${x}px`;
        cursorInfo.cursor.style.top = `${y}px`;

        const label = cursorInfo.cursor.querySelector(".cursor-label");
        label.style.display = cursorInfo.isDrawing ? 'block' : 'none';

        if (cursorInfo.isDrawing) {
            const labelRect = label.getBoundingClientRect();
            const cursorRect = cursorInfo.cursor.getBoundingClientRect();
            if (y < 50) {
                label.style.top = '15px';
            } else {
                label.style.top = '-25px';
            }
            if (x > window.innerWidth - labelRect.width - 10) {
                label.style.left = 'auto';
                label.style.right = '0';
                label.style.transform = 'none';
            } else {
                label.style.left = '50%';
                label.style.right = 'auto';
                label.style.transform = 'translateX(-50%)';
            }
        }
    }

    function redrawDrawing() {
        drawingArea.innerHTML = "";
        cursors.forEach(cursorInfo => drawingArea.appendChild(cursorInfo.cursor));
        drawingHistory.forEach(item => {
            if (item.type === "BRUSH") {
                item.points.forEach(point => {
                    drawDot(point.x, point.y, point.color, point.brushSize);
                });
            } else if (item.type === "TEXT") {
                const textBox = document.createElement("div");
                textBox.innerText = item.text;
                textBox.style.position = "absolute";
                textBox.style.left = `${item.x}px`;
                textBox.style.top = `${item.y}px`;
                textBox.style.fontFamily = item.font;
                textBox.style.padding = "5px";
                textBox.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                textBox.style.color = "#000";
                drawingArea.appendChild(textBox);
            }
        });
    }

    function undoLast() {
        if (drawingHistory.length === 0) return;
        const last = drawingHistory.pop();
        redoStack.push(last);
        redrawDrawing();
    }

    function redoLast() {
        if (redoStack.length === 0) return;
        const item = redoStack.pop();
        drawingHistory.push(item);
        redrawDrawing();
    }

    undoBtn?.addEventListener("click", undoLast);
    redoBtn?.addEventListener("click", redoLast);

    downloadBtn?.addEventListener("click", () => {
        html2canvas(drawingArea).then(canvas => {
            const link = document.createElement("a");
            link.download = "canvas.png";
            link.href = canvas.toDataURL();
            link.click();
        });
    });

    function setCurrentCanvas(id) {
        currentCanvasId = id;
    }

    async function saveDrawingToBackend() {
        if (!currentCanvasId) {
            alert('No canvas selected to save to.');
            return;
        }

        const transformedData = drawingHistory.map(item => {
            if (item.type === "BRUSH") {
                return {
                    type: "BRUSH",
                    points: item.points
                };
            } else if (item.type === "TEXT") {
                return {
                    type: "TEXT",
                    x: item.x,
                    y: item.y,
                    text: item.text,
                    font: item.font
                };
            }
        });

        try {
            const response = await fetch(`http://localhost:3000/canvas/${currentCanvasId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ elements: transformedData })
            });

            if (response.ok) {
                alert(`Drawing saved to canvas ID: ${currentCanvasId}`);
            } else {
                const errorText = await response.text();
                alert(`Failed to save drawing: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            alert('Network error occurred while saving.');
            console.error(error);
        }
    }

    async function loadDrawingFromBackend(canvasId) {
        try {
            const response = await fetch(`http://localhost:3000/canvas/load/${canvasId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const canvasData = await response.json();
                if (canvasData?.elements) {
                    drawingHistory = canvasData.elements;
                    canvasNameEl.textContent = canvasData.name;
                    redrawDrawing();
                    setCurrentCanvas(canvasId);
                } else {
                    alert(`No drawing data found for canvas ID: ${canvasId}`);
                }
            } else {
                const errorText = await response.text();
                alert(`Failed to load drawing: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error(error);
            alert('Network error occurred while loading.');
        }
    }

    saveBtn?.addEventListener("click", saveDrawingToBackend);
    updateCursor();
});