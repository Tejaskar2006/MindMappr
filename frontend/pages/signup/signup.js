const popup = document.getElementById('popup');
const popupMessage = document.getElementById('popup-message');
const closeButton = document.querySelector('.close-button');
const signupForm = document.getElementById('signupForm');

function showPopup(message) {
    popupMessage.textContent = message;
    popup.style.display = 'block';
}
function hidePopup() {
    popup.style.display = 'none';
}
closeButton.addEventListener('click', hidePopup);
window.addEventListener('click', function (event) {
    if (event.target === popup) {
        hidePopup();
    }
});
if (signupForm) {
    signupForm.addEventListener('submit', async function (event) { // corrected line
        event.preventDefault();

        const name = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        const userData = { name, email, password };

        try {
            const response = await fetch('http://localhost:3000/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const result = await response.json();

            if (response.ok && result.token) {
                localStorage.setItem('token', result.token);
                showPopup('Signup successful! Please log in.');
                setTimeout(() => {
                    window.location.href = '../login/login.html';
                }, 1500);
            } else {
                showPopup(result.error || 'Signup failed. Try again.');
            }
        } catch (error) {
            console.error('Signup error:', error);
            showPopup('Something went wrong. Try again later.');
        }
    });
}
