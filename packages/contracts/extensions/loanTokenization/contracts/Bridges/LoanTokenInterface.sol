/**
 * Copyright 2017-2020, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

interface LoanTokenInterface {
    function symbol() external view returns (string memory);
    function loanTokenAddress() external view returns (address);

    function mintWithEther(address receiver) external payable returns (uint256 mintAmount);
    function mint(address receiver, uint256 depositAmount) external returns (uint256 mintAmount);

    function flashBorrowToken(
        uint256 borrowAmount,
        address borrower,
        address target,
        string calldata signature,
        bytes calldata data
    )
        external
        payable;

    function borrowTokenFromDeposit(
        uint256 borrowAmount,
        uint256 leverageAmount,
        uint256 initialLoanDuration, // duration in seconds
        uint256 collateralTokenSent, // set to 0 if sending ETH
        address borrower,
        address receiver,
        address collateralTokenAddress, // address(0) means ETH and ETH must be sent with the call
        bytes calldata loanData // arbitrary order data
    )
        external
        payable
        returns (bytes32 loanOrderHash);
}
