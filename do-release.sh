#!/bin/bash

#WORKSPACES=/opt/hawaii/workspace
PROJECT=${PWD##*/}
STEP="${1,,}"
RELEASE=$2
BRANCHNAME="release-${RELEASE}"

function __error {
    echo "*** ERROR: $1 ***"
    exit 1
}

function __git_clean {
	if ! git diff --quiet --cached || ! git diff --quiet; then
	  __error "Working directory not clean, please commit your changes first"
	fi
}

if [ -z ${STEP} ]; then
    __error "No step passed; Exiting program."
fi

if [ -z ${RELEASE} ]; then
    __error "No release-name passed; Exiting program."
fi

echo "Preparing step '${STEP}' of release '$RELEASE' for '${PROJECT}'"

repo_info="$(git rev-parse --git-dir --is-inside-git-dir \
	--is-bare-repository --is-inside-work-tree \
	--short HEAD 2>/dev/null)"
#rev_parse_exit_code="$?"
if [ -z "$repo_info" ]; then
	__error "No repo info found. Is this a directory under git?"
fi

if [ $STEP == 'init' ] ; then

	__git_clean;

	if git rev-parse --verify --quiet $BRANCHNAME; then
		__error "Branch '${BRANCHNAME}' already exists"
	fi 

	git fetch --quiet && git checkout -b $BRANCHNAME master \
		&& git merge --no-commit --no-ff --quiet origin/dev
		#&& git push -u origin/$BRANCHNAME \

	git status
	echo "Git branch&merge is done. Check the 'git status' above and commit if OK."

elif [ $STEP == 'version' ] ; then
    gitf=".git"
	if [ -f "$gitf/MERGE_HEAD" ]; then
		#commit the merge if needed:
		git commit --quiet --no-edit
	fi
	__git_clean ;

	mvn versions:set -DnewVersion=$RELEASE
	mvn versions:set-property -Dproperty=kahuna.backend.version -DnewVersion=$RELEASE
	git commit -am "pom versions" # && git push -u or
else 
	__error "Unknown step '${STEP}'. Allowed values are: init, version, ..."
fi


echo "Done my best."
exit


