# remark-attr

This plugin add support of custom attributes to Markdown syntax.

**This is an alpha not ready to be used in production.** but will be soon.

Also for security reasons, this plugin use [html-element-attributes](https://github.com/wooorm/html-element-attributes).  
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
You can use the `fprintf`{lang=c} function to format the output to a file.
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

## Usage

### Dependencies:

```javascript
const unified = require('unified')
const remarkParse = require('remark-parse')
const stringify = require('rehype-stringify')
const remark2rehype = require('remark-rehype')
const remarkAttr = require('remark-attr')

```

### Usage:

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

This package can be configurated. 

```javascript
unified()
  .use(remarkParse)
  .use(remarkAttr, config)
  .use(remark2rehype)
  .use(stringify)
  .process( testFile, (err, file) => {
    console.log(String(file))
  } )
```

Here are the defaults options :

```javascript
  {
    allowDangerousDOMEventHandlers: false,
    elements: ['link', 'image', 'header'],
    extends: {},
    scope: 'specific', 
  };
```

**allowDangerousDOMEventHandlers** : A boolean

Allow the use of `on-*` attributs. They are depreciated and disabled by default for security reason.

**elements** : A list of elements from this list `[ 'link', 'image', 'header', 'strong', 'emphasis', 'deletion', 'code', 'atxHeader' ]` or `"*"`.

List of every tags on witch remark-attr will be activated or `'*'` to activate remark-attr on every supported tags.

**extends** : An object that extends the list of attributs supported for some elements.

Example : 
```
{extends: {image: ['original', 'quality', 'format', 'exposition']}}
```

With this configuration, if the scope permit it, 4 mores attributs will be supported for image elements.

**scope** : A string with the value `"global"` or `"specific"` or `"extented"` or `"none"` or `"every"`.

`"none"` will disable the plugin
`"global"` will activate only the global attributs
`"specific"` will activate global and specific attributs.
`"extented"` will add personalized tags for some elements.
`"permissive"` or `"every"` will allow every attributs (execpt dangerous one) on every elements supported.

## License

<!-- MIT -->

[npm]: https://www.npmjs.com/package/remark-attr

[rehype]: https://github.com/wooorm/rehype

