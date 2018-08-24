#!/bin/bash

cd ./docs/website

command="CURRENT_BRANCH=master \
  USE_SSH=true \
  npm run publish-gh-pages"

eval "$command"