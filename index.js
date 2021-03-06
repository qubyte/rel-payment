import fetch from 'node-fetch';
import SAXParser from 'parse5-sax-parser';
import parseLinkHeader from 'parse-link-header';
import { promisify } from 'util';
import { pipeline as pipelinecb } from 'stream';

const pipeline = promisify(pipelinecb);

function attributesArrayToObject(attributesArray) {
  const attributesObject = {};

  for (const { name, value } of attributesArray) {
    attributesObject[name] = value;
  }

  return attributesObject;
}

export default async function discoverRelPaymentUrl(url, { allowHttp = false } = {}) {
  const paymentUrls = {
    fromLinkHeaders: [],
    fromAnchors: [],
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

    const { rel, title = '', href } = attributesArrayToObject(attrs);

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
  const links = (res.headers.get('link') || '').split(/,\s*/);

  for (const link of links) {
    const parsed = parseLinkHeader(link);

    if (parsed && parsed.payment) {
      paymentUrls.fromLinkHeaders.push({
        url: new URL(parsed.payment.url, targetUrl),
        title: parsed.payment.title
      });
    }
  }

  res.body.setEncoding('utf8');

  await pipeline(res.body, parse);

  return paymentUrls;
}
