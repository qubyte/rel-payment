# CHANGELOG

## v5.0.0

- Drops support for Node 14. I'm trying to cut down the footprint of all my
  packages to lower the dependency maintenance burden.

## v4.1.2

- Fixes and adds back TypeScript declaration file.
- Adds a check for null body when handling responses. This is a precaution since
  node-fetch doesn't appear to produce them.

## v4.1.1

- Unused files no longer make it to the package on npm, lowering download size.

## v4.1.0

- Adds support for grabbing the
  [title](https://datatracker.ietf.org/doc/html/rfc8288#section-3.4.1) as an
  [extended attribute](https://datatracker.ietf.org/doc/html/rfc8187#section-3.2.1)
  from headers.
- Lessens the node_modules footprint a little.

## v4.0.0

- Drops support for Node 12.

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
