import fetch from 'node-fetch';
import LinkHeader from 'http-link-header';
import { SAXParser } from 'parse5-sax-parser';
import { promisify } from 'util';
import { pipeline as pipelinecb } from 'stream';

const pipeline = promisify(pipelinecb);

// Support extended attributes when they're successfully decoded by LinkHeader.
// Otherwise fall back to the title attribute. A null encoding indicates the
// header was properly decoded.
function pickTitle(rel) {
  return rel['title*'] && rel['title*'].encoding === null && rel['title*'].value || rel.title;
}

/** @param {URL|string} url */
export default async function discoverRelPaymentUrl(url, { allowHttp = false } = {}) {
  const paymentUrls = {
    /** @type {{ url: URL, title: string }[]} */
    fromLinkHeaders: [],
    /** @type {{ url: URL, title: string }[]} */
    fromAnchors: [],
    /** @type {{ url: URL, title: string }[]} */
    fromLinks: []
  };

  const targetUrl = new URL(url);

  const allowedProtocols = ['https:'];

  if (allowHttp) {
    allowedProtocols.push('http:');
  }

  if (!allowedProtocols.includes(targetUrl.protocol)) {
    throw new Error(`Invalid URL protocol: ${targetUrl.protocol}`);
  }

  const parse = new SAXParser();

  parse.on('startTag', ({ tagName, attrs }) => {
    if (tagName !== 'link' && tagName !== 'a') {
      return;
    }

    /** @type Record<string, string|undefined> */
    const attributesObject = {};

    for (const { name, value } of attrs) {
      attributesObject[name] = value;
    }

    const { rel, title = '', href } = attributesObject;

    if (rel === 'payment' && href) {
      const url = new URL(href, targetUrl);

      if (tagName === 'link') {
        paymentUrls.fromLinks.push({ url, title });
      } else {
        paymentUrls.fromAnchors.push({ url, title });
      }
    }
  });

  const res = await fetch(targetUrl);

  paymentUrls.fromLinkHeaders = LinkHeader
    .parse(res.headers.get('link') || '')
    .rel('payment')
    .map(rel => ({ url: new URL(rel.uri, targetUrl), title: pickTitle(rel) }));

  if (!res.body) {
    return paymentUrls;
  }

  res.body.setEncoding('utf8');

  await pipeline(res.body, parse);

  return paymentUrls;
}
