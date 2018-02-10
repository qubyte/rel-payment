'use strict';

const fetch = require('node-fetch');
const cheerio = require('cheerio');
const parseLinkHeader = require('parse-link-header');
const { resolve: urlResolve } = require('url');

module.exports = async function discoverRelPaymentUrl(url, { allowHttp = false } = {}) {
  const paymentUrls = {
    fromLinkHeaders: [],
    fromAnchors: [],
    fromLinks: []
  };

  if (!allowHttp && !url.startsWith('https://')) {
    return paymentUrls;
  }

  // TODO: Should throws be handled here?
  const res = await fetch(url);

  (res.headers.get('link') || '').split(/,\s*/).forEach(link => {
    const parsed = parseLinkHeader(link);

    if (parsed.payment) {
      paymentUrls.fromLinkHeaders.push({
        uri: urlResolve(url, parsed.payment.url),
        title: parsed.payment.title
      });
    }
  });

  const body = await res.text();
  const $ = cheerio.load(body);

  $('a').each((i, el) => {
    const $el = $(el);

    if ($el.attr('rel') === 'payment') {
      const href = $el.attr('href');
      const title = $el.attr('title') || $el.text().trim();

      if (href) {
        paymentUrls.fromAnchors.push({ uri: urlResolve(url, href), title });
      }
    }
  });

  $('link').each((i, el) => {
    const $el = $(el);

    if ($el.attr('rel') === 'payment') {
      const href = $el.attr('href');
      const title = $el.attr('title');

      if (href) {
        paymentUrls.fromLinks.push({ uri: urlResolve(url, href), title });
      }
    }
  });

  return paymentUrls;
};
