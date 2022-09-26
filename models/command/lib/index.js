'use strict';
const semver= require('semver')
const colors = require('colors')
const log = require('@shine_cli/log')
const LOWEST_NODE_VERSION = '12.0.0'
class Command{
  constructor(args) {
    if(!args) {
      throw new Error('参数不能为空')
    }
    if(!Array.isArray(args)) {
      throw new Error('参数必须为数组')
    }
    if(args.length < 1) {
      throw new Error('参数列表不能为空')
    }


    this._args = args
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.checkNodeVersion())

      chain = chain.then(() => this.initArgs())

      chain = chain.then(() =>  this.init())

      chain = chain.then(() => this.exec())

      chain.catch(err => {
        log.error(err.message)
      })
    })
  }

  init() {
    throw new Error('init function must be defined')
  }

  exec() {
    throw new Error('exec function must be defined')
  }

  /**
   * 检查node版本号
   */

  checkNodeVersion() {
    // 获取当前node 版本号
    const currentNodeVersion = process.version
    // 比对最低版本号
    const lowestNodeVersion = LOWEST_NODE_VERSION
    if (!semver.gte(currentNodeVersion, lowestNodeVersion)) {
      throw new Error(colors.red(`Node版本过低，请安装v${lowestNodeVersion}以上版本的Node.js`))
    }
  }

  initArgs() {
    this._cmd = this._args.slice(-1)[0]
    this._args = this._args.slice(0, this._args.length-1)
  }
}

module.exports = Command;
