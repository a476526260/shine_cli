'use strict';

module.exports = core;

const pkg = require('../package.json')
const log = require('@shine_cli/log')
const semver = require('semver')
const colors = require('colors')
const constant = require('./const')
function core() {
  try {
    checkPkgVersion()
    checkNodeVersion()
  } catch (err) {
    log.error(err.message)
  }
}

/**
 * 检查node版本号
 */

function checkNodeVersion() {
  // 获取当前node 版本号
  const currentNodeVersion = process.version
  // 比对最低版本号
  const lowestNodeVersion = constant.LOWEST_NODE_VERSION
  if(!semver.gte(currentNodeVersion, lowestNodeVersion)) {
    throw new Error(colors.red( `Node版本过低，请安装v${lowestNodeVersion}以上版本的Node.js`))
  }

}

/**
 * 检查版本号
 *
 */
function checkPkgVersion() {
  log.notice(pkg.version)
}
