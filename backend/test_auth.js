const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  console.log("=== STARTING AUTH & VALIDATION TESTS ===");
  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testPassword = 'securepassword123';

  // 1. Validation check - Short Password
  console.log("\n1. Testing Registration Validation (Short Password)...");
  const badRegister = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Test', email: testEmail, phone: '1234567890', password: '123' });
  console.log("Status:", badRegister.status);
  console.log("Message:", badRegister.data.message);
  console.log("Validations list:", badRegister.data.errors);

  // 2. Successful Registration
  console.log("\n2. Testing Registration (Valid Credentials)...");
  const registerRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { name: 'Auth User', email: testEmail, phone: '1234567890', password: testPassword });
  console.log("Status:", registerRes.status);
  console.log("Register Success:", registerRes.data.success);
  console.log("Token Issued:", !!registerRes.data.token);

  // 3. Successful Login
  console.log("\n3. Testing Login...");
  const loginRes = await request({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testEmail, password: testPassword });
  console.log("Status:", loginRes.status);
  console.log("Login Success:", loginRes.data.success);
  const token = loginRes.data.token;
  console.log("Token length:", token ? token.length : 0);

  // 4. Test unauthorized request (No Token)
  console.log("\n4. Testing GET /api/profile/:email without Authorization header...");
  const noTokenRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/profile/${testEmail}`, method: 'GET'
  });
  console.log("Status:", noTokenRes.status);
  console.log("Error Message:", noTokenRes.data.message);

  // 5. Test authorized request (With Token)
  console.log("\n5. Testing GET /api/profile/:email WITH Authorization token...");
  const tokenRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/profile/${testEmail}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log("Status:", tokenRes.status);
  console.log("Returned profile email:", tokenRes.data.email);

  // 6. Test calculation input validation (Negative Weight)
  console.log("\n6. Testing POST /api/calculate validation (Negative value)...");
  const badCalc = await request({
    hostname: 'localhost', port: 5000, path: '/api/calculate', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { plastic: -5 });
  console.log("Status:", badCalc.status);
  console.log("Message:", badCalc.data.message);

  // 7. Test calculation success
  console.log("\n7. Testing POST /api/calculate success...");
  const goodCalc = await request({
    hostname: 'localhost', port: 5000, path: '/api/calculate', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  }, { plastic: 5, paper: 2 });
  console.log("Status:", goodCalc.status);
  console.log("Earned Points:", goodCalc.data.earned);

  // Cleanup test user
  console.log("\n=== CLEANING UP TEST DATA ===");
  const cleanRes = await request({
    hostname: 'localhost', port: 5000, path: `/api/profile/${testEmail}`, method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (cleanRes.status === 200) {
    // Import and delete
    const mongoose = require('mongoose');
    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URI);
    const User = require('./models/User');
    await User.deleteOne({ email: testEmail });
    console.log("🧹 Test user document deleted successfully.");
    await mongoose.disconnect();
  }
}

test().catch(console.error);
