module.exports = {
  apps: [{
    name: 'express-winston-boilerplate',
    script: 'app.js',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],
};
