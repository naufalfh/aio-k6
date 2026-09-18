import http from 'k6/http';
import { ENV } from '../../config/env.js';
import { metrics } from '../../common/metrics.js';

// Thin wrapper around k6/http so every request in the framework:
//   - is relative to BASE_URL
//   - carries the default headers (JSON + auth token)
//   - feeds the custom metrics in common/metrics.js exactly once

function defaultHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `token ${ENV.API_TOKEN}`,
  };
}

function withDefaults(params = {}) {
  return {
    ...params,
    headers: { ...defaultHeaders(), ...(params.headers || {}) },
  };
}

function url(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${ENV.BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function track(res) {
  metrics(res);
  return res;
}

export const client = {
  get(path, params) {
    return track(http.get(url(path), withDefaults(params)));
  },

  post(path, body, params) {
    return track(http.post(url(path), body, withDefaults(params)));
  },

  postJson(path, obj, params) {
    return this.post(path, JSON.stringify(obj), params);
  },

  put(path, body, params) {
    return track(http.put(url(path), body, withDefaults(params)));
  },

  del(path, params) {
    return track(http.del(url(path), null, withDefaults(params)));
  },

  /** Safe JSON parse: returns null instead of throwing on non-JSON bodies. */
  json(res) {
    try {
      return res.json();
    } catch (_) {
      return null;
    }
  },
};
