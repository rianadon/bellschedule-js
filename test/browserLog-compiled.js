'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

/* eslint-disable no-console */

if (location.search !== '?raw') {
  (function () {
    var colors = {
      number: 'blue',
      string: 'darkgreen',
      object: 'darkorange'
    };
    var oc = console.log;
    console.log = function () {
      for (var _len = arguments.length, toLog = Array(_len), _key = 0; _key < _len; _key++) {
        toLog[_key] = arguments[_key];
      }

      oc.apply(console, toLog);
      var div = document.createElement('section');
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = toLog[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var l = _step.value;

          var p = document.createElement('pre');
          p.style.color = colors[typeof l === 'undefined' ? 'undefined' : _typeof(l)];
          p.appendChild(document.createTextNode(typeof l === 'string' ? l : JSON.stringify(l)));
          div.appendChild(p);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      document.body.appendChild(div);
    };
  })();
}
