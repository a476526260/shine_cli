'use strict';
const urlJoin = require('url-join')
const semver = require('semver')
const axios = require('axios')

function getNpmInfo(npmName, url) {
  if(!npmName) {
    return null
  }
  const path = url || getDefaultUrl()
  const httpUrl = urlJoin(path, npmName)
  return axios.get(httpUrl).then(res => {
    if(res.status === 200) {
      return res.data
    }
    return null
  }).catch(err => {
    return Promise.reject(err)
  })
}

function getDefaultUrl(isOriginal = true) {
  return isOriginal? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

async function getNpmVersions(npmName, url) {
  const data = await getNpmInfo(npmName, url)
  if(data) {
    return Object.keys(data.versions)
  }else {
    return []
  }
}

function getNpmSemverVersions(baseVersion, versions) {
  return versions.filter(version => semver.satisfies(version, `>${baseVersion}`, '')).sort((a, b) => semver.gt(b, a) ? 1 : -1)
}

async function getNpmSemverVersion(baseVersion, npmName, path) {
  const versions = await getNpmVersions(npmName, path)
  const gtVersions = getNpmSemverVersions(baseVersion, versions)
  if(gtVersions && gtVersions.length > 0) {
    return gtVersions[0]
  }
  return null
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion
};
