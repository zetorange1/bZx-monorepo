import * as utils from './utils';

export default class B0xJS {
  static generatePseudoRandomSalt = utils.generatePseudoRandomSalt;
  static noop = utils.noop;

  constructor(props) {
    console.log(props);
  }
}
