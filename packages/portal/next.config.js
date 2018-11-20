const glob = require('glob');

module.exports = {
  exportPathMap() {
    const pathMap = {}
    glob.sync('pages/**/*.jsx', { ignore: 'pages/_document.jsx' }).forEach(s => {
      const path = s.split(/(pages|\.)/)[2].replace(/^\/index$/, '/')
      pathMap[path] = { page: path }
    })
    return pathMap;
  },
  assetPrefix: process.env.IS_STAGING ? "/staging" : ""
};

/*
module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` }
    };
  },
  assetPrefix: process.env.IS_STAGING ? "/staging" : ""
};
*/