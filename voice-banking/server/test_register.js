const register = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test',
                age: 30,
                phone: '1111111111',
                pin: '1234',
                voicePassphrase: 'test voice passphrase'
            })
        });
        const data = await res.json();
        console.log('Register response:', res.status, data);
    } catch (error) {
        console.error('Register error:', error);
    }
};

register();
