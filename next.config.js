const version = require('./package.json').version;

const isProd = process.env.NODE_ENV === 'production';

function getEnvValue(key, default_value = '') {
  return process.env.hasOwnProperty(key) ? process.env[key] : default_value;
}

const PHASE_PRODUCTION_BUILD = 'phase-production-build';
const PHASE_DEVELOPMENT_SERVER = 'phase-development-server';

function parseEnvVars() {
  return {
    // for web info
    HOST_DOMAIN: getEnvValue('NEXT_APP_HOST_DOMAIN', ''),
    API_URL: getEnvValue('NEXT_APP_API_URL', 'http://localhost:8081'),
    // for build
    GA_MEASUREMENT_ID: getEnvValue('NEXT_APP_GA_MEASUREMENT_ID', ''),
    // for test
    TEST_MODE: getEnvValue('NEXT_APP_TEST_MODE', 'false'),
    // local only: set NEXT_APP_HIDE_DEV_IMAGES=true in .env to hide card images while developing
    HIDE_DEV_IMAGES: getEnvValue('NEXT_APP_HIDE_DEV_IMAGES', 'false'),
    PACIFICA_BUILDER_CODE: getEnvValue(
      'NEXT_APP_PACIFICA_BUILDER_CODE',
      'phalanx',
    ),
    PACIFICA_MAX_FEE_RATE: getEnvValue(
      'NEXT_APP_PACIFICA_MAX_FEE_RATE',
      '0.001',
    ),
  };
}

// noinspection JSUnusedLocalSymbols
const NextConfig = (phase, { defaultConfig }) => {
  // noinspection JSValidateTypes
  /**
   * @type {import('next').NextConfig}
   */
  const config = {
    // ...defaultConfig,
    // Next dev with React 18, Always render twice
    // https://github.com/vercel/next.js/issues/35822
    reactStrictMode: isProd,
    // productionBrowserSourceMaps: true,
    serverRuntimeConfig: {
      // Will only be available on the server side
    },
    publicRuntimeConfig: {
      // Will be available on both server and client
    },
    env: {
      isProd: isProd ? '1' : '0',
      ...parseEnvVars(),
      VERSION: version,
    },
    typescript: { tsconfigPath: './tsconfig.json' },
    webpack: (cfg, ctx) => {
      cfg.resolve.fallback = { fs: false, net: false, tls: false };
      cfg.plugins = cfg.plugins || [];
      const { dev, isServer, buildId } = ctx;
      if (isServer) {
        return cfg;
      }
      console.log({ dev, isServer, buildId });
      return cfg;
    },
    images: {
      disableStaticImages: true,
    },
    experimental: {},
  };
  if (phase === PHASE_PRODUCTION_BUILD) {
    config.output = 'export';
    config.distDir = 'build';
  }
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    config.rewrites = async function () {
      // rewrites mapping feature like AWS cloudfront 403 redirect to index.html
      // when using next dev or start to simulate next export mode
      return [
        {
          source: '/:any*',
          destination: '/',
        },
      ];
    };
  }

  if (isProd) {
    // config.swcMinify = true;
    config.compiler = {
      removeConsole: {
        exclude: ['error', 'warn', 'info'],
      },
    };
  }

  // console.log({ env: config.env });
  return config;
};

module.exports = NextConfig;
