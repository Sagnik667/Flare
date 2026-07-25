import http from 'http';

const url = 'http://localhost:5000/uploads/7b9048789b2a0d4992e5c1806e306e93.png';

http.get(url, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
  
  let data = [];
  res.on('data', (chunk) => {
    data.push(chunk);
  });
  
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    console.log(`Body Length: ${buffer.length} bytes`);
    if (buffer.length > 0) {
      console.log('First 20 bytes:', buffer.slice(0, 20).toString('hex'));
    }
  });
}).on('error', (err) => {
  console.error('Error fetching file:', err.message);
});
