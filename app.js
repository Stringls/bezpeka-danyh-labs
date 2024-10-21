let users = {};
const USERS_FILE_NAME = 'users.json';
let attempts = 0; 
let currentUser = ''; 
let registrationLogs = [];
let actionLogs = [];
let currentCaptcha = {};
let captchas = []; 

async function init() {
    try {
        const response = await fetch(USERS_FILE_NAME);
        if (!response.ok) throw new Error('File not found');
        users = await response.json();
    } catch (error) {
        users = {
            'ADMIN': {
                password: '',
                locked: false,
                restrictions: false
            }
        };
        await saveUsers();
    }
    captchas = await loadCaptchas(); 
    reloadCaptcha(); 
}

function generateNoise(canvas, width, height) {
    const ctx = canvas.getContext('2d');
    
    
    ctx.globalAlpha = 0.5; 

    for (let i = 0; i < 500; i++) { 
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
        ctx.fillRect(x, y, 2, 2); 
    }
}

async function loadCaptchas() {
    try {
        const response = await fetch('captchas.json'); 
        const data = await response.json();
        return data.captchas;
    } catch (error) {
        console.error('Error loading CAPTCHA data:', error);
        return []; 
    }
}

function reloadCaptcha() {
    if (captchas.length > 0) {
        const randomIndex = Math.floor(Math.random() * captchas.length);
        currentCaptcha = captchas[randomIndex];
        const captchaWidth = 300;
        const captchaHeight = 100;
        const noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = captchaWidth;
        noiseCanvas.height = captchaHeight;
        generateNoise(noiseCanvas, captchaWidth, captchaHeight);
        const captchaContainer = document.getElementById('captcha-container');
        captchaContainer.innerHTML = ''; 
        const captchaImage = new Image();
        captchaImage.src = currentCaptcha.image;
        captchaImage.style.position = 'absolute';
        captchaImage.style.top = '0';
        captchaImage.style.left = '0';
        captchaImage.style.width = '100%';
        captchaImage.style.height = '100%';
        captchaImage.style.pointerEvents = 'none'; 
        captchaContainer.appendChild(captchaImage); 

        const noiseImage = new Image();
        noiseImage.src = noiseCanvas.toDataURL(); 
        noiseImage.style.position = 'absolute';
        noiseImage.style.top = '0';
        noiseImage.style.left = '0';
        noiseImage.style.width = '100%';
        noiseImage.style.height = '100%';
        noiseImage.style.pointerEvents = 'none'; 
        captchaContainer.appendChild(noiseImage); 
        document.getElementById('captchaAnswer').value = '';
    }
}



function logEvent(event) {
    const timestamp = new Date().toISOString();
    actionLogs.push(`[${timestamp}] ${event}`);
    saveLogs();
}

