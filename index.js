'use strict';

const fetch = require('node-fetch');
const SAXParser = require('parse5-sax-parser');
const parseLinkHeader = require('parse-link-header');
const { resolve: urlResolve, URL } = require('url');

function attributesArrayToObject(attributesArray) {
  const attributesObject = {};

  for (const { name, value } of attributesArray) {
    attributesObject[name] = value;
  }

  return attributesObject;
}

module.exports = function discoverRelPaymentUrl(url, { allowHttp = false } = {}) {
  const paymentUrls = {
    fromLinkHeaders: [],
    fromAnchors: [],
    fromLinks: []
  };

  const { protocol, href: targetUrl } = new URL(url);

  const allowedProtocols = ['https:'];

  if (allowHttp) {
    allowedProtocols.push('http:');
  }

  if (!allowedProtocols.includes(protocol)) {
    throw new Error(`Invalid URL protocol: ${protocol}`);
  }

  const parse = new SAXParser();

  parse.on('startTag', ({ tagName, attrs }) => {
    if (tagName !== 'link' && tagName !== 'a') {
      return;
    }

    const { rel, title = '', href } = attributesArrayToObject(attrs);

    if (rel === 'payment' && href) {
      const url = new URL(urlResolve(targetUrl, href));

      if (tagName === 'link') {
        paymentUrls.fromLinks.push({ url, title });
      } else {
        paymentUrls.fromAnchors.push({ url, title });
      }
    }
  });

  return fetch(targetUrl).then(res => {
    (res.headers.get('link') || '').split(/,\s*/).forEach(link => {
      const parsed = parseLinkHeader(link);

      if (parsed && parsed.payment) {
        paymentUrls.fromLinkHeaders.push({
          url: new URL(urlResolve(targetUrl, parsed.payment.url)),
          title: parsed.payment.title
        });
      }
    });

    return new Promise((resolve, reject) => {
      function onEnd() {
        removeListeners();
        resolve(paymentUrls);
      }

      function onError(error) {
        removeListeners();
        reject(error);
      }

      function removeListeners() {
        parse.removeListener('end', onEnd);
        parse.removeListener('error', onError);
        res.body.removeListener('error', onError);
      }

      res.body.pipe(parse).on('end', onEnd);
      parse.on('error', onError);
      res.body.on('error', onError);
    });
  });
};
