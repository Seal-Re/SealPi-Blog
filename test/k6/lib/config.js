// Centralized config read from env. k6 exposes env via __ENV.
export const BASE_URL = __ENV.BASE_URL || 'https://blog.sealpi.cn';
export const POOL_SIZE = parseInt(__ENV.POOL_SIZE || '30', 10);
export const MAX_VU = parseInt(__ENV.MAX_VU || '200', 10);
export const SCENARIO = __ENV.SCENARIO || 'unnamed';

export const HTTP_DEFAULTS = {
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'k6-loadtest/1.0 (+blog.sealpi.cn)',
  },
  timeout: '30s',
};
