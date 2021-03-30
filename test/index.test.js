import assert from 'assert';
import http from 'http';
import https from 'https';
import { readFileSync } from 'fs';
import relPayment from '../index.js';

const safeKey = readFileSync(new URL('./safe-keypair/local.key', import.meta.url));
const safeCert = readFileSync(new URL('./safe-keypair/local.cert', import.meta.url));
const unsafeKey = readFileSync(new URL('./unsafe-keypair/local.key', import.meta.url));
const unsafeCert = readFileSync(new URL('./unsafe-keypair/local.cert', import.meta.url));

function handleRequest(req, res) {
  switch (req.url) {
  case '/nothing':
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><html></html>');
    return;

  case '/headers-anchors-links':
    res.writeHead(200, {
      'Content-Type': 'text/html',
      Link: [
        '<https://example.com/payment-in-header-a>; rel="payment"; title="title-a"',
        '<https://example.com/payment-in-header-b>; rel="payment"; title="title-b"'
      ].join(', ')
    });
    res.end(`
      <!doctype html>
      <html>
        <head>
          <link href="https://example.com/payment-in-link-a" rel="payment" title="title-a">
          <link href="https://example.com/payment-in-link-b" rel="payment" title="title-b">
          <link href="https://example.com/next" rel="next">
        </head>
        <body>
          <a href="https://example.com/payment-in-anchor-a" rel="payment" title="title-a">Payment Anchor</a>
          <a href="https://example.com/payment-in-anchor-b" rel="payment">Payment Anchor</a>
          <a href="https://example.com/next" rel="next">Next</a>
        </body>
      </html>
    `);
    return;

  default:
    res.writeHead(404);
    res.end();
    return;
  }
}

const httpServer = http.createServer(handleRequest);
const safeHttpsServer = https.createServer(handleRequest, { key: safeKey, cert: safeCert });
const unsafeHttpsServer = https.createServer(handleRequest, { key: unsafeKey, cert: unsafeCert });

const httpPort = 3000;
const safeHttpsPort = 3001;
const unsafeHttpsPort = 3002;

describe('rel-payment', () => {
  before(() => {
    return Promise.all([
      new Promise(resolve => httpServer.listen(httpPort, () => resolve())),
      new Promise(resolve => safeHttpsServer.listen(safeHttpsPort, () => resolve())),
      new Promise(resolve => unsafeHttpsServer.listen(unsafeHttpsPort, () => resolve()))
    ]);
  });

  after(() => {
    httpServer.close();
    safeHttpsServer.close();
    unsafeHttpsServer.close();
  });

  it('is a function', () => {
    assert.equal(typeof relPayment, 'function');
  });

  it('throw an error for HTTP URLs by default', async () => {
    try {
      await relPayment(`http://localhost:${httpPort}/headers-anchors-links`);
    } catch (e) {
      assert.ok(e instanceof Error);
      assert.equal(e.message, 'Invalid URL protocol: http:');
      return;
    }

    throw new Error('Should have thrown');
  });

  it('throws an error for URLs with no protocol by default', async () => {
    try {
      await relPayment(`//localhost:${httpPort}/headers-anchors-links`);
    } catch (e) {
      assert.ok(e instanceof Error);
      assert.equal(e.code, 'ERR_INVALID_URL');
      return;
    }

    throw new Error('Should have thrown');
  });

  it('throws an error when an unsupported protocol is used', async () => {
    try {
      await relPayment('ftp://something');
    } catch (e) {
      assert.ok(e instanceof Error);
      assert.equal(e.message, 'Invalid URL protocol: ftp:');
      return;
    }

    throw new Error('Should have thrown');
  });

  it('returns payment URLs for HTTP string URLs when configured to', async () => {
    const urls = await relPayment(`http://localhost:${httpPort}/headers-anchors-links`, { allowHttp: true });

    assert.deepStrictEqual(urls, {
      fromLinkHeaders: [
        { url: new URL('https://example.com/payment-in-header-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-header-b'), title: 'title-b' }
      ],
      fromAnchors: [
        { url: new URL('https://example.com/payment-in-anchor-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-anchor-b'), title: '' }
      ],
      fromLinks: [
        { url: new URL('https://example.com/payment-in-link-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-link-b'), title: 'title-b' }
      ]
    });
  });

  it('returns payment URLs for HTTP object URLs when configured to', async () => {
    const url = new URL(`http://localhost:${httpPort}/headers-anchors-links`);
    const urls = await relPayment(url, { allowHttp: true });

    assert.deepStrictEqual(urls, {
      fromLinkHeaders: [
        { url: new URL('https://example.com/payment-in-header-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-header-b'), title: 'title-b' }
      ],
      fromAnchors: [
        { url: new URL('https://example.com/payment-in-anchor-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-anchor-b'), title: '' }
      ],
      fromLinks: [
        { url: new URL('https://example.com/payment-in-link-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-link-b'), title: 'title-b' }
      ]
    });
  });

  it.skip('returns payment URLs for HTTPS URLs', async () => {
    const urls = await relPayment(`https://localhost:${safeHttpsPort}/headers-anchors-links`);

    assert.deepStrictEqual(urls, {
      fromLinkHeaders: [
        { url: new URL('https://example.com/payment-in-header-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-header-b'), title: 'title-b' }
      ],
      fromAnchors: [
        { url: new URL('https://example.com/payment-in-anchor-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-anchor-b'), title: '' }
      ],
      fromLinks: [
        { url: new URL('https://example.com/payment-in-link-a'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-link-b'), title: 'title-b' }
      ]
    });
  });

  it('throws when given a URL to an unsafe source', async () => {
    try {
      await relPayment(`https://localhost:${unsafeHttpsPort}/headers-anchors-links`);
    } catch (e) {
      return;
    }

    throw new Error('Should not reach here.');
  });
});
