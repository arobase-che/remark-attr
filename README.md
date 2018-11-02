# remark-attr

This plugin adds support of custom attributes to Markdown syntax.

For **security reasons**, this plugin uses [html-element-attributes](https://github.com/wooorm/html-element-attributes).  
The use of JavaScript attributes (onload for example) is not allowed by default.

## Default Syntax

Images : 
```markdown
![alt](img){attrs} / ![alt](img){ height=50 }
```

Links   :
```markdown
[Hot babe with computer](https://rms.sexy){rel="external"}
```

Header (Atx) :
```markdown
### This is a title
{style="color:red;"}
```
Header :
```markdown
This is a title
---------------
{style="color: pink;"}
```


Emphasis :
```markdown
Npm stand for *node*{style="color:red"} packet manager.
```

Strong  :
```markdown
This is a **Unicorn**{awesome} !
```

Delete  :
```markdown
Your problem is ~~at line 18~~{style="color: grey"}. My mistake, it's at line 14.
```

Code    :
```markdown
You can use the `fprintf`{language=c} function to format the output to a file.
```

## rehype

At the moment it aims is to be used with [rehype][rehype] only, using remark-rehype.

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

## Dependencies:

```javascript
const unified = require('unified')
const remarkParse = require('remark-parse')
const stringify = require('rehype-stringify')
const remark2rehype = require('remark-rehype')
const remarkAttr = require('remark-attr')

```

## Usage:

```javascript
const testFile = `

Here a test :

![ache avatar](https://ache.one/res/ache.svg){ height=100 }

`

unified()
  .use(remarkParse)
  .use(remarkAttr)
  .use(remark2rehype)
  .use(stringify)
  .process( testFile, (err, file) => {
    console.log(String(file))
  } )
```

Output :

```shell
$ node index.js
<p>Here a test :</p>
<p><img src="https://ache.one/res/ache.svg" alt="ache avatar" height="100"></p>
```

## API

### `remarkAttr([options])`

Parse attributes of markdown elements.

#### `remarkAttr.SUPPORTED_ELEMENTS`

The list of currently supported elements.

`['link', 'atxHeading', 'strong', 'emphasis', 'deletion', 'code', 'setextHeading']`

##### Options

###### `options.allowDangerousDOMEventHandlers`

Whether to allow the use of `on-*` attributes. They are depreciated and disabled by default for security reason. Its a boolean (default: `false`).
If allowed, DOM event handlers will be added to the global scope.

###### `options.elements`

The list of elements witch the attributes should be parsed. It's a list of string, a sub-list of `SUPPORTED_ELEMENTS`.

###### `options.extend`

An object that extends the list of attributes supported for some elements.

Example : 

```
extend: {atxHeading: ['original', 'quality', 'format', 'toc']}
```

With this configuration, if the scope permits it, 4 mores attributes will be supported for atxHeading elements.

###### `options.scope`

A string with the value `"global"` or `"specific"` or `"extented"` or `"none"` or `"every"`.

 - `"none"` will disable the plugin.
 - `"global"` will activate only the global attributes.
 - `"specific"` will activate global and specific attributes.
 - `"extended"` will add personalized tags for some elements.
 - `"permissive"` or `"every"` will allow every attributes (except dangerous one) on every elements supported.

## License

Distributed under a MIT-like license.

[npm]: https://www.npmjs.com/package/remark-attr

[rehype]: https://github.com/wooorm/rehype

