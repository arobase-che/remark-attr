'use strict';

const parseAttr = require('md-attr-parser');
const htmlElemAttr = require('html-element-attributes');

const supportedElements = ['link', 'atxHeading', 'strong', 'emphasis', 'deletion', 'code', 'setextHeading'];
const blockElements = ['atxHeading', 'setextHeading'];

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

/* Table convertion between type and HTML tagName */
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
 * - [~] fencedCode     // require('./tokenize/code-fenced'),
   - [x] atxHeading     //require('./tokenize/heading-atx'),
   - [ ] setextHeading	//require('./tokenize/heading-setext'),
   - [~] table          //require('./tokenize/table'),
   - [x] link           //require('./tokenize/link'),
   - [x] strong         //require('./tokenize/strong'),
   - [x] emphasis       //require('./tokenize/emphasis'),
   - [x] deletion       //require('./tokenize/delete'),
   - [x] code           //require('./tokenize/code-inline'),

  Tests with ava
  xo as linter
  comment more
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
  const {extend} = config;
  const {allowDangerousDOMEventHandlers} = config;
  const specific = htmlElemAttr;

  Object.getOwnPropertyNames(prop).forEach(p => {
    if (p !== 'key' && p !== 'class' && p !== 'id') {
      prop[p] = prop[p] || '';
    }
  });

  const isDangerous = p => DOMEventHandler.indexOf(p) >= 0;
  let inScope = _ => false;

  switch (scope) {
    case 'none': // Plugin is disabled
      break;
    case 'permissive':
    case 'every':
      if (allowDangerousDOMEventHandlers) {
        inScope = _ => true;
      } else {
        inScope = x => !isDangerous(x);
      }
      break;
    case 'extented':
      inScope = p => extend[type].indexOf(p) >= 0;
      // Or if it in the specific scope, fallthrough
    case 'specific':
      inScope = p => (inScope(p) || specific[type].indexOf(p) >= 0);
      // Or if it in the global scope fallthrough
    case 'global':
    default:
      inScope = p => (inScope(p) || htmlElemAttr['*'].indexOf(p) >= 0);
      if (allowDangerousDOMEventHandlers) { // If allowed add dangerous attributes to global scope
        inScope = p => (inScope(p) || isDangerous(p));
      }
  }

  const filterFunction = x => !inScope(x);

  Object.getOwnPropertyNames(prop).forEach(p => {
    if (filterFunction(p)) {
      delete prop[p];
    }
  });

  return prop;
}

remarkAttr.SUPPORTED_ELEMENTS = supportedElements;

module.exports = remarkAttr;

function remarkAttr(userConfig) {
  const parser = this.Parser;

  const defaultConfig = {
    allowDangerousDOMEventHandlers: false,
    elements: supportedElements,
    extend: {},
    scope: 'specific',
  };
  const config = {...defaultConfig, ...userConfig};

  if (!isRemarkParser(parser)) {
    throw new Error('Missing parser to attach `remark-attr` [link] (to)');
  }

  const tokenizers = parser.prototype.inlineTokenizers;
  const tokenizersBlock = parser.prototype.blockTokenizers;

  config.elements.forEach(elem => {
    if (supportedElements.indexOf(elem) >= 0) {
      if (blockElements.indexOf(elem) >= 0) {
        const oldElem = tokenizersBlock[elem];
        tokenizersBlock[elem] = tokenizeGenerator('\n', oldElem, config);
      } else {
        const oldElem = tokenizers[elem];
        const elemTokenize = tokenizeGenerator('', oldElem, config);
        elemTokenize.locator = tokenizers[elem].locator;
        tokenizers[elem] = elemTokenize;
      }
    }
  });
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

