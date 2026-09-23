const autocannon = require('autocannon');

autocannon({
  url: 'http://localhost:3000',
  connections: 50,
  duration: 10,
  requests: [
    {
      method: 'POST',
      path: '/reservas/x',
      headers: { 'content-type': 'application/json' },
      setupRequest: (req) => {
        const n = Math.floor(Math.random() * 1000000);
        req.path = `/reservas/carga-${n}`;
        req.body = JSON.stringify({ userId: `loadtest-${n}` });
        return req;
      }
    }
  ]
}, (err, result) => {
  if (err) console.error(err);
  console.log(autocannon.printResult(result));
});
