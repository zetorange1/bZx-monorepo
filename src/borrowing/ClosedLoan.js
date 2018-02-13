export default () => <div>Closed Loan</div>;

// For closed loans, the above details should be provided as well, along with the closed date/time.
//   - trades can't be opened using a closed loan
//   - note: We don't allow margin "deposits" for closed loans.
//           Also, there is no need to provide a withdraw function for closed loans, since all margin is automatically refunded when the loan closes
