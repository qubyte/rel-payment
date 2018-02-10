'use strict';

const http = require('http');
const https = require('https');
const parse5 = require('parse5');
const parseLinkHeader = require('parse-link-header');
const { resolve: urlResolve } = require('url');

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

  let get;

  if (url.startsWith('https://')) {
    get = https.get;
  } else if (allowHttp) {
    get = http.get;
  } else {
    return Promise.resolve(paymentUrls);
  }

  return new Promise((resolve, reject) => {
    if (!allowHttp && !url.startsWith('https://')) {
      return resolve(paymentUrls);
    }

    const parse = new parse5.SAXParser();

    parse.on('startTag', (name, attributesArray) => {
      if (name !== 'link' && name !== 'a') {
        return;
      }

      const { rel, title, href } = attributesArrayToObject(attributesArray);

      if (rel === 'payment' && href) {
        const uri = urlResolve(url, href);

        if (name === 'link') {
          paymentUrls.fromLinks.push({ uri, title });
        } else {
          paymentUrls.fromAnchors.push({ uri, title });
        }
      }
    });

    get(url, res => {
      (res.headers.link || '').split(/,\s*/).forEach(link => {
        const parsed = parseLinkHeader(link);

        if (parsed.payment) {
          paymentUrls.fromLinkHeaders.push({
            uri: urlResolve(url, parsed.payment.url),
            title: parsed.payment.title
          });
        }
      });

      res.pipe(parse).once('end', () => resolve(paymentUrls));
      parse.once('error', reject);
      res.once('error', reject);
    }).on('error', reject);
  });
};
