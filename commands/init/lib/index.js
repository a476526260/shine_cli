'use strict';

const fs = require('fs');
const path = require("path");
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const glob = require('glob');
const ejs = require('ejs');
const userHome = require('user-home');
const Command = require('@shine_cli/command');
const Package = require('@shine_cli/package');
const log = require('@shine_cli/log');
const {spinnerStart, sleep, execAsync} = require('@shine_cli/utils')

const getProjectTemplate = require('./getProjectTemplate');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const whiteCommand = ['npm', 'cnpm', 'yarn']

class InitCommand extends Command {
  init() {
    this.projectName = this._args[0] || ''
    this.force = !!this._args[1].force
    log.verbose('projectName', this.projectName);
    log.verbose('force', this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2. 下载模板
        log.verbose('projectInfo', projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate()
      }
    } catch (e) {
      log.error(e.message);
      if (process.env.LOG_LEVEL === 'verbose') {
        console.log(e);
      }
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate()
      } else {
        throw new Error('无法识别的项目类型')
      }
    } else {
      throw new Error('项目模板不存在')
    }
  }

  checkCommand(command) {
    if (whiteCommand.includes(command)) {
      return command
    }
    return null
  }

  async execCommand(command, msg) {
    let result;
    if (command) {
      const installCmd = command.split(" ")
      const cmd = this.checkCommand(installCmd[0])
      if (!cmd) {
        throw new Error('命令不存在，' + cmd)
      }
      const args = installCmd.slice(1)
      result = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      })
    }
    if (result !== 0) {
      log.error(msg)
    }
    return result
  }

  async ejsRender(option) {
    const cwd = process.cwd();
    const projectInfo = this.projectInfo;
    return new Promise((resolve, reject) => {

      glob('**', {
        ignore: option.ignore,
        cwd,
        nodir: true
      }, (err, files) => {
        if (err) {
          reject(err)
        }
        Promise.all(files.map(file => {
          const filePath = path.join(cwd, file)
          return new Promise((resolve, reject) => {
            ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
              if(err) {
                reject(err)
              }else {
                fse.writeFileSync(filePath, result)
                resolve(result)
              }
            })
          })
        })).then(() => {
          resolve()
        }).catch(err => {
          reject(err)
        })
      })
    })
  }

  async installNormalTemplate() {
    // 拷贝模板代码至当前目录
    const spinner = spinnerStart('正在安装模板');
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      const targetPath = process.cwd();
      fse.ensureDirSync(targetPath)
      fse.ensureDirSync(templatePath)
      fse.copySync(templatePath, targetPath)
    } catch (e) {
      throw e
    } finally {
      spinner.stop(true)
      log.success('模板安装成功')
    }
    const templateIgnore = this.templateInfo.ignore || [];
    const ignore = ['node_modules/**', ...templateIgnore]
    await this.ejsRender({ignore})
    // 安装依赖
    const {installCommand, startCommand} = this.templateInfo;
    if (installCommand) {
      await this.execCommand(installCommand, '依赖安装失败')
    }
    // 启动命令执行
    if (startCommand) {
      await this.execCommand(startCommand, '依赖安装失败')
    }
  }

  async installCustomTemplate() {
    console.log('自定义安装')
  }

  async downloadTemplate() {
    const {projectTemplate} = this.projectInfo
    console.log(this.projectInfo, 'projectInfo')
    const templateInfo = this.template.find(item => item.npmName === projectTemplate)
    const targetPath = path.resolve(userHome, '.shine_cli', 'template');
    const storeDir = path.resolve(userHome, '.shine_cli', 'template', 'node_modules');
    this.templateInfo = templateInfo;
    console.log(templateInfo, 'templateInfo')
    const {npmName, version} = templateInfo

    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version
    })

    if (!await templateNpm.exists()) {
      const spinner = spinnerStart('下载模板')
      await sleep()
      try {
        await templateNpm.install()
      } catch (err) {
        throw err
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          log.success('模板下载成功')
          this.templateNpm = templateNpm
        }
      }
    } else {
      const spinner = spinnerStart('更新模板')
      await sleep()
      try {
        await templateNpm.update()
      } catch (err) {
        throw err
      } finally {
        spinner.stop(true)
        if (await templateNpm.exists()) {
          log.success('模板更新成功')
          this.templateNpm = templateNpm
        }
      }
    }
  }

  async prepare() {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error('项目模板不存在');
    }
    this.template = template;
    // 1. 判断当前目录是否为空
    const localPath = process.cwd();

    if (!this.isDirEmpty(localPath)) {
      let ifContinue = false;
      if (!this.force) {
        // 询问是否继续创建
        ifContinue = (await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？',
        })).ifContinue;
        if (!ifContinue) {
          return;
        }
      }
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 给用户做二次确认
        const {confirmDelete} = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否确认清空当前目录下的文件？',
        });
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    return this.getProjectInfo();
  }

  async getProjectInfo() {
    function isValidName(v) {
      return /^(@[a-zA-Z0-9-_]+\/)?[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v);
    }

    let projectInfo = {};
    let isProjectNameValid = false;
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    // 1. 选择创建项目或组件
    const {type} = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [{
        name: '项目',
        value: TYPE_PROJECT,
      }, {
        name: '组件',
        value: TYPE_COMPONENT,
      }],
    });
    log.verbose('type', type);
    this.template = this.template.filter(item => item.tag.includes(type));
    const title = type === TYPE_PROJECT ? '项目' : '组件';
    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: `请输入${title}名称`,
      default: '',
      validate: function (v) {
        const done = this.async();
        setTimeout(function () {
          // 1.首字符必须为英文字符
          // 2.尾字符必须为英文或数字，不能为字符
          // 3.字符仅允许"-_"
          if (!isValidName(v)) {
            done(`请输入合法的${title}名称`);
            return;
          }
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v;
      },
    };
    const projectPrompt = [];
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt);
    }
    projectPrompt.push({
      type: 'input',
      name: 'projectVersion',
      message: `请输入${title}版本号`,
      default: '1.0.0',
      validate: function (v) {
        const done = this.async();
        setTimeout(function () {
          if (!(!!semver.valid(v))) {
            done('请输入合法的版本号');
            return;
          }
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        if (!!semver.valid(v)) {
          return semver.valid(v);
        } else {
          return v;
        }
      },
    }, {
      type: 'list',
      name: 'projectTemplate',
      message: '请选择项目模板',
      choices: this.createTemplateChoice()
    });
    if (type === TYPE_PROJECT) {
      // 2. 获取项目的基本信息
      const project = await inquirer.prompt(projectPrompt);
      projectInfo = {
        ...projectInfo,
        type,
        ...project,
      };
    } else if (type === TYPE_COMPONENT) {

    }

    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, '')
    }

    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }

    return projectInfo;
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter(file => (
      !file.startsWith('.') && ['node_modules'].indexOf(file) < 0
    ));
    return !fileList || fileList.length <= 0;
  }

  createTemplateChoice() {
    return this.template.map(item => ({
      name: item.name,
      value: item.npmName
    }))
  }

}

function init(argv) {
  log.verbose('argv', argv);
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
