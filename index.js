'use strict';

const fetch = require('node-fetch');
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

  if (url.trim().indexOf('http://') === 0 && !allowHttp) {
    return Promise.resolve(paymentUrls);
  }

  const parse = new parse5.SAXParser();

  parse.on('startTag', (name, attributesArray) => {
    if (name !== 'link' && name !== 'a') {
      return;
    }

    const { rel, title = '', href } = attributesArrayToObject(attributesArray);

    if (rel === 'payment' && href) {
      const uri = urlResolve(url, href);

      if (name === 'link') {
        paymentUrls.fromLinks.push({ uri, title });
      } else {
        paymentUrls.fromAnchors.push({ uri, title });
      }
    }
  });

  return fetch(url).then(res => {
    (res.headers.get('link') || '').split(/,\s*/).forEach(link => {
      const parsed = parseLinkHeader(link);

      if (parsed && parsed.payment) {
        paymentUrls.fromLinkHeaders.push({
          uri: urlResolve(url, parsed.payment.url),
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
