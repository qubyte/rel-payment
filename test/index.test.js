import { strict as assert } from 'node:assert';
import { describe, before, after, it } from 'node:test';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync } from 'node:fs';
import relPayment from 'rel-payment';

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

  case '/no-body':
    res.writeHead(204).end();
    return;

  case '/headers-anchors-links':
    res.writeHead(200, {
      'Content-Type': 'text/html',
      Link: [
        '<https://example.com/payment-in-header-simple>; rel="payment"; title="title-a"',
        '<https://example.com/payment-in-header-unquoted-rel>; rel=payment; title="title-b"',
        '<https://example.com/payment-in-header-extended-attribute-title>; rel="payment"; title*="UTF-8\'en\'%74%69%74%6C%65%2D%63"',
        '</path-part-in-header-only>; rel="payment"; title="title-d"',
        '<https://example.com/payment-in-header-extended-attribute-title-fallback-undecodable>; rel="payment"; title="title-e"; title*="BLAH\'\'%74%69%74%6C%65%2D%63"' // eslint-disable-line max-len
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

const httpServer = createHttpServer(handleRequest);
const safeHttpsServer = createHttpsServer(handleRequest, { key: safeKey, cert: safeCert });
const unsafeHttpsServer = createHttpsServer(handleRequest, { key: unsafeKey, cert: unsafeCert });

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

  it('does not throw when a request for a target responds with no body', async () => {
    await relPayment(`http://localhost:${httpPort}/no-body`, { allowHttp: true });
  });

  it('returns payment URLs for HTTP string URLs when configured to', async () => {
    const urls = await relPayment(`http://localhost:${httpPort}/headers-anchors-links`, { allowHttp: true });

    assert.deepEqual(urls, {
      fromLinkHeaders: [
        { url: new URL('https://example.com/payment-in-header-simple'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-header-unquoted-rel'), title: 'title-b' },
        { url: new URL('https://example.com/payment-in-header-extended-attribute-title'), title: 'title-c' },
        { url: new URL('http://localhost:3000/path-part-in-header-only'), title: 'title-d' },
        { url: new URL('https://example.com/payment-in-header-extended-attribute-title-fallback-undecodable'), title: 'title-e' }
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

    assert.deepEqual(urls, {
      fromLinkHeaders: [
        { url: new URL('https://example.com/payment-in-header-simple'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-header-unquoted-rel'), title: 'title-b' },
        { url: new URL('https://example.com/payment-in-header-extended-attribute-title'), title: 'title-c' },
        { url: new URL('http://localhost:3000/path-part-in-header-only'), title: 'title-d' },
        { url: new URL('https://example.com/payment-in-header-extended-attribute-title-fallback-undecodable'), title: 'title-e' }
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

    assert.deepEqual(urls, {
      fromLinkHeaders: [
        { url: new URL('https://example.com/payment-in-header-simple'), title: 'title-a' },
        { url: new URL('https://example.com/payment-in-header-unquoted-rel'), title: 'title-b' },
        { url: new URL('https://example.com/payment-in-header-extended-attribute-title'), title: 'title-c' },
        { url: new URL('http://localhost:3000/path-part-in-header-only'), title: 'title-d' },
        { url: new URL('https://example.com/payment-in-header-extended-attribute-title-fallback-undecodable'), title: 'title-e' }
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
