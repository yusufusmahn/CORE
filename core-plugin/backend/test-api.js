const http = require('http');

// Read the test contract
const fs = require('fs');
const contractCode = fs.readFileSync('./test-contract.move', 'utf8');

// Test the API
const postData = JSON.stringify({
  code: contractCode
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/analyze',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.write(postData);
req.end();