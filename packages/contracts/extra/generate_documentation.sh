#!/bin/bash

dir=$(pwd)

command="SOLC_ARGS='openzeppelin-solidity=$dir/node_modules/openzeppelin-solidity' solidity-docgen $dir $dir/contracts $dir/docs"

eval "$command"