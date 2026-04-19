'use strict';

function success(data = {}, meta = {}) {
  return { success: true, data, meta };
}

function error(code, message) {
  return { success: false, error: { code, message } };
}

module.exports = { success, error };
