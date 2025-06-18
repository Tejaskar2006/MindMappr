// login.js
const popup = document.getElementById('popup');
const popupMessage = document.getElementById('popup-message');
const closeButton = document.querySelector('.close-button');
const loginForm = document.getElementById('loginForm');

function showPopup(message) {
    popupMessage.textContent = message;
    popup.style.display = 'block';
}

function hidePopup() {
    popup.style.display = 'none';
}

if (closeButton) {
    closeButton.addEventListener('click', hidePopup);
}

window.addEventListener('click', function (event) {
    if (event.target === popup) {
        hidePopup();
    }
});

if (loginForm) {
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const userData = { email, password };

        try {
            const response = await fetch('https://mindmappr-tnvr.onrender.com/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const result = await response.json();

            if (response.ok && result.token) {
                localStorage.setItem('token', result.token);
                showPopup('Login successful!');
                setTimeout(() => {
                    window.location.href = '../profile/profile.html';
                }, 1500);
            } else {
                showPopup(result.error || 'Login failed. Try again.');
            }
        } catch (error) {
            console.error('Login error:', error);
            showPopup('Something went wrong. Try again later.');
        }
    });
}