const fs = require('fs');
const path = require('path');
const glob = require('glob');

module.exports = function(api) {
  let cordovaJS, cordovaPluginsJS;
  let plugins = {};

  let platform = process.env['npm_config_CORBER_PLATFORM'];
  let basePath = path.join('corber', 'cordova', 'platforms');
  basePath = path.join(basePath, platform, 'platform_www');

  //Loads cordova JS assets to memory
  const loadCordovaAssets = function() {
    cordovaJS = fs.readFileSync(path.join(basePath, 'cordova.js'), 'utf-8');
    cordovaPluginsJS = fs.readFileSync(path.join(basePath, 'cordova_plugins.js'), 'utf-8');

    let installedPlugins = glob.sync(path.join(basePath, 'plugins/**/*.js'));
    installedPlugins.forEach((plugin) => {
      let pluginName = plugin.split('plugins')[1];
      pluginName = path.join('/', 'plugins', pluginName);

      let contents = fs.readFileSync(plugin, 'utf-8');
      plugins[pluginName] = contents;
    });
  };

  //Intercept Requests - return with our cache if Cordova assets
  //eslint-disable-next-line no-unused-vars
  const injectCordovaJS = (req, res, next) => {
    return (req, res, next) => {
      if (req.url === '/cordova.js') {
        res.send(cordovaJS);
        return;
      } else if (req.url === '/cordova_plugins.js') {
        res.send(cordovaPluginsJS);
        return;
      } else if (Object.keys(plugins).indexOf(`${req.url}`) > -1) {
        res.send(plugins[req.url]);
      } else {
        next();
      }
    }
  };

  //Stubs cordova.js & cordova_plugins.js to index.html
  api.chainWebpack(webpackConfig => {
    webpackConfig.plugin('cordova-plugins-js-corber')
      .use(require('html-webpack-include-assets-plugin'), [{
        assets: 'cordova_plugins.js',
        append: false,
        publicPath: false
      }])

    webpackConfig.plugin('cordova-js-corber')
      .use(require('html-webpack-include-assets-plugin'), [{
        assets: 'cordova.js',
        append: false,
        publicPath: false
      }])
  });

  api.configureDevServer(app => {
    loadCordovaAssets();
    app.use(injectCordovaJS());
  });
};
