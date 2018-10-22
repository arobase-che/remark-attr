'use strict';

const parseAttr = require('md-attr-parser');
const htmlElemAttr = require('html-element-attributes');

const supportedElements = ['link', 'atxHeading', 'strong', 'emphasis', 'deletion', 'code', 'setextHeading', 'fencedCode'];
const blockElements = ['atxHeading', 'setextHeading'];
const particularElements = ['fencedCode'];

const particularTokenize = {};

// The list of DOM Event handler
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
  code: 'code',
  '*': '*',
};

/* This function is a generic function that transform
 * the tokenize function a node type to a version that understand
 * attributes.
 *
 * The tokenizer function of strong will tokenize **STRONG STRING**
 * this function extand it to tokenize **STRONG STRING**{list=of attributes}
 *
 * - The prefix is '\n' for block node and '' for inline one
 *
 * The syntax is for atxHeading ::
 * ## HEAD TITLE
 * {attributes}
 *
 * Attributes are on the next line.
 *
 * - The old parser is the old function user to tokenize
 * - The config is the configuration of this plugin
 *
 */
function tokenizeGenerator(prefix, oldParser, config) {
  function token(eat, value, silent) {
    // This we call the old tokenize
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

    // Then we check for attributes
    if (index + prefix.length < length && value.charAt(index + prefix.length) === '{') {
    // If any, parse it
      parsedAttr = parseAttr(value, index + prefix.length, config.mdAttrConfig);
    }

    // If parsed configure the node
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
  // Return the new tokenizer function
  return token;
}

// A generic function to parse attributes
function filterAttributes(prop, config, type) {
  const {scope} = config;
  const {extend} = config;
  const {allowDangerousDOMEventHandlers} = config;
  const specific = htmlElemAttr;

  const extendTag = (extend => {
    const t = {};
    Object.getOwnPropertyNames(extend).forEach(p => {
      t[convTypeTag[p]] = extend[p];
    });
    return t;
  })(extend);

  // Delete empty key/class/id attributes
  Object.getOwnPropertyNames(prop).forEach(p => {
    if (p !== 'key' && p !== 'class' && p !== 'id') {
      prop[p] = prop[p] || '';
    }
  });

  const isDangerous = p => DOMEventHandler.indexOf(p) >= 0;
  const isSpecific = p => type in specific && specific[type].indexOf(p) >= 0;
  const isGlobal = p => htmlElemAttr['*'].indexOf(p) >= 0;

  let inScope = _ => false;

  // Function used to `or combine` two other function.
  const orFunc = (fun, fun2) => x => fun(x) || fun2(x);

  // Respect the scope configuration
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
    case 'extended':
    default:
      inScope = p => extendTag && type in extendTag && extendTag[type].indexOf(p) >= 0;
      inScope = orFunc(inScope, p => '*' in extendTag && extendTag['*'].indexOf(p) >= 0);
      // Or if it in the specific scope, fallthrough
    case 'specific':
      inScope = orFunc(inScope, isSpecific);
      // Or if it in the global scope fallthrough
    case 'global':
      inScope = orFunc(inScope, isGlobal);
      if (allowDangerousDOMEventHandlers) { // If allowed add dangerous attributes to global scope
        inScope = orFunc(inScope, isDangerous);
      }
  }

  // If an attributes isn't in the scope, delete it
  Object.getOwnPropertyNames(prop).forEach(p => {
    if (!inScope(p)) {
      delete prop[p];
    }
  });

  return prop;
}

/* This is a special modification of the function tokenizeGenerator
 * to parse the fencedCode info string and the fallback
 * customAttr parser
 */
function tokenizeFencedCode(oldParser, config) {
  const prefix = '\n';
  function token(eat, value, silent) {
    // This we call the old tokenize
    const self = this;
    let eaten = oldParser.call(self, eat, value, silent);

    let index = 0;
    let parsedAttr;
    let parsedByCustomAttr = false;
    const {length} = value;

    if (!eaten || !eaten.position) {
      return undefined;
    }

    const type = convTypeTag[eaten.type];

    // First, parse the info string
    // which is the 'lang' attributes of 'eaten'.

    if (eaten.lang) {
      let infoPart = '';
      if (eaten.lang.indexOf(' ') >= 0) {
        if (eaten.lang.indexOf('{') >= 0) {
          const posStart = Math.min(eaten.lang.indexOf(' '), eaten.lang.indexOf('{'));
          infoPart = eaten.lang.substr(posStart);

          if (posStart === eaten.lang.indexOf('{')) {
            eaten.lang = eaten.lang.substr(0, eaten.lang.indexOf('{')) + ' ' + infoPart;
          }
        } else {
          infoPart = eaten.lang.substr(eaten.lang.indexOf(' '));
        }
      } else if (eaten.lang.indexOf('{') >= 0) {
        infoPart = eaten.lang.substr(eaten.lang.indexOf('{'));
        eaten.lang = eaten.lang.substr(0, eaten.lang.indexOf('{')) + ' ' + infoPart;
      }

      if (infoPart) {
        parsedAttr = parseAttr(infoPart, 0, config.mdAttrConfig);
      }
    }

    index = eaten.position.end.offset - eaten.position.start.offset;

    // Then we check for attributes
    if (index + prefix.length < length && value.charAt(index + prefix.length) === '{') {
    // If any, parse it
      parsedAttr = {...parsedAttr, ...parseAttr(value, index + prefix.length, config.mdAttrConfig)};
      parsedByCustomAttr = Boolean(parsedAttr);
    }

    // If parsed configure the node
    if (parsedAttr) {
      if (config.scope && config.scope !== 'none') {
        const filtredProp = filterAttributes(parsedAttr.prop, config, type);

        if (filtredProp !== {}) {
          if (eaten.data) {
            eaten.data.hProperties = {...eaten.data.hProperties, ...filtredProp};
          } else {
            eaten.data = {hProperties: filtredProp};
          }
        }
      }
      if (parsedByCustomAttr) {
        eaten = eat(prefix + parsedAttr.eaten)(eaten);
      }
    }

    return eaten;
  }

  // Return the new tokenizer function

  return token;
}

particularTokenize.fencedCode = tokenizeFencedCode;

remarkAttr.SUPPORTED_ELEMENTS = supportedElements;

module.exports = remarkAttr;

/* Function that is exported */
function remarkAttr(userConfig) {
  const parser = this.Parser;

  const defaultConfig = {
    allowDangerousDOMEventHandlers: false,
    elements: supportedElements,
    extend: {},
    scope: 'extended',
    mdAttrConfig: undefined,
  };
  const config = Object.assign({}, defaultConfig, userConfig);

  if (!isRemarkParser(parser)) {
    throw new Error('Missing parser to attach `remark-attr` [link] (to)');
  }

  const tokenizers = parser.prototype.inlineTokenizers;
  const tokenizersBlock = parser.prototype.blockTokenizers;

  // For each elements, replace the old tokenizer by the new one
  config.elements.forEach(elem => {
    if (supportedElements.indexOf(elem) >= 0) {
      if (blockElements.indexOf(elem) >= 0) {
        const oldElem = tokenizersBlock[elem];
        tokenizersBlock[elem] = tokenizeGenerator('\n', oldElem, config);
      } else if (particularElements.indexOf(elem) >= 0) {
        const oldElem = tokenizersBlock[elem];
        tokenizersBlock[elem] = particularTokenize[elem](oldElem, config);
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

