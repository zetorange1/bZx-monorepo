#!/bin/bash

CURDIR=`/bin/pwd`
OPENZEPPELIN="node_modules/openzeppelin-solidity"

if [[ -L "$CURDIR/$OPENZEPPELIN" && -d "$CURDIR/$OPENZEPPELIN" ]]
then
    unlink $CURDIR/$OPENZEPPELIN
fi

ln -s $CURDIR/../../$OPENZEPPELIN $CURDIR/$OPENZEPPELIN

if [ ! -f $CURDIR/scripts/doxity/pages/docs ]; then
    mkdir -p $CURDIR/scripts/doxity/pages/docs
fi

command="$CURDIR/node_modules/.bin/doxity build"

eval "$command"

unlink $CURDIR/$OPENZEPPELIN