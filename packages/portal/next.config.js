module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` },
      "/tokensale": { page: '/', query: { p: `tokensale` } }
    };
  },
  assetPrefix: process.env.IS_STAGING ? "/new" : ""
};
