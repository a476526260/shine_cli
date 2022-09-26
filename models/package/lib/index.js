'use strict';
const {isObject} = require('@shine_cli/utils')
const path = require("path")
const fse = require('fs-extra')
const {getDefaultUrl, getNpmLatestVersion} = require('@shine_cli/get-npm-info')
const npminstall = require('npminstall')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const formatPath = require('@shine_cli/format-path')

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类参数不能为空")
    }

    if (!isObject(options)) {
      throw new Error("Package类参数必须为对象")
    }
    this.targetPath = options.targetPath;
    this.storeDir = options.storeDir;
    this.packageName = options.packageName;
    this.packageVersion = options.packageVersion;
    // package 缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }

  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir)
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
  }

  // 判断当前package是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare()
      return pathExists(this.cacheFilePath)
    } else {
      return pathExists(this.targetPath)
    }
  }

  // 安装paakage
  async install() {
    await this.prepare()
    return npminstall({
      root: this.targetPath, storePath: this.storeDir, registry: getDefaultUrl(), pkgs: [{
        name: this.packageName, version: this.packageVersion
      }]
    })
  }

  // 更新package

  async update() {
    await this.prepare()
    // 1. 获取最新版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    // 2. 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)

    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath, storePath: this.storeDir, registry: getDefaultUrl(), pkgs: [{
          name: this.packageName, version: latestPackageVersion
        }]
      })
      this.packageVersion = latestPackageVersion
    }else {
      this.packageVersion = latestPackageVersion
    }
    return latestFilePath
  }

  // 获取入口文件
  getRootFilePath() {
    function _rootFilePath(targetPath) {
      // 1. 获取package.json所在目录  -pkg-dir
      const dir = pkgDir(targetPath)
      if (dir) {
        // 2. 读取package.json  require
        const pkgFile = require(path.resolve(dir, 'package.json'))
        // 3. main/lib -- path
        if (pkgFile && pkgFile.main) {
          // 4. 路径的兼容（macos/windows）
          return formatPath(path.resolve(dir, pkgFile.main))
        }
      }
      return null
    }
    if(this.storeDir) {
      return _rootFilePath(this.cacheFilePath)
    }else {
      return _rootFilePath(this.targetPath)
    }
  }
}


module.exports = Package;

