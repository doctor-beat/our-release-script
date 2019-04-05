#!/bin/bash

WORKSPACES=/opt/hawaii/workspace
PROJECT=${PWD##*/}
RELEASE=$1

function __error {
    echo "ERROR: $1"
    exit 1
}

if [ -z ${RELEASE} ]; then
    __error "No release-name passed; Exiting program."
fi

echo "Preparing release '$RELEASE' for '${PROJECT}'"

repo_info="$(git rev-parse --git-dir --is-inside-git-dir \
	--is-bare-repository --is-inside-work-tree \
	--short HEAD 2>/dev/null)"
rev_parse_exit_code="$?"

if [ -z "$repo_info" ]; then
	__error "No repo info found"
fi


if ! git diff --quiet --cached; then
  __error "Working directory not clean, please commit your changes first"
fi



