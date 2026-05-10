import http from 'k6/http';
import { sleep, check } from "k6";
import { Gauge, Rate, Counter, Trend} from "k6/metrics";

let successRateDuration = new Rate("success_rate_duration");
let successRateResponseCode = new Rate("success_rate_resp_code");
let errorRateDuration = new Rate("error_rate_duration");
let timeoutRateDuration = new Rate("timeout_rate_duration");
let errorRateResponseCode = new Rate("error_rate_resp_code");
let status200 = new Counter('status_200');
let status500 = new Counter('status_500');
let status504 = new Counter('status_504');
let status503 = new Counter('status_503');
let status520 = new Counter('status_520');
let status400 = new Counter('status_400');
let status403 = new Counter('status_403');
let status429 = new Counter('status_429');

export const metrics = (res) => {
  successRateResponseCode.add(res.status === 200);
  errorRateResponseCode.add(res.status !== 200);
  successRateDuration.add(res.timings.duration <= 500);
  errorRateDuration.add(res.timings.duration > 500);
  timeoutRateDuration.add(res.timings.duration > 60000);
  status200.add(res.status === 200);
  status500.add(res.status === 500);
  status504.add(res.status === 504);
  status503.add(res.status === 503);
  status520.add(res.status === 520);
  status400.add(res.status === 400);
  status403.add(res.status === 403);
  status429.add(res.status === 429);

  const checkRes = check(res, {
      "Response code was not 400": (r) => r.status !== 400,
      "Response code was not 403": (r) => r.status !== 403,
      "Response code was not 429": (r) => r.status !== 429,
      "Response code was not 500": (r) => r.status !== 500,
      "Response code was not 504": (r) => r.status !== 504,
      "Response code was not 503": (r) => r.status !== 503,
      "Response code was not 520": (r) => r.status !== 520,
  })
};