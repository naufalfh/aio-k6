import { group, check } from 'k6';
import exec from 'k6/execution';
import { ENV } from '../../config/env.js';
import { parseFeature } from './gherkin.js';
import { findStep } from './registry.js';

/**
 * Convert a file:// URL (as returned by import.meta.resolve) into a plain,
 * percent-decoded filesystem path. k6's open() does not decode %20 etc. in
 * URLs, which breaks projects living in directories with spaces.
 */
function toLocalPath(fileUrl) {
  if (!/^file:\/\//i.test(fileUrl)) return fileUrl;
  let p = decodeURIComponent(fileUrl.replace(/^file:\/\//i, ''));
  // file:///E:/dir -> /E:/dir -> E:/dir (Windows drive letter)
  if (/^\/[A-Za-z]:\//.test(p)) p = p.slice(1);
  return p;
}

/**
 * Read and parse a .feature file. MUST be called in the init context
 * (top level of the test file), because k6's open() is only available there.
 *
 * @param {string} path  Path relative to the project root, e.g. 'features/api/order-pizza.feature'
 */
export function loadFeature(path) {
  const normalized = path.replace(/^\/+/, '');
  // This module lives in src/bdd/, so the project root is two levels up.
  // import.meta.resolve() makes the path relative to THIS file regardless of
  // which test script called us (and is the k6-recommended future-proof form).
  const source = open(toLocalPath(import.meta.resolve(`../../${normalized}`)));
  const feature = parseFeature(source);
  feature.path = normalized;
  return feature;
}

function parseTagFilter(raw) {
  const tags = (raw || '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    include: tags.filter((t) => !t.startsWith('~') && !t.startsWith('not:')).map((t) => (t.startsWith('@') ? t : `@${t}`)),
    exclude: tags
      .filter((t) => t.startsWith('~') || t.startsWith('not:'))
      .map((t) => t.replace(/^(~|not:)/, ''))
      .map((t) => (t.startsWith('@') ? t : `@${t}`)),
  };
}

function scenarioSelected(scenario, filter) {
  if (filter.exclude.some((t) => scenario.tags.includes(t))) return false;
  if (filter.include.length === 0) return true;
  return filter.include.some((t) => scenario.tags.includes(t));
}

/**
 * Select scenarios according to `-e TAGS=...` (e.g. "@smoke", "@smoke,@api", "~@slow").
 */
export function selectScenarios(feature, tagFilter = ENV.TAGS) {
  const filter = parseTagFilter(tagFilter);
  return feature.scenarios.filter((s) => scenarioSelected(s, filter));
}

async function runSteps(steps, world) {
  for (const step of steps) {
    const { fn, args } = findStep(step);
    const result = fn.apply(world, args);
    if (result && typeof result.then === 'function') {
      await result;
    }
  }
}

function runStepsSync(steps, world) {
  for (const step of steps) {
    const { fn, args } = findStep(step);
    const result = fn.apply(world, args);
    if (result && typeof result.then === 'function') {
      throw new Error(
        `Step "${step.keyword} ${step.text}" is async but the runner is in sync (group) mode. ` +
          'Use runFeature(feature, world, { async: true }).',
      );
    }
  }
}

/**
 * Execute every selected scenario of a feature.
 *
 * @param {object} feature   Result of loadFeature()
 * @param {object} world     Shared context passed as `this` to every step (page, lastResponse, ...)
 * @param {object} [opts]
 * @param {boolean} [opts.async=false]
 *        false -> each scenario is wrapped in k6 group() (nice summary; steps must be sync, e.g. API).
 *        true  -> steps are awaited (required for k6/browser). Scenario name is applied as a
 *                 metric tag `bdd_scenario` instead of a group, since group() does not support async.
 * @param {string} [opts.tags]  Tag filter override (defaults to -e TAGS).
 */
export async function runFeature(feature, world = {}, opts = {}) {
  const scenarios = selectScenarios(feature, opts.tags !== undefined ? opts.tags : ENV.TAGS);
  if (scenarios.length === 0) {
    throw new Error(`No scenarios selected in "${feature.name}" (TAGS="${ENV.TAGS}")`);
  }

  for (const scenario of scenarios) {
    const label = `Scenario: ${scenario.name}`;
    const steps = feature.background.concat(scenario.steps);
    world.scenario = scenario;
    world.feature = feature;

    if (opts.async) {
      exec.vu.metrics.tags.bdd_feature = feature.name;
      exec.vu.metrics.tags.bdd_scenario = scenario.name;
      let passed = false;
      try {
        await runSteps(steps, world);
        passed = true;
      } finally {
        check(passed, { [`${label} passed`]: (p) => p === true });
        delete exec.vu.metrics.tags.bdd_scenario;
        delete exec.vu.metrics.tags.bdd_feature;
      }
    } else {
      group(label, () => runStepsSync(steps, world));
    }
  }
}
