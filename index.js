import fetch from 'node-fetch';
import LinkHeader from 'http-link-header';
import { SAXParser } from 'parse5-sax-parser';
import { promisify } from 'util';
import { pipeline as pipelinecb } from 'stream';

const pipeline = promisify(pipelinecb);

export default async function discoverRelPaymentUrl(url, { allowHttp = false } = {}) {
  const paymentUrls = {
    fromLinkHeaders: [],
    fromAnchors: [],
    fromLinks: []
  };

  const { protocol, href: targetHref } = new URL(url);
  const allowed = protocol === 'https:' || (allowHttp && protocol === 'http:');

  if (!allowed) {
    throw new Error(`Invalid URL protocol: ${protocol}`);
  }

  const parse = new SAXParser();

  parse.on('startTag', ({ tagName, attrs }) => {
    if (tagName !== 'link' && tagName !== 'a') {
      return;
    }

    const { rel, title = '', href } = Object.fromEntries(attrs.map(({ name, value }) => [name, value]));

    if (rel === 'payment' && href) {
      const url = new URL(href, targetHref);

      if (tagName === 'link') {
        paymentUrls.fromLinks.push({ url, title });
      } else {
        paymentUrls.fromAnchors.push({ url, title });
      }
    }
  });

  const res = await fetch(targetHref);

  paymentUrls.fromLinkHeaders = LinkHeader
    .parse(res.headers.get('link') || '')
    .rel('payment')
    .map(rel => ({
      url: new URL(rel.uri, targetHref),
      // Support extended attributes when they're successfully decoded by
      // LinkHeader. Otherwise fall back to the title attribute. A null encoding
      // indicates the header was properly decoded.
      title: rel['title*'] && rel['title*'].encoding === null && rel['title*'].value || rel.title || ''
    }));

  if (res.body) {
    await pipeline(res.body.setEncoding('utf8'), parse);
  }

  return paymentUrls;
}
