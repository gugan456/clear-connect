const fetch = require('node-fetch');

async function test() {
  const res = await fetch('http://localhost:5000/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'guganr23@gmail.com', plastic: 10 })
  });
  const data = await res.json();
  console.log(data);
}
test();
