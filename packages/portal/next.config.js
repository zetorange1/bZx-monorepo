module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` }
    };
  },
  assetPrefix: process.env.IS_STAGING ? "/new" : ""
};
