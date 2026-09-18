// Central place to read runtime configuration from `k6 run -e KEY=VALUE`.
// Every module should import ENV from here instead of touching __ENV directly.

const DEFAULTS = {
  BASE_URL: 'https://quickpizza.grafana.com',
  PROFILE: 'smoke',
  API_TOKEN: 'abcdef0123456789',
  HEADLESS: 'true',
  TAGS: '',
};

function read(key) {
  const value = __ENV[key];
  return value === undefined || value === '' ? DEFAULTS[key] : value;
}

export const ENV = {
  BASE_URL: read('BASE_URL').replace(/\/+$/, ''),
  PROFILE: read('PROFILE').toLowerCase(),
  API_TOKEN: read('API_TOKEN'),
  HEADLESS: read('HEADLESS') !== 'false',
  // Optional Gherkin tag filter for BDD tests, e.g. -e TAGS=@smoke
  TAGS: read('TAGS'),
};
