// const WorkerPlugin = require("worker-plugin");

module.exports = function override(config, env) {
  //do stuff with the webpack config...
  // config.plugins.push(new WorkerPlugin());
  config.module.rules.push({
    test: /\.worker\.js$/,
    use: { loader: 'worker-loader' }
  })
  return config;
};
