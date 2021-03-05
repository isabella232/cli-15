const {spawn} = require('child_process');
const {resolve, join} = require('path');
const {config} = require('dotenv');
config();

function getEnvVariables() {
  // TODO: CDX-99: assign port dynamically
  // The Vue CLi has a --proxy flag.
  const searchTokenServerPort = 4000;
  var envVars = Object.assign(
    {
      SERVER_PORT: searchTokenServerPort,
      API_KEY: process.env.VUE_APP_API_KEY,
      ORGANIZATION_ID: process.env.VUE_APP_ORGANIZATION_ID,
      PLATFORM_URL: process.env.VUE_APP_PLATFORM_URL,
      USER_EMAIL: process.env.VUE_APP_USER_EMAIL,
    },
    process.env
  );
  return envVars;
}

function startServer() {
  const serverPath = join(process.cwd(), 'server');
  const child = spawn('npm', ['run', 'start'], {
    stdio: 'inherit',
    env: getEnvVariables(),
    cwd: resolve(serverPath),
  });
  process.on('SIGINT', () => {
    child.kill();
  });
}

function main() {
  startServer();
}

main();