interface IEnvVariables {
  isProd: boolean;
  isClient: boolean;
  HOST_DOMAIN: string;
  GA_MEASUREMENT_ID: string;
  API_URL: string;
}

// build time
const config = {
  isProd: process.env.NODE_ENV === 'production',
  HostDomain: process.env.HOST_DOMAIN || 'localhost',
  GA_MEASUREMENT_ID: process.env['GA_MEASUREMENT_ID'] || '',
  API_URL: process.env.API_URL || 'http://localhost:8081',
};

const EnvVariables: IEnvVariables = {
  isProd: config.isProd,
  isClient: (() => typeof window !== 'undefined')(),
  HOST_DOMAIN: config.HostDomain,
  GA_MEASUREMENT_ID: config.GA_MEASUREMENT_ID,
  API_URL: config.API_URL,
};

export default EnvVariables;
