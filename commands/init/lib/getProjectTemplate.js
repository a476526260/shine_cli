const request = require('@shine_cli/request');

module.exports = function() {
  return request({
    url: '/project/template',
  });
};
