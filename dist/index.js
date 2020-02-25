'use strict';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var parseAttr = require('md-attr-parser');

var htmlElemAttr = require('html-element-attributes');

var supportedElements = ['link', 'atxHeading', 'strong', 'emphasis', 'deletion', 'code', 'setextHeading', 'fencedCode', 'reference', 'paragraph'];
var blockElements = ['atxHeading', 'setextHeading'];
var particularElements = ['fencedCode', 'paragraph'];
var particularTokenize = {};

var DOMEventHandler = require('./dom-event-handler.js');
/* Table convertion between type and HTML tagName */


var convTypeTag = {
  image: 'img',
  link: 'a',
  heading: 'h1',
  strong: 'strong',
  emphasis: 'em',
  "delete": 's',
  inlineCode: 'code',
  code: 'code',
  linkReference: 'a',
  paragraph: 'p',
  '*': '*'
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
    var self = this;
    var eaten = oldParser.call(self, eat, value, silent);
    var index = 0;
    var parsedAttr;
    var length = value.length;

    if (!eaten || !eaten.position) {
      return undefined;
    }

    var type = convTypeTag[eaten.type];
    index = eaten.position.end.offset - eaten.position.start.offset; // Then we check for attributes

    if (index + prefix.length < length && value.charAt(index + prefix.length) === '{') {
      // If any, parse it
      parsedAttr = parseAttr(value, index + prefix.length, config.mdAttrConfig);
    } // If parsed configure the node


    if (parsedAttr) {
      if (config.scope && config.scope !== 'none') {
        var filtredProp = filterAttributes(parsedAttr.prop, config, type);

        if (filtredProp !== {}) {
          if (eaten.data) {
            eaten.data.hProperties = filtredProp;
          } else {
            eaten.data = {
              hProperties: filtredProp
            };
          }
        }
      }

      eaten = eat(prefix + parsedAttr.eaten)(eaten);
    }

    return eaten;
  } // Return the new tokenizer function


  return token;
} // A generic function to parse attributes


function filterAttributes(prop, config, type) {
  var scope = config.scope;
  var extend = config.extend;
  var allowDangerousDOMEventHandlers = config.allowDangerousDOMEventHandlers;
  var specific = htmlElemAttr;

  var extendTag = function (extend) {
    var t = {};
    Object.getOwnPropertyNames(extend).forEach(function (p) {
      t[convTypeTag[p]] = extend[p];
    });
    return t;
  }(extend); // Delete empty key/class/id attributes


  Object.getOwnPropertyNames(prop).forEach(function (p) {
    if (p !== 'key' && p !== 'class' && p !== 'id') {
      prop[p] = prop[p] || '';
    }
  });

  var isDangerous = function isDangerous(p) {
    return DOMEventHandler.indexOf(p) >= 0;
  };

  var isSpecific = function isSpecific(p) {
    return type in specific && specific[type].indexOf(p) >= 0;
  };

  var isGlobal = function isGlobal(p) {
    return htmlElemAttr['*'].indexOf(p) >= 0 || p.match(/^aria-[a-z][a-z.-_0-9]*$/) || p.match(/^data-[a-z][a-z_.-0-9]*$/);
  };

  var inScope = function inScope(_) {
    return false;
  }; // Function used to `or combine` two other function.


  var orFunc = function orFunc(fun, fun2) {
    return function (x) {
      return fun(x) || fun2(x);
    };
  }; // Respect the scope configuration


  switch (scope) {
    case 'none':
      // Plugin is disabled
      break;

    case 'permissive':
    case 'every':
      if (allowDangerousDOMEventHandlers) {
        inScope = function inScope(_) {
          return true;
        };
      } else {
        inScope = function inScope(x) {
          return !isDangerous(x);
        };
      }

      break;

    case 'extended':
    default:
      inScope = function inScope(p) {
        return extendTag && type in extendTag && extendTag[type].indexOf(p) >= 0;
      };

      inScope = orFunc(inScope, function (p) {
        return '*' in extendTag && extendTag['*'].indexOf(p) >= 0;
      });
    // Or if it in the specific scope, fallthrough

    case 'specific':
      inScope = orFunc(inScope, isSpecific);
    // Or if it in the global scope fallthrough

    case 'global':
      inScope = orFunc(inScope, isGlobal);

      if (allowDangerousDOMEventHandlers) {
        // If allowed add dangerous attributes to global scope
        inScope = orFunc(inScope, isDangerous);
      }

  } // If an attributes isn't in the scope, delete it


  Object.getOwnPropertyNames(prop).forEach(function (p) {
    if (!inScope(p)) {
      delete prop[p];
    }
  });
  return prop;
}
/* This is a special modification of the function tokenizeGenerator
 * to parse the fencedCode info string and the fallback
 * customAttr parser
 *
 * It's only temporary
 */


