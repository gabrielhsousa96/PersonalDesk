// static/register.js

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.querySelector('form');
    const registerError = document.getElementById('registerError');
    const passwordError = document.getElementById('passwordError');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous errors
            registerError.classList.add('hidden');
            passwordError.classList.add('hidden');

            const full_name = document.getElementById('regFullName').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const area_code = document.getElementById('regAreaCode').value.trim();
            const phone = document.getElementById('regPhone').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirm_password = document.getElementById('regConfirmPassword').value;
            const accepts_email_notifications = document.getElementById('regNotifications').checked;

            if (password !== confirm_password) {
                passwordError.classList.remove('hidden');
                return;
            }

            const payload = {
                username,
                password,
                full_name,
                email,
                area_code,
                phone,
                accepts_email_notifications
            };

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    // Redirect to login page upon successful registration
                    window.location.href = '/login';
                } else {
                    const data = await response.json();
                    registerError.textContent = data.detail || 'Ocorreu um erro no registro. Tente novamente.';
                    registerError.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Registration error:', error);
                registerError.textContent = 'Erro ao conectar no servidor.';
                registerError.classList.remove('hidden');
            }
        });
    }
});
