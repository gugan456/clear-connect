const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function test() {
    console.log("Starting API Tests...");

    // 1. Create Profile
    const profileData = {
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890"
    };

    const createRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/profile',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, profileData);

    console.log("Create Profile:", createRes.success ? "PASS" : "FAIL");

    // 2. Add Points
    const calcData = {
        email: "test@example.com",
        plastic: 5,
        paper: 2
    };

    const calcRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/calculate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, calcData);

    console.log("Add Points:", calcRes.success ? "PASS" : "FAIL");
    console.log("Points Earned:", calcRes.earned);

    // 3. Verify Profile
    const getRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/profile/test@example.com',
        method: 'GET'
    });

    console.log("Verify Profile:", getRes.greenPoints === 70 ? "PASS" : "FAIL", `(Points: ${getRes.greenPoints})`);
}

test().catch(console.error);
