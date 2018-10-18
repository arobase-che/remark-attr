'use strict';

var parseAttr = require('md-attr-parser');
var htmlElemAttr = require('html-element-attributes');

var supportedElements = ['link', 'atxHeading', 'strong', 'emphasis', 'deletion', 'code', 'setextHeading'];
var blockElements = ['atxHeading', 'setextHeading'];

// The list of DOM Event handler
var DOMEventHandler = ['onabort', 'onautocomplete', 'onautocompleteerror', 'onblur', 'oncancel', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'onclose', 'oncontextmenu', 'oncuechange', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragexit', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onerror', 'onfocus', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadstart', 'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onpause', 'onplay', 'onplaying', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onseeked', 'onseeking', 'onselect', 'onshow', 'onsort', 'onstalled', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle', 'onvolumechange', 'onwaiting'];

/* Table convertion between type and HTML tagName */
var convTypeTag = {
  image: 'img',
  link: 'a',
  heading: 'h1',
  strong: 'strong',
  emphasis: 'em',
  delete: 's',
  inlineCode: 'code',
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
    var parsedAttr = void 0;
    var length = value.length;


    if (!eaten || !eaten.position) {
      return undefined;
    }

    var type = convTypeTag[eaten.type];

    index = eaten.position.end.offset - eaten.position.start.offset;

    // Then we check for attributes
    if (index + prefix.length < length && value.charAt(index + prefix.length) === '{') {
      // If any, parse it
      parsedAttr = parseAttr(value, index + prefix.length);
    }

    // If parsed configure the node
    if (parsedAttr) {
      if (config.scope && config.scope !== 'none') {
        var filtredProp = filterAttributes(parsedAttr.prop, config, type);
        if (filtredProp !== {}) {
          if (eaten.data) {
            eaten.data.hProperties = filtredProp;
          } else {
            eaten.data = { hProperties: filtredProp };
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
  }(extend);

  // Delete empty key/class/id attributes
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
    return htmlElemAttr['*'].indexOf(p) >= 0 || p.match(/^aria-[a-z]{3,24}$/);
  };

  var inScope = function inScope(_) {
    return false;
  };

  // Function used to `or combine` two other function.
  var orFunc = function orFunc(fun, fun2) {
    return function (x) {
      return fun(x) || fun2(x);
    };
  };

  // Respect the scope configuration
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
  }

  // If an attributes isn't in the scope, delete it
  Object.getOwnPropertyNames(prop).forEach(function (p) {
    if (!inScope(p)) {
      delete prop[p];
    }
  });

  return prop;
}

remarkAttr.SUPPORTED_ELEMENTS = supportedElements;

module.exports = remarkAttr;

/* Function that is exported */
function remarkAttr(userConfig) {
  var parser = this.Parser;

  var defaultConfig = {
    allowDangerousDOMEventHandlers: false,
    elements: supportedElements,
    extend: {},
    scope: 'extended'
  };
  var config = Object.assign({}, defaultConfig, userConfig);

  if (!isRemarkParser(parser)) {
    throw new Error('Missing parser to attach `remark-attr` [link] (to)');
  }

  var tokenizers = parser.prototype.inlineTokenizers;
  var tokenizersBlock = parser.prototype.blockTokenizers;

  // For each elements, replace the old tokenizer by the new one
  config.elements.forEach(function (elem) {
    if (supportedElements.indexOf(elem) >= 0) {
      if (blockElements.indexOf(elem) >= 0) {
        var oldElem = tokenizersBlock[elem];
        tokenizersBlock[elem] = tokenizeGenerator('\n', oldElem, config);
      } else {
        var _oldElem = tokenizers[elem];
        var elemTokenize = tokenizeGenerator('', _oldElem, config);
        elemTokenize.locator = tokenizers[elem].locator;
        tokenizers[elem] = elemTokenize;
      }
    }
  });
}

function isRemarkParser(parser) {
  return Boolean(parser && parser.prototype && parser.prototype.inlineTokenizers && parser.prototype.inlineTokenizers.link && parser.prototype.inlineTokenizers.link.locator);
}