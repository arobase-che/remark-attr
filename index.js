'use strict';

const parseAttr = require('md-attr-parser');
const htmlElemAttr = require('html-element-attributes');

const DOMEventHandler = [
  'onabort', 'onautocomplete', 'onautocompleteerror',
  'onblur', 'oncancel', 'oncanplay',
  'oncanplaythrough', 'onchange', 'onclick',
  'onclose', 'oncontextmenu', 'oncuechange',
  'ondblclick', 'ondrag', 'ondragend',
  'ondragenter', 'ondragexit', 'ondragleave',
  'ondragover', 'ondragstart', 'ondrop',
  'ondurationchange', 'onemptied', 'onended',
  'onerror', 'onfocus', 'oninput',
  'oninvalid', 'onkeydown', 'onkeypress',
  'onkeyup', 'onload', 'onloadeddata',
  'onloadedmetadata', 'onloadstart', 'onmousedown',
  'onmouseenter', 'onmouseleave', 'onmousemove',
  'onmouseout', 'onmouseover', 'onmouseup',
  'onmousewheel', 'onpause', 'onplay',
  'onplaying', 'onprogress', 'onratechange',
  'onreset', 'onresize', 'onscroll',
  'onseeked', 'onseeking', 'onselect',
  'onshow', 'onsort', 'onstalled',
  'onsubmit', 'onsuspend', 'ontimeupdate',
  'ontoggle', 'onvolumechange', 'onwaiting',
];
const convTypeTag = {
  image: 'img',
  link: 'a',
  heading: 'h1',
  strong: 'strong',
  emphasis: 'em',
  delete: 's',
  inlineCode: 'code',
};
/* TODO :
 * - [ ] fencedCode     // require('./tokenize/code-fenced'),
   - [x] atxHeading     //require('./tokenize/heading-atx'),
   - [ ] setextHeading	//require('./tokenize/heading-setext'),
   - [ ] table          //require('./tokenize/table'),
   - [x] link           //require('./tokenize/link'),
   - [x] strong         //require('./tokenize/strong'),
   - [x] emphasis       //require('./tokenize/emphasis'),
   - [x] deletion       //require('./tokenize/delete'),
   - [x] code           //require('./tokenize/code-inline'),

  Tests with ava
  xo as linter
*/

function tokenizeGenerator(prefix, oldParser, config) {
  function token(eat, value, silent) {
    const self = this;
    let eaten = oldParser.call(self, eat, value, silent);

    let index = 0;
    let parsedAttr;
    const {length} = value;

    if (!eaten || !eaten.position) {
      return undefined;
    }

    const type = convTypeTag[eaten.type];

    index = eaten.position.end.offset - eaten.position.start.offset;

    if (index + prefix.length < length && value.charAt(index + prefix.length) === '{') {
      parsedAttr = parseAttr(value, index + prefix.length);
    }

    if (parsedAttr) {
      if (config.scope && config.scope !== 'none') {
        const filtredProp = filterAttributes(parsedAttr.prop, config, type);
        if (filtredProp !== {}) {
          if (eaten.data) {
            eaten.data.hProperties = filtredProp;
          } else {
            eaten.data = {hProperties: filtredProp};
          }
        }
      }
      eaten = eat(prefix + parsedAttr.eaten)(eaten);
    }
    return eaten;
  }
  return token;
}

function filterAttributes(prop, config, type) {
  const {scope} = config;
  const {allowDangerousDOMEventHandlers} = config;

  if (scope === 'specific') {
    Object.getOwnPropertyNames(prop).forEach(p => {
      if ((!htmlElemAttr[type] || htmlElemAttr[type].indexOf(p) < 0) &&
          htmlElemAttr['*'].indexOf(p) < 0 &&
          DOMEventHandler.indexOf(p) < 0) {
        delete prop[p];
      }
    });
  } else if (scope === 'global') {
    Object.getOwnPropertyNames(prop).forEach(p => {
      if (htmlElemAttr['*'].indexOf(p) < 0 &&
          DOMEventHandler.indexOf(p) < 0) {
        delete prop[p];
      }
    });
  }
  if (!allowDangerousDOMEventHandlers) {
    Object.getOwnPropertyNames(prop).forEach(p => {
      if (DOMEventHandler.indexOf(p) >= 0) {
        delete prop[p];
      }
    });
  }
  return prop;
}

module.exports = remarkAttr;

function remarkAttr(userConfig) {
  const parser = this.Parser;

  const defaulConfig = {
    allowDangerousDOMEventHandlers: false,
    elements: ['link', 'image', 'header'],
    extends: [],
    scope: 'specific',
  };
  const config = {...defaulConfig, ...userConfig};

  if (!isRemarkParser(parser)) {
    throw new Error('Missing parser to attach `remark-attr` [link] (to)');
  }

  const tokenizers = parser.prototype.inlineTokenizers;
  const tokenizersBlock = parser.prototype.blockTokenizers;

  const oldLink = tokenizers.link;
  const oldStrong = tokenizers.strong;
  const oldEmphasis = tokenizers.emphasis;
  const oldDeletion = tokenizers.deletion;
  const oldCodeInline = tokenizers.code;
  const oldAtxHeader = tokenizersBlock.atxHeading;

  console.log(tokenizeGenerator('', oldLink, config));
  const linkTokenize = tokenizeGenerator('', oldLink, config);
  linkTokenize.locator = tokenizers.link.locator;
  const strongTokenize = tokenizeGenerator('', oldStrong, config);
  strongTokenize.locator = tokenizers.strong.locator;
  const emphasisTokenize = tokenizeGenerator('', oldEmphasis, config);
  emphasisTokenize.locator = tokenizers.emphasis.locator;
  const deleteTokenize = tokenizeGenerator('', oldDeletion, config);
  deleteTokenize.locator = tokenizers.deletion.locator;
  const codeInlineTokenize = tokenizeGenerator('', oldCodeInline, config);
  codeInlineTokenize.locator = tokenizers.code.locator;

  tokenizersBlock.atxHeading = tokenizeGenerator('\n', oldAtxHeader, config);
  tokenizers.link = linkTokenize;
  tokenizers.strong = strongTokenize;
  tokenizers.emphasis = emphasisTokenize;
  tokenizers.deletion = deleteTokenize;
  tokenizers.code = codeInlineTokenize;
}

function isRemarkParser(parser) {
  return Boolean(
    parser &&
    parser.prototype &&
    parser.prototype.inlineTokenizers &&
    parser.prototype.inlineTokenizers.link &&
    parser.prototype.inlineTokenizers.link.locator
  );
}

