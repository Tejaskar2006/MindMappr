document.addEventListener('DOMContentLoaded', () => {
    const profileNameEl = document.getElementById('profile-name');
    const canvasListEl = document.getElementById('canvas-list');
    const noCanvasesEl = document.getElementById('no-canvases');
    const errorEl = document.getElementById('error');
    const createCanvasBtn = document.getElementById('createCanvasBtn');
    const newCanvasNameEl = document.getElementById('newCanvasName');
    const logoutBtn = document.getElementById('logoutBtn');

    const token = localStorage.getItem('token');

    if (!token) {
        errorEl.textContent = 'Unauthorized. Please log in.';
        window.location.href = '../login/login.html';
        return;
    }

    // Logout functionality
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '../login/login.html';
    });

    async function fetchProfile() {
        try {
            errorEl.textContent = '';
            const response = await fetch('https://mindmappr-tnvr.onrender.com/users/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch profile');
            profileNameEl.textContent = `Hello, ${data.user?.name || 'User'}!`;
        } catch (err) {
            errorEl.textContent = err.message;
            console.error(err);
        }
    }

    async function fetchCanvases() {
        try {
            errorEl.textContent = '';
            const response = await fetch('https://mindmappr-tnvr.onrender.com/canvas', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch canvases');
            setCanvases(data);
        } catch (err) {
            errorEl.textContent = err.message;
            console.error(err);
        }
    }

    async function renameCanvas(canvasId, newName, cardEl) {
        try {
            const response = await fetch(`https://mindmappr-tnvr.onrender.com/canvas/updatename/${canvasId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Rename failed');
            cardEl.querySelector('h4').textContent = newName;
            cardEl.querySelector('.rename-section').style.display = 'none';
            cardEl.querySelector('.rename-button').textContent = 'Rename';
        } catch (err) {
            errorEl.textContent = err.message;
        }
    }

    async function deleteCanvas(canvasId) {
        if (!confirm('Are you sure you want to delete this canvas?')) return;
        try {
            const response = await fetch(`https://mindmappr-tnvr.onrender.com/canvas/${canvasId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Delete failed');
            fetchCanvases();
        } catch (err) {
            errorEl.textContent = err.message;
            console.error(err);
        }
    }

    function setCanvases(canvases) {
        canvasListEl.innerHTML = '';
        if (!canvases || canvases.length === 0) {
            noCanvasesEl.style.display = 'block';
            return;
        }
        noCanvasesEl.style.display = 'none';

        canvases.forEach(canvas => {
            const card = document.createElement('div');
            card.classList.add('canvas-card');
            const sharedBy = canvas.isShared ? (canvas.shared_by?.name || canvas.shared_by?.email || 'Unknown') : 'You';
            const sharedWith = canvas.shared_with.length > 0
                ? canvas.shared_with.map(u => u.name || u.email).join(', ')
                : 'None';
            card.innerHTML = `
                <h4>${canvas.name}</h4>
                <p><strong>Shared by:</strong> ${sharedBy}</p>
                <p><strong>Shared with:</strong> ${sharedWith}</p>
                <p><strong>Created:</strong> ${new Date(canvas.createdAt).toLocaleString()}</p>
                <p><strong>Updated:</strong> ${new Date(canvas.updatedAt).toLocaleString()}</p>
                <div class="button-group">
                    <button class="open-button">Open Canvas</button>
                    <button class="share-button">Share</button>
                    ${canvas.isShared ? '' : '<button class="delete-button">Delete</button>'}
                    ${canvas.isShared ? '' : '<button class="rename-button">Rename</button>'}
                </div>
                <div class="share-section" style="display:none;">
                    <input type="email" placeholder="Enter email to share">
                    <button>Share</button>
                </div>
                <div class="rename-section" style="display:none;">
                    <input type="text" placeholder="Enter new name" class="rename-input" value="${canvas.name}">
                    <button class="confirm-rename-button">Rename</button>
                </div>
            `;

            card.querySelector('.open-button').addEventListener('click', () => {
                window.location.href = `../canvas/index.html?id=${canvas._id}`;
            });

            if (!canvas.isShared) {
                const shareBtn = card.querySelector('.share-button');
                const shareSection = card.querySelector('.share-section');
                const shareInput = shareSection.querySelector('input');
                const confirmShareBtn = shareSection.querySelector('button');
                shareBtn.addEventListener('click', () => {
                    shareSection.style.display = shareSection.style.display === 'none' ? 'flex' : 'none';
                    shareBtn.textContent = shareSection.style.display === 'none' ? 'Share' : 'Cancel';
                });
                confirmShareBtn.addEventListener('click', async () => {
                    const email = shareInput.value.trim();
                    if (!email) {
                        errorEl.textContent = 'Please enter a valid email';
                        return;
                    }
                    try {
                        const response = await fetch(`https://mindmappr-tnvr.onrender.com/canvas/share/${canvas._id}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ shared_with: email })
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error || 'Share failed');
                        errorEl.textContent = `Canvas shared with ${email}`;
                        shareSection.style.display = 'none';
                        shareBtn.textContent = 'Share';
                        shareInput.value = '';
                        fetchCanvases();
                    } catch (err) {
                        errorEl.textContent = err.message;
                    }
                });

                const renameBtn = card.querySelector('.rename-button');
                const renameSection = card.querySelector('.rename-section');
                const renameInput = renameSection.querySelector('input');
                const confirmRenameBtn = renameSection.querySelector('.confirm-rename-button');
                renameBtn.addEventListener('click', () => {
                    renameSection.style.display = renameSection.style.display === 'none' ? 'flex' : 'none';
                    renameBtn.textContent = renameSection.style.display === 'none' ? 'Rename' : 'Cancel';
                });
                confirmRenameBtn.addEventListener('click', () => {
                    const newName = renameInput.value.trim();
                    if (!newName) {
                        errorEl.textContent = 'Enter a new name';
                        return;
                    }
                    renameCanvas(canvas._id, newName, card);
                });

                card.querySelector('.delete-button').addEventListener('click', () => {
                    deleteCanvas(canvas._id);
                });
            }

            canvasListEl.appendChild(card);
        });
    }

    createCanvasBtn.addEventListener('click', async () => {
        const name = newCanvasNameEl.value.trim();
        if (!name) {
            errorEl.textContent = 'Please enter a canvas name';
            return;
        }
        try {
            const response = await fetch('https://mindmappr-tnvr.onrender.com/canvas', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create canvas');
            newCanvasNameEl.value = '';
            fetchCanvases();
        } catch (err) {
            errorEl.textContent = err.message;
        }
    });

    fetchProfile();
    fetchCanvases();
});