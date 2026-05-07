const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'api.figma.com',
  path: '/v1/files/BFC2j6mZ9HSwGDC8tkCQRd/nodes?ids=9882-17474',
  headers: {
    'X-Figma-Token': 'figd_itBU8FyvWtbQEOuCEbHLQAHfJVYyHwrTgCHwAUlZ'
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('figma_response.json', data);
    console.log('Done');
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
