'use strict';

module.exports = core;

const path = require("path");
const constant = require('./const')
const pkg = require('../package.json')
const log = require('@shine_cli/log')
const semver = require('semver')
const colors = require('colors')
const userHome = require('user-home')
const pathExists = require('path-exists')

let args;

async function core() {
  try {
    checkPkgVersion()
    checkNodeVersion()
    checkRoot()
    checkUserHome()
    checkInputArgs()
    checkEnv()
    await checkGlobalUpdates()
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

/**
 * 检查root
 */

function checkRoot() {
  const rootCheck = require('root-check')
  rootCheck()
}

/**
 * 检查用户主目录
 */
function checkUserHome() {
  if(!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前用户主目录不存在！'))
  }
}

/**
 * 检查入参
 */
function checkInputArgs() {
  const minimist = require('minimist')
  args = minimist(process.argv.slice(2))
  checkArgs()
}

function checkArgs() {
  if(args.debug) {
    process.env.LOG_LEVEL = 'verbose'
  }else {
    process.env.LOG_LEVEL = 'info'
  }
  log.level = process.env.LOG_LEVEL
}

/**
 * 检查环境变量
 */
function checkEnv() {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  if(pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    })
  }
  createDefaultConfig()
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome
  }

  if (process.env.CLI_HOME){
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  }else {
    cliConfig['cliHome'] = path.join(userHome, constant.DeFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH  = cliConfig.cliHome
}

/**
 * 检查更新
 */
async function checkGlobalUpdates() {
  const currentVersion = pkg.version
  const npmName = pkg.name
  const {getNpmSemverVersion} = require('@shine_cli/get-npm-info')
  // 获取所有版本号
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName)
  // 版本号比对
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(colors.yellow(`请更新${npmName}, 当前版本${currentVersion}，最新版本${lastVersion}
           更新命令: npm install -g ${npmName}`))
  }
}
