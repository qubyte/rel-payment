'use strict';

const assert = require('assert');
const http = require('http');
const https = require('https');
const { join: pathJoin } = require('path');
const { readFileSync } = require('fs');
const fetch = require('node-fetch');
const relPayment = require('..');

const safeKey = readFileSync(pathJoin(__dirname, 'safe-keypair', 'local.key'));
const safeCert = readFileSync(pathJoin(__dirname, 'safe-keypair', 'local.cert'));
const unsafeKey = readFileSync(pathJoin(__dirname, 'unsafe-keypair', 'local.key'));
const unsafeCert = readFileSync(pathJoin(__dirname, 'unsafe-keypair', 'local.cert'));

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

  it('returns no payment URLs for HTTP URLs by default', async () => {
    const urls = await relPayment(`http://localhost:${httpPort}/headers-anchors-links`);

    assert.deepEqual(urls, {
      fromLinkHeaders: [],
      fromAnchors: [],
      fromLinks: []
    });
  });

  it('returns payment URLs for HTTP URLs when configured to', async () => {
    const urls = await relPayment(`http://localhost:${httpPort}/headers-anchors-links`, { allowHttp: true });

    assert.deepEqual(urls, {
      fromLinkHeaders: [
        { uri: 'https://example.com/payment-in-header-a', title: 'title-a' },
        { uri: 'https://example.com/payment-in-header-b', title: 'title-b' }
      ],
      fromAnchors: [
        { uri: 'https://example.com/payment-in-anchor-a', title: 'title-a' },
        { uri: 'https://example.com/payment-in-anchor-b', title: 'Payment Anchor' }
      ],
      fromLinks: [
        { uri: 'https://example.com/payment-in-link-a', title: 'title-a' },
        { uri: 'https://example.com/payment-in-link-b', title: 'title-b' }
      ]
    });
  });

  it('throws when given a URL to an unsafe source', async () => {
    try {
      await relPayment(`https://localhost:${unsafeHttpsPort}/headers-anchors-links`);
    } catch (e) {
      assert.ok(e instanceof fetch.FetchError);
      return;
    }

    throw new Error('Should not reach here.');
  });
});
