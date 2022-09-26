'use strict';

const cp = require("child_process");

function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

function spinnerStart(spinnerText = 'loading', spinnerString = '|/-\\') {
  const Spinner = require('cli-spinner').Spinner
  const spinner = new Spinner(spinnerText + ' %s')
  spinner.setSpinnerString(spinnerString)
  spinner.start();
  return spinner
}

function sleep(timeout = 1000) {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

function exec(command, args, option) {
  const win32 = process.platform === 'win32';

  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args

  return require('child_process').spawn(cmd, cmdArgs, option || {})
}

function execAsync(command, args, option) {
  return new Promise((resolve, project) => {
    const p = exec(command, args, option)
    p.on('error', (e) => {
      reject(e)
    });
    p.on('exit', (c) => {
      resolve(c)
    })
  })
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
  exec,
  execAsync
};