async function saveLogs() {
    const blob = new Blob([JSON.stringify(actionLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'actionLogs.json';
    a.click();
    URL.revokeObjectURL(url);
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const captchaAnswer = document.getElementById('captchaAnswer').value.toLowerCase();
    
    if (!currentCaptcha) {
        showMessage('CAPTCHA не завантажено. Спробуйте оновити сторінку.');
        return;
    }

    if (captchaAnswer !== currentCaptcha.answer.toLowerCase()) {
        showMessage('Неправильна відповідь на CAPTCHA.');
        reloadCaptcha(); 
        return;
    }
    
    const user = users[username];

    const checkPassword = () => {
        if (user && !user.locked) {
            if (user.password === password) {
                document.getElementById('message').textContent = '';
                logEvent(`${username} увійшов до системи`); 
                registrationLogs.push(`${username} увійшов`);
                if (username === 'ADMIN') {
                    document.getElementById('admin-panel').style.display = 'block';
                    document.getElementById('login').style.display = 'none';
                    currentUser = username; 
                } else {
                    document.getElementById('user-panel').style.display = 'block';
                    document.getElementById('login').style.display = 'none';
                    currentUser = username; 
                }
            } else {
                attempts++;
                showMessage('Неправильний пароль. Спробуйте ще раз.');
                if (attempts == 3) {
                    document.getElementById('username').value = '';
                    document.getElementById('password').value = '';
                    showMessage('Забагато спроб. Програма завершена!');
                    logout();
                    attempts = 0;
                }
            }
        } else {
            showMessage('Користувача не знайдено або він заблокований.');
        }
    };

    checkPassword();
}

function showMessage(message) {
    document.getElementById('message').textContent = message;
}

function logout() {
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('user-panel').style.display = 'none';
    document.getElementById('login').style.display = 'block';
    logEvent(`${currentUser} вийшов з системи`); 
    registrationLogs.push(`${currentUser} вийшов`); 
}

function viewLogs() {
    const registrationLogsDisplay = registrationLogs.join('\n');
    alert(`Реєстраційний журнал:\n${registrationLogsDisplay}`);
}

function closeLogsModal() {
    document.getElementById('logsModal').style.display = 'none';
}

function viewActionLogs() {
    const actionLogsDisplay = actionLogs.join('\n');
    alert(`Операційний журнал:\n${actionLogsDisplay}`);
}

function closeActionLogsModal() {
    document.getElementById('actionLogsModal').style.display = 'none';
}

function openChangePasswordModal() {
    document.getElementById('myModal').style.display = "block";
}

function closeModal() {
    document.getElementById('myModal').style.display = "none";
}

async function confirmChangePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    if (users[currentUser].password !== oldPassword) {
        alert('Старий пароль невірний.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Паролі не співпадають. Спробуйте ще раз.');
        return;
    }

    if (users[currentUser].restrictions) {
        const hasNumber = /\d/; 
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/; 
        
        if (!hasNumber.test(newPassword) || !hasSpecialChar.test(newPassword)) {
            alert('Пароль повинен містити принаймні одну цифру та один спеціальний символ.');
            return;
        }
    }

    if (newPassword && confirmPassword) {
        users[currentUser].password = newPassword; 
        await saveUsers();
        alert('Пароль успішно змінено.');
        logEvent(`Користувач ${currentUser} змінив пароль`);
        closeModal(); 
        clearModalFields(); 
    }
}

function clearModalFields() {
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
}

async function saveUsers() {
    const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = USERS_FILE_NAME;
    a.click();
    URL.revokeObjectURL(url);
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none'; 
}

function viewUsers() {
    const userListElement = document.getElementById('userList');
    userListElement.innerHTML = '';
    const tableHeader = `
        <tr>
            <th>Ім'я користувача</th>
            <th>Пароль</th>
            <th>Заблокований</th>
            <th>Обмеження</th>
        </tr>`;
    userListElement.innerHTML = tableHeader;
    for (const [username, userData] of Object.entries(users)) {
        const row = `
            <tr>
                <td>${username}</td>
                <td>${userData.password ? '********' : '(Не встановлений)'}</td>
                <td>${userData.locked ? 'Так' : 'Ні'}</td>
                <td>${userData.restrictions ? 'Так' : 'Ні'}</td>
            </tr>`;
        userListElement.innerHTML += row;
    }
    document.getElementById('userModal').style.display = 'block';
}

function addUser() {
    const newUsername = prompt('Введіть ім\'я нового користувача:');
    if (newUsername && !users[newUsername]) {
        users[newUsername] = { password: '', locked: false, restrictions: false };
        saveUsers(); 
        alert('Користувача успішно додано.');
        logEvent(`Адміністратор додав користувача ${newUsername}.`);
    } else {
        alert('Користувач з таким ім\'ям вже існує або ім\'я не введено.');
    }
}

function lockUser() {
    const username = prompt('Введіть ім\'я користувача для блокування:');
    if (users[username]) {
        users[username].locked = true;
        saveUsers(); 
        alert(`Користувача ${username} успішно заблоковано.`);
        logEvent(`Адміністратор заблокував користувача ${username}.`);
    } else {
        alert('Користувача не знайдено.');
    }
}

function toggleRestrictions() {
    const username = prompt('Введіть ім\'я користувача для зміни обмежень:');
    if (users[username]) {
        users[username].restrictions = !users[username].restrictions;
        saveUsers(); 
        const status = users[username].restrictions ? 'включено' : 'вимкнено';
        alert(`Обмеження для користувача ${username} ${status}.`);
        logEvent(`Адміністратор встановив обмеження для користувача ${username}.`);
    } else {
        alert('Користувача не знайдено.');
    }
}

function showHelp() {
    const helpMenu = document.getElementById('helpMenu');
    helpMenu.style.display = helpMenu.style.display === 'none' ? 'block' : 'none';
}

function showAbout() {
    document.getElementById('aboutModal').style.display = "block";
}

function closeAbout() {
    document.getElementById('aboutModal').style.display = "none";
}

window.onload = init;
