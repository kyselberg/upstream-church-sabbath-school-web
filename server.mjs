import { createServer } from 'node:http';
import sirv from 'sirv';

const serve = sirv('dist/client', {
  single: true,
  etag: true,
  setHeaders(res, pathname) {
    res.setHeader(
      'Cache-Control',
      pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    );
  },
});

const port = process.env.PORT || 3000;
createServer((req, res) => serve(req, res)).listen(port, '0.0.0.0', () => {
  console.log(`listening on ${port}`);
});
