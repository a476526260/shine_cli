'use strict';
const { exec: spawn } = require('@shine_cli/utils')
const Package = require('@shine_cli/package');
const log = require('@shine_cli/log')
const path = require("path");
const cp = require('child_process')
const SETTINGS = {
  'init': '@shine_cli/core',
}
const CACHE_DIR = 'dependencies';
async function exec() {
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  let storeDir = '';
  let pkg = null;
  log.verbose('targetPath', targetPath)
  log.verbose('homePath', homePath)

  const cmdObj = arguments[arguments.length -1]
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';

  if(!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);    // 生成缓存路径
    storeDir = path.resolve(targetPath, 'node_modules')

    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    })
    if(await pkg.exists()) {
      // 更新
     await pkg.update()
    }else {
      // 安装
      await pkg.install()
    }
  }else{
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    })
  }
  const rootFile = pkg.getRootFilePath()
  if (rootFile) {
    try{
      const args = Array.from(arguments)
      const cmd = args.slice(-1)[0]
      const o = Object.create(null)
      Object.keys(cmd).forEach(key => {
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
          o[key] = cmd[key]
        }
      })
      args[args.length -1] = o

      const code = `require('${rootFile }').call( null, ${JSON.stringify(args)})`
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      })
      child.on('error', e => {
        log.error(e.message)
        process.exit(1)
      })
      child.on('exit', e => {
        log.verbose('命令执行成功', + e)
        process.exit(e)
      })

    } catch(e) {
      log.error(e.message)
    }
  }
}
module.exports = exec;
