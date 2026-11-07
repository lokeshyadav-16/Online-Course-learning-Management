/* =========================================================
   Online Course Learning Management System - Auth Logic
   Project Owner: Lokesh Yadav
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');

    const showAlert = (message, type = 'danger') => {
        if (!authAlert) return;
        authAlert.className = `alert alert-${type}`;
        authAlert.innerHTML = `<span>${type === 'danger' ? '⚠️' : '✓'}</span> <span>${message}</span>`;
        authAlert.classList.remove('d-none');
    };

    const clearAlert = () => {
        if (authAlert) {
            authAlert.className = 'alert d-none';
            authAlert.innerHTML = '';
        }
    };

    // 1. Check URL Parameters for Messages (e.g. Logout, Unauthorized access)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
        showAlert('You have successfully signed out.', 'success');
    } else if (urlParams.get('error') === 'unauthorized') {
        showAlert('🔒 Please sign in to access your course dashboard.', 'danger');
    } else if (urlParams.get('error') === 'instructor_only') {
        showAlert('⛔ Access Denied: The Instructor Studio is restricted to Instructor accounts.', 'danger');
    }

    // 2. Quick Demo Fill Buttons
    const demoStudentBtn = document.getElementById('demoStudentBtn');
    const demoInstructorBtn = document.getElementById('demoInstructorBtn');

    if (demoStudentBtn) {
        demoStudentBtn.addEventListener('click', () => {
            clearAlert();
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput) {
                emailInput.value = 'sarah.jenkins@example.com';
                passwordInput.value = 'Password123';
                emailInput.focus();
            }
        });
    }

    if (demoInstructorBtn) {
        demoInstructorBtn.addEventListener('click', () => {
            clearAlert();
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            if (emailInput && passwordInput) {
                emailInput.value = 'lokesh.yadav@example.com';
                passwordInput.value = 'Password123';
                emailInput.focus();
            }
        });
    }

    // Email validation helper
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
    };

    // 3. Handle Login Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert();

            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const submitBtn = document.getElementById('loginSubmitBtn');

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // Client-side validations
            if (!email) {
                showAlert('Please enter your email address.', 'danger');
                emailInput.focus();
                return;
            }

            if (!isValidEmail(email)) {
                showAlert('Please enter a valid email address format (e.g., name@example.com).', 'danger');
                emailInput.focus();
                return;
            }

            if (!password) {
                showAlert('Please enter your password.', 'danger');
                passwordInput.focus();
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Verifying credentials...';

            // Connect to backend API: POST /api/auth/login
            const res = await apiRequest('/auth/login', 'POST', { email, password });

            if (res.success && res.token && res.user) {
                Auth.setAuth(res.token, res.user);
                showAlert(`Signed in successfully! Redirecting...`, 'success');

                setTimeout(() => {
                    // Check if there was a previous redirect target
                    const redirect = urlParams.get('redirect') || sessionStorage.getItem('redirect_after_login');
                    if (redirect) {
                        sessionStorage.removeItem('redirect_after_login');
                        window.location.href = redirect;
                        return;
                    }

                    // Direct to appropriate role dashboard
                    if (res.user.role === 'instructor') {
                        window.location.href = '/instructor-dashboard.html';
                    } else {
                        window.location.href = '/student-dashboard.html';
                    }
                }, 800);
            } else {
                showAlert(res.message || 'Login failed. Please check your email and password.', 'danger');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In to LearnHub';
            }
        });
    }

    // 4. Handle Registration Form Submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearAlert();

            const nameInput = document.getElementById('name');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const roleInput = document.getElementById('role');
            const submitBtn = document.getElementById('registerSubmitBtn');

            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const role = roleInput.value;

            // Client-side validations
            if (!name || name.length < 2) {
                showAlert('Full Name must be at least 2 characters long.', 'danger');
                nameInput.focus();
                return;
            }

            if (!email || !isValidEmail(email)) {
                showAlert('Please enter a valid email address format (e.g., name@example.com).', 'danger');
                emailInput.focus();
                return;
            }

            if (!password || password.length < 6) {
                showAlert('Password must be at least 6 characters long.', 'danger');
                passwordInput.focus();
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            // Connect to backend API: POST /api/auth/register
            const res = await apiRequest('/auth/register', 'POST', { name, email, password, role });

            if (res.success && res.token && res.user) {
                Auth.setAuth(res.token, res.user);
                showAlert(`Account created successfully as ${role === 'instructor' ? 'Instructor' : 'Student'}! Redirecting...`, 'success');

                setTimeout(() => {
                    if (role === 'instructor') {
                        window.location.href = '/instructor-dashboard.html';
                    } else {
                        window.location.href = '/student-dashboard.html';
                    }
                }, 800);
            } else {
                showAlert(res.message || 'Registration failed. Please verify your details.', 'danger');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Complete Registration';
            }
        });
    }
});
