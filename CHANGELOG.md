# CHANGELOG

## v3.0.0

- Now an ES module.

## v2.0.0

- Drops support for Node 10.
- Drops use of the deprecated `url.resolve` method.

## v1.0.2

- Bumps node-fetch to 2.6.1.

## v1.0.1

- Bump of parse5-sax-parser to address a security advisory.

## v1.0.0

- Stable.

## v0.0.6

BREAKING CHANGE.

 - May now be called with a WHATWG object (a string URL will still work).
 - Results no longer have a `uri` field. This has been replaced with a `url` field containing a WHATWG URL object.
 - Fixes TypeScript declaration file.

## v0.0.5

 - Bumps `node-fetch` from `^2.0.0` to `^2.2.0`.
 - Replaces `parse5` with `parse5-sax-parser`.
 - Corrects usage infomation in the readme.

## v0.0.4

 - A URL with an unsupported protocol, which includes HTTP when not setting `allowHttp` to true and no protocol, will now throw an error.
 - A TypeScript definition file is now included.
