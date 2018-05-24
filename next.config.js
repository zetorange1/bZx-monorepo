module.exports = {
  exportPathMap() {
    return {
      "/": { page: `/` },
      "/balances": { page: `/balances` },
      "/orders": { page: `/orders` },
      "/borrowing": { page: `/borrowing` },
      "/lending": { page: `/lending` },
      "/bounties": { page: `/bounties` }
    };
  }
};
