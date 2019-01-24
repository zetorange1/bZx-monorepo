#!/bin/bash

CURDIR=`/bin/pwd`
TRUFFLE_CONFIG_JS="truffle-config.js"
TRUFFLE_JS="truffle.js"

if [[ -L "$CURDIR/$TRUFFLE_JS" && -f "$CURDIR/$TRUFFLE_JS" ]]
then
    unlink $CURDIR/$TRUFFLE_JS
fi

ln -s $CURDIR/$TRUFFLE_CONFIG_JS $CURDIR/$TRUFFLE_JS

if [ ! -f $CURDIR/scripts/doxity/pages/docs ]; then
    mkdir -p $CURDIR/scripts/doxity/pages/docs
fi

command="$CURDIR/node_modules/.bin/doxity build"

eval "$command"

unlink $CURDIR/$TRUFFLE_JS
