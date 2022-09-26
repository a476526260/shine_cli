'use strict';
const path = require("path");

function formatPath(pathString) {
  if (pathString && typeof pathString === 'string') {
    const sep = path.sep;
    if (sep === '/') {
      return pathString
    } else {
      return pathString.replace(/\\/g, '/')
    }
  }
  return pathString
}

module.exports = formatPath;