function tokenizeFencedCode(oldParser, config) {
  var prefix = '\n';

  function token(eat, value, silent) {
    // This we call the old tokenize
    var self = this;
    var eaten = oldParser.call(self, eat, value, silent);
    var parsedAttr;
    var parsedByCustomAttr = false;

    if (!eaten || !eaten.position) {
      return undefined;
    }

    var type = convTypeTag[eaten.type]; // First, parse the info string
    // which is the 'lang' attributes of 'eaten'.

    if (eaten.lang) {
      // Then the meta
      if (eaten.meta) {
        parsedAttr = parseAttr(eaten.meta);
      } else {
        // If it's an old version, we can still find from the attributes
        // from 'value' ¯\_(ツ)_/¯
        // Bad hack, will be deleted soon
        parsedAttr = parseAttr(value, value.indexOf(' '));
      }
    } // If parsed configure the node


    if (parsedAttr) {
      if (config.scope && config.scope !== 'none') {
        var filtredProp = filterAttributes(parsedAttr.prop, config, type);

        if (filtredProp !== {}) {
          if (eaten.data) {
            eaten.data.hProperties = _objectSpread({}, eaten.data.hProperties, {}, filtredProp);
          } else {
            eaten.data = {
              hProperties: filtredProp
            };
          }
        }
      }

      if (parsedByCustomAttr) {
        eaten = eat(prefix + parsedAttr.eaten)(eaten);
      }
    }

    return eaten;
  } // Return the new tokenizer function


  return token;
}
/* This is a special modification of the function tokenizeGenerator
 * to parse the paragraph.
 * customAttr parser
 */


function tokenizeParagraph(oldParser, config) {
  function token(eat, value, silent) {
    // This we call the old tokenize
    var self = this;
    var eaten = oldParser.call(self, eat, value, silent);
    var type = convTypeTag[eaten.type];

    if (!eaten || !eaten.position || !eaten.children || eaten.children.length === 0) {
      return undefined;
    } // Looking for the last line of the last child.
    // The last child must be of type text


    var lastChild = eaten.children[eaten.children.length - 1];

    if (!lastChild || !lastChild.type || lastChild.type !== 'text') {
      return undefined;
    }

    var lcLines = lastChild.value.split('\n');

    if (lcLines.length === 0) {
      return undefined;
    }

    var attrs = lcLines[lcLines.length - 1];
    var parsedAttr = parseAttr(attrs, 0, config.mdAttrConfig);

    if (parsedAttr) {
      if (!parsedAttr.eaten || parsedAttr.eaten !== attrs.trimEnd()) {
        return undefined;
      }

      if (parsedAttr.eaten.trim()[0] !== '{' || parsedAttr.eaten.trim().slice(-1) !== '}') {
        return undefined;
      }

      if (config.scope && config.scope !== 'none') {
        var filtredProp = filterAttributes(parsedAttr.prop, config, type);

        if (filtredProp !== {}) {
          if (eaten.data) {
            eaten.data.hProperties = filtredProp;
          } else {
            eaten.data = {
              hProperties: filtredProp
            };
          }
        }
      }

      lastChild.value = lcLines.slice(0, -1).join('\n');
    }

    return eaten;
  } // Return the new tokenizer function


  return token;
}

particularTokenize.fencedCode = tokenizeFencedCode;
particularTokenize.paragraph = tokenizeParagraph;
remarkAttr.SUPPORTED_ELEMENTS = supportedElements;
module.exports = remarkAttr;
/* Function that is exported */

function remarkAttr(userConfig) {
  var parser = this.Parser;
  var defaultConfig = {
    allowDangerousDOMEventHandlers: false,
    elements: supportedElements,
    extend: {},
    scope: 'extended',
    mdAttrConfig: undefined
  };

  var config = _objectSpread({}, defaultConfig, {}, userConfig);

  if (!isRemarkParser(parser)) {
    throw new Error('Missing parser to attach `remark-attr` [link] (to)');
  }

  var tokenizers = parser.prototype.inlineTokenizers;
  var tokenizersBlock = parser.prototype.blockTokenizers; // For each elements, replace the old tokenizer by the new one

  config.elements.forEach(function (elem) {
    if (supportedElements.indexOf(elem) >= 0) {
      if (blockElements.indexOf(elem) >= 0) {
        var oldElem = tokenizersBlock[elem];
        tokenizersBlock[elem] = tokenizeGenerator('\n', oldElem, config);
      } else if (particularElements.indexOf(elem) >= 0) {
        var _oldElem = tokenizersBlock[elem];
        tokenizersBlock[elem] = particularTokenize[elem](_oldElem, config);
      } else {
        var _oldElem2 = tokenizers[elem];
        var elemTokenize = tokenizeGenerator('', _oldElem2, config);
        elemTokenize.locator = tokenizers[elem].locator;
        tokenizers[elem] = elemTokenize;
      }
    }
  });
}

function isRemarkParser(parser) {
  return Boolean(parser && parser.prototype && parser.prototype.inlineTokenizers && parser.prototype.inlineTokenizers.link && parser.prototype.inlineTokenizers.link.locator);
}