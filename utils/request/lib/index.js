'use strict';
const axios = require('axios');

const BASE_URL = process.env.SHINE_CLI_BASE_URL ? process.env.SHINE_CLI_BASE_URL : 'http://denny.cli.xyz:7001/'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 6000,
})

request.interceptors.response.use(response => {
  return response.data;
}, error => {
  return Promise.reject(error)
})

module.exports = request
