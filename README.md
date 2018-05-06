# remark-attr

This plugin add support of custom attributes to Markdown syntax.

**This is an alpha not ready to be used in production.**

For the moment, it only support image and link.

It aimed to support any other elements of the markdown syntax.

Also for security reasons, this plugin should use [html-element-attributes](https://github.com/wooorm/html-element-attributes).  
The use of JavaScript attributes (onload for example) must not be allowed by default.

## Default Syntax


Images : 
```markdown
![alt](img){attrs} / ![alt](img){ height=50 }
```

Links   :
```markdown
[Hot babe with computer](https://rms.sexy){rel="external"}
```

## rehype

This plugin is compatible with [rehype][rehype].
Actually, it wouldn't really do much good otherwise.
At the moment it aims is to be used with remark-rehype only.

```md
[Hot babe with computer](https://rms.sexy){rel="external"}
```

gives:


```html
<a href="https://rms.sexy" rel="external">Hot babe with computer</a>
```

## Installation

[npm][npm]:

```bash
npm install remark-attr
```

## Usage

### Dependencies:

```javascript
const unified = require('unified')
const remarkParse = require('remark-parse')
const stringify = require('rehype-stringify')
const remark2rehype = require('remark-rehype')

const remarkAttr = require('remark-attr');
```

### Usage:

```javascript
unified()
  .use(remarkParse)
  .use(remarkAttr)
  .use(remark2rehype)
  .use(stringify)
```


<!-- Should talk about options -->

## License

<!-- GNUv3 or MIT -->

[build-badge]: https://img.shields.io/travis/zestedesavoir/zmarkdown.svg

[build-status]: https://travis-ci.org/zestedesavoir/zmarkdown

[coverage-badge]: https://img.shields.io/coveralls/zestedesavoir/zmarkdown.svg

[coverage-status]: https://coveralls.io/github/zestedesavoir/zmarkdown

[zds]: https://zestedesavoir.com

[npm]: https://www.npmjs.com/package/remark-ping

[mdast]: https://github.com/syntax-tree/mdast/blob/master/readme.md

[rehype]: https://github.com/wooorm/rehype

[parent]: https://github.com/syntax-tree/unist#parent

