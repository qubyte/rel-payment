# rel-payment

[![Greenkeeper badge](https://badges.greenkeeper.io/qubyte/rel-payment.svg)](https://greenkeeper.io/)

Discover [rel="payment"](http://microformats.org/wiki/rel-payment) donation
URIs within given a URL for a page.

## Usage

```javascript
const relPayment = require('rel-payment');

relPayment('https://qubyte.codes').then(
  paymentUris => console.log(paymentUris),
  err => console.error(err)
);
```

where `paymentUris` looks like:

```javascript
{
  fromLinkHeaders: [], // Array of objects distilled from link headers.
  fromAnchors: [],     // Array of objects distilled from anchors tags.
  fromLinks: []        // Array of objects distilled from link tags.
}
```

and where each object looks like:

```javascript
{
  uri: 'https://example.com/payment', // Absolute URI for payments.
  title: 'Some info about the payment.'
}
```

The title field is populated by the title attribute of the tag.

## HTTP

Be default HTTP pages are not searched for payment links, since it's trivial to
rewrite pages and add link headers. However, if you want to enable this
behaviour you may pass `{ allowHttp: true }` as the second argument to
`relPayment`.

## HTTPS

Pages with valid certificates will be searched as expected. Pages without a
valid certificate will cause the call to `relPayment` to throw an error.
