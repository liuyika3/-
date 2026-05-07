const http = require('http');

async function test(kw) {
    return new Promise((resolve) => {
        const req = http.request('http://localhost:3456/api/food', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        }, res => {
            let data = '';
            res.on('data', c => data+=c);
            res.on('end', () => {
                const p = JSON.parse(data);
                console.log(`[${kw}] -> ${p.products ? p.products.length : 'error'}`);
                resolve();
            });
        });
        req.write(JSON.stringify({keyword: kw}));
        req.end();
    });
}

(async () => {
    await test('Coca-Cola');
    await test('Oreo');
    await test('Oatly oat milk');
    await test('Kind bar');
    await test('Greek yogurt');
})();
