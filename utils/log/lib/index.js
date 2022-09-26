'use strict';
const log = require('npmlog')
log.heading = 'shine';     // 修改前缀
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";     // 修改debug模式
log.addLevel('success', 2000, {fg: 'green', bold: true});   //  自定义log

function index() {
    log.info('cli', 'test')
}

module.exports = log;
