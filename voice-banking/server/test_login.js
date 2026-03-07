const login = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/auth/login/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: '1111111111',
                voicePassphrase: 'test voice passphrase'
            })
        });
        const data = await res.json();
        console.log('Login response:', res.status, data);
    } catch (error) {
        console.error('Login error:', error);
    }
};

login();
