import { ENV } from '../../config/env.js';
import { getProfile } from '../../config/profiles.js';
import { getThresholds } from '../../config/thresholds.js';

/**
 * Build the k6 `options` object for a test file.
 *
 * @param {object} cfg
 * @param {'api'|'web'} cfg.kind        Which profile family to use.
 * @param {object}  [cfg.thresholds]    Extra/override thresholds.
 * @param {object}  [cfg.tags]          Extra global tags.
 * @param {string}  [cfg.scenarioName]  Name of the k6 scenario (default: `${kind}_${profile}`).
 * @param {object}  [cfg.scenario]      Overrides merged into the selected profile.
 */
export function buildOptions(cfg) {
  const { kind, thresholds = {}, tags = {}, scenario = {} } = cfg;
  const profileName = ENV.PROFILE;
  const scenarioName = cfg.scenarioName || `${kind}_${profileName}`;

  const profile = { ...getProfile(kind, profileName), ...scenario };

  return {
    scenarios: { [scenarioName]: profile },
    thresholds: { ...getThresholds(kind, profileName), ...thresholds },
    tags: { kind, profile: profileName, ...tags },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  };
}
