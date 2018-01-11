'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _getWeb = require('./utils/getWeb3');

var _getWeb2 = _interopRequireDefault(_getWeb);

var _b0x = require('./b0x.js');

var _bignumber = require('bignumber.js');

var _bignumber2 = _interopRequireDefault(_bignumber);

var _logo = require('./logo.svg');

var _logo2 = _interopRequireDefault(_logo);

require('./App.css');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var startB0x = function startB0x() {
  return new Promise(function (resolve, reject) {
    var gasPrice = new _bignumber2.default(window.web3.toWei(21, 'gwei'));
    window.b0x = new _b0x.B0xJS(window.web3.currentProvider, {
      exchangeContractAddress: undefined,
      gasPrice: gasPrice,
      networkId: 50,
      orderWatcherConfig: undefined,
      tokenRegistryContractAddress: undefined,
      tokenTransferProxyContractAddress: undefined
    });
    resolve(window.b0x);
  });
};

var log = function log(type) {
  return console.log.bind(console, type);
};

var App = function (_Component) {
  _inherits(App, _Component);

  function App(props) {
    _classCallCheck(this, App);

    var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this, props));

    _this.state = {
      web3: null
    };
    return _this;
  }

  _createClass(App, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      var _this2 = this;

      // Get network provider and web3 instance.
      // See utils/getWeb3 for more info.

      _getWeb2.default.then(startB0x).then(console.log).then(function (results) {
        _this2.setState({
          web3: results.web3
        });

        // Instantiate contract once web3 provided.
        //this.instantiateContracts()
      }).catch(function (err) {
        //console.log('Error finding web3.')
        console.log('caught ' + err);
      });
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(
        'div',
        { className: 'App' },
        _react2.default.createElement(
          'header',
          { className: 'App-header' },
          _react2.default.createElement('img', { src: _logo2.default, className: 'App-logo', alt: 'logo' }),
          _react2.default.createElement(
            'h1',
            { className: 'App-title' },
            'b0x portal'
          )
        ),
        _react2.default.createElement(
          'p',
          { className: 'App-intro' },
          '...'
        )
      );
    }
  }]);

  return App;
}(_react.Component);

exports.default = App;