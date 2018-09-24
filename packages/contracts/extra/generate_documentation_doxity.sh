#!/bin/bash

CURDIR=`/bin/pwd`
OPENZEPPELIN="node_modules/openzeppelin-solidity"

if [[ -L "$CURDIR/$OPENZEPPELIN" && -d "$CURDIR/$OPENZEPPELIN" ]]
then
    unlink $CURDIR/$OPENZEPPELIN
fi

ln -s $CURDIR/../../$OPENZEPPELIN $CURDIR/$OPENZEPPELIN

command="$CURDIR/node_modules/.bin/doxity build"

eval "$command"

unlink $CURDIR/$OPENZEPPELIN