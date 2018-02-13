module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` },
      "/orders": { page: `/orders` },
      "/borrowing": { page: `/borrowing` },
      "/lending": { page: `/lending` },
      "/bounties": { page: `/bounties` }
    };
  }
};
