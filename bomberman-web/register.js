async function handleRegistration() {
    const nicknameInput = document.getElementById('nickname-input');
    const registerButton = document.getElementById('register-btn');
    const errorMessageDiv = document.getElementById('error-message');
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
        errorMessageDiv.textContent = 'Nickname cannot be empty.';
        return;
    }

    errorMessageDiv.textContent = ''; // Clear previous errors
    registerButton.disabled = true;
    nicknameInput.disabled = true;

    try {
        const res = await fetch('http://localhost:8080/api/game/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname })
        });

        const data = await res.json();

        if (res.status === 200 && data.playerID) {
            localStorage.setItem('bomberman_currentPlayerID', data.playerID);
            localStorage.setItem('bomberman_currentNickname', nickname);
            window.location.href = 'index.html'; // Redirect to lobby/game page
        } else {
            errorMessageDiv.textContent = data.error || 'Failed to register. Please try again.';
            registerButton.disabled = false;
            nicknameInput.disabled = false;
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorMessageDiv.textContent = 'An error occurred during registration. Check console for details.';
        registerButton.disabled = false;
        nicknameInput.disabled = false;
    }
}

document.getElementById('register-btn').addEventListener('click', handleRegistration);
document.getElementById('nickname-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleRegistration();
    }
});