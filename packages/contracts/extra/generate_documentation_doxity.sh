#!/bin/bash

CURDIR=`/bin/pwd`
OPENZEPPELIN="node_modules/openzeppelin-solidity"
TRUFFLE_CONFIG_JS="truffle-config.js"
TRUFFLE_JS="truffle.js"

if [[ -L "$CURDIR/$OPENZEPPELIN" && -d "$CURDIR/$OPENZEPPELIN" ]]
then
    unlink $CURDIR/$OPENZEPPELIN
fi

if [[ -L "$CURDIR/$TRUFFLE_JS" && -f "$CURDIR/$TRUFFLE_JS" ]]
then
    unlink $CURDIR/$TRUFFLE_JS
fi

ln -s $CURDIR/../../$OPENZEPPELIN $CURDIR/$OPENZEPPELIN
ln -s $CURDIR/$TRUFFLE_CONFIG_JS $CURDIR/$TRUFFLE_JS

if [ ! -f $CURDIR/scripts/doxity/pages/docs ]; then
    mkdir -p $CURDIR/scripts/doxity/pages/docs
fi

command="$CURDIR/node_modules/.bin/doxity build"

eval "$command"

unlink $CURDIR/$OPENZEPPELIN
unlink $CURDIR/$TRUFFLE_JS
