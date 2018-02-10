# rel-payment

Discover [rel="payment"](http://microformats.org/wiki/rel-payment) donation
URIs within given a URL for a page.

## Usage

```javascript
const relPayment = require('rel-payment');

relPayment.then(
  paymentUris => console.log(paymentUrls),
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

where each object looks like:

```javascript
{
  uri: 'https://example.com/payment', // Absolute URI for payments.
  title: 'Some info about the payment.'
}
```

The title field is populated by the title attribute of the tag. When no title
is available, the text content will be used for anchor tags.

## HTTP

Be default HTTP pages are not searched for payment links, since it's trivial to
rewrite pages and add link headers. However, if you want to enable this
behaviour you may pass `{ allowHttp: true }` as the second argument to
`relPayment`.

## HTTPS

Pages with valid certificates will be searched as expected. Pages without a
valid certificate will cause the call to `relPayment` to throw an error.
