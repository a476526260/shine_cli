'use strict';
const path = require("path");
const constant = require('./const')
const pkg = require('../package.json')
const log = require('@shine_cli/log')
const exec = require('@shine_cli/exec')
const semver = require('semver')
const colors = require('colors')
const commander = require('commander')
const userHome = require('user-home')
const pathExists = require('path-exists').sync

const program = new commander.Command();

async function core() {
  try {
    await prepare()
    registerCommand()
  } catch (err) {
    log.error(err.message)
  }
}

async function prepare() {
  checkPkgVersion()
  checkRoot()
  checkUserHome()
  checkEnv()
  await checkGlobalUpdates()
}

/**
 * 检查版本号
 *
 */
function checkPkgVersion() {
  log.notice("shine-cli version:", pkg.version)
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
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前用户主目录不存在！'))
  }
}

/**
 * 检查环境变量
 */
function checkEnv() {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  if (pathExists(dotenvPath)) {
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

  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DeFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
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

/**
 * 注册命令
 */
function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

  // 注册命令
  program.command('init [projectName]')
    .option('-f --force', '是否强制初始化项目')
    .action(exec)

  // 开启debug模式
  program.on('option:debug', () => {
    if (program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'verbose'
    }
    log.level = process.env.LOG_LEVEL
  })

  // 指定targetPath

  program.on('option:targetPath', () => {
    process.env.CLI_TARGET_PATH = program.opts().targetPath
  })

  // 监听未知命令
  program.on('command:*', (obj) => {
    const availableCommands = program.commands.map(cmd => cmd.name())
    console.log(colors.red('未知的命令：' + obj[0]))
    if (availableCommands.length > 0) {
      console.log(colors.red('可用命令：' + availableCommands.join(",")))
    }
  })
  program.parse(process.argv)

  if (program.args && program.args.length < 1) {
    program.outputHelp();
  }
}


module.exports = core;
