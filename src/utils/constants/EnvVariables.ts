interface IEnvVariables {
  isProd: boolean;
  isClient: boolean;
  HOST_DOMAIN: string;
  GA_MEASUREMENT_ID: string;
  API_URL: string;
  PACIFICA_BUILDER_CODE: string;
  PACIFICA_MAX_FEE_RATE: string;
}

// build time
const config = {
  isProd: process.env.NODE_ENV === 'production',
  HostDomain: process.env.HOST_DOMAIN || 'localhost',
  GA_MEASUREMENT_ID: process.env['GA_MEASUREMENT_ID'] || '',
  API_URL: process.env.API_URL || 'http://localhost:8081',
  PACIFICA_BUILDER_CODE: process.env.PACIFICA_BUILDER_CODE || 'phalanx',
  PACIFICA_MAX_FEE_RATE:
    process.env.PACIFICA_MAX_FEE_RATE?.toString() || '0.001',
};

const EnvVariables: IEnvVariables = {
  isProd: config.isProd,
  isClient: (() => typeof window !== 'undefined')(),
  HOST_DOMAIN: config.HostDomain,
  GA_MEASUREMENT_ID: config.GA_MEASUREMENT_ID,
  API_URL: config.API_URL,
  PACIFICA_BUILDER_CODE: config.PACIFICA_BUILDER_CODE,
  PACIFICA_MAX_FEE_RATE: config.PACIFICA_MAX_FEE_RATE,
};

export default EnvVariables;
