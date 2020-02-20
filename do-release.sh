#!/bin/bash

VERSION="19.06.007"

#PROJECT=${PWD##*/}
STEP="${1,,}"
RELEASE=$2
BRANCHNAME="release-${RELEASE}"
WORKSPACEDIR=${PWD}


function __error {
    echo "*** ERROR: $1 ***"
    exit 1
}

function __git_clean {
	if ! git diff --quiet --cached || ! git diff --quiet; then
	  __error "Working directory not clean, please commit your changes first"
	fi
}

function __writeresult() {
	now=$(date +"%D %T")
	echo "Done $now $PROJECT $STEP $BRANCHNAME" >> .do-release.log
}

if ! [[ $WORKSPACEDIR =~ ^.*/workspace(/([^/]+))?$ ]]; then
    __error "We are not in a workspace folder. Sorry..."
else
    subdir=${BASH_REMATCH[2]};
    if [ -z ${subdir} ]; then
        PROJECTS=( kahuna-backend kahuna-stubs kahuna-tests )
    else 
        PROJECTS=( $subdir )
        cd ..
    fi
fi

if [ -z ${STEP} ]; then
    __error "No step passed; Valid steps include init, merge, tag, golive, pomconflict. Exiting program."
fi

if [ $STEP == '-v' ] ; then
	echo "do-release.sh; version: ${VERSION}"
	exit
fi

if [ -z ${RELEASE} ]; then
    __error "No release-name passed; Exiting program."
fi

if [[ $RELEASE =~ ^([0-9]+)\.([0-9]+)$ ]]; then
	next=$(( ${BASH_REMATCH[2]} + 1 ))
	SNAPSHOT="${BASH_REMATCH[1]}.${next}"
else 
	__error "Invalid release version format. Valid: nn.nn"
fi

echo "Preparing step '${STEP}' of release '$RELEASE' for '${PROJECTS[*]}'"
echo " - script version: ${VERSION}"

for project in ${PROJECTS[@]}; do
    echo "================================================================ ${project} ================================================================="    

    cd $project

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

	    #create release branch & merge dev into
	    git fetch --quiet && git checkout -b $BRANCHNAME master \
		    && git merge --no-commit --no-ff --quiet origin/dev \
		    && git commit --quiet --no-edit && git push -u origin $BRANCHNAME \
		    && __writeresult

	    git status
	    echo "Git branch&merge is done & committed & pushed."

    #elif [ $STEP == 'version' ] ; then
	    current_branch=`git rev-parse --abbrev-ref HEAD`
	    if [ $current_branch != $BRANCHNAME ] ; then
		    __error "Unexpected current branch: '${current_branch}' (Expected: '${BRANCHNAME}')."
	    fi

        gitf=".git"
	    if [ -f "$gitf/MERGE_HEAD" ]; then
		    #commit the merge if needed:
		    git commit --quiet --no-edit
	    fi
	    __git_clean ;

	    #set pom versions
	    if [ -f "pom.xml" ] ; then
		    mvn versions:set -DnewVersion=$RELEASE.0
		    mvn versions:set-property -Dproperty=kahuna.backend.version -DnewVersion=$RELEASE.0
		    git commit -am "pom versions"  && git push \
		    && __writeresult
	    fi

	    # git push -u origin
    elif [ $STEP == 'merge' ] ; then
	    __git_clean;

	    echo -e "*** Did you do the prod-branch to master merge yourself? For now we will not script that step. Type Y or y to confirm. *** \c "
	    read  confirm
	    if [ "${confirm,,}" != 'y' ] ; then
            exit 1
        fi

	    #checkout dev and merge master into & commit
	    git fetch --quiet && git checkout dev \
		    && git merge --no-commit --quiet origin/master && git commit --quiet --no-edit

	    __git_clean;
	    echo "Master is merged into dev."

	    #merge dev into release bramch
	    git fetch --quiet && git checkout $BRANCHNAME \
		    && git merge --no-commit --no-ff --quiet origin/dev \
		    && git commit --quiet --no-edit && git push  \
		    && __writeresult
		    
	    git status
	    echo "Git merge is done. Check the 'git status' above and commit if OK."
    elif [ $STEP == 'tag' ] ; then
	    __git_clean;

	    git fetch --quiet && git checkout $BRANCHNAME \
		    && git tag -a V$RELEASE.0 -m "Release of version $RELEASE.0"  \
		    && git push origin V$RELEASE.0 \
		    && __writeresult

	    echo "Git tagged 'V$RELEASE.0'"
    #elif [ $STEP == 'snapshot' ] ; then
	    __git_clean;

	    git fetch --quiet && git checkout dev && git pull

	    #set pom versions
	    if [ -f "pom.xml" ] ; then
		    mvn versions:set -DnewVersion=$SNAPSHOT.0-SNAPSHOT
		    mvn versions:set-property -Dproperty=kahuna.backend.version -DnewVersion=$SNAPSHOT.0-SNAPSHOT
		    git commit -am "pom versions" && git push \
		    && __writeresult	
	    fi
    elif [ $STEP == 'golive' ] ; then
	    __git_clean ;

	    #create new prod-branch:
	    echo "prj: ${PROJECT}"
	    if [ $PROJECT == 'kahuna-backend' ] ; then
		    echo "would create be branch"
	    fi
	    if [ $PROJECT == 'kahuna-backend' ] ; then
		    git checkout $BRANCHNAME \
			    && git pull \
			    && git checkout -b prod-${RELEASE} \
			    && git push -u origin prod-${RELEASE}
	    fi
		    
	    #merge to master:
	    echo "+++ Merging to master: +++"
	    git checkout master \
		    && git pull \
		    && git merge origin/$BRANCHNAME \
		    && git push	
		    
	    #merge to dev:
	    echo "+++ Merging to dev: +++"
	    git checkout dev \
		    && git pull \
		    && git merge origin/master \
		    && git push	\
		    && __writeresult
    #elif [ $STEP == 'pomconflict' ] ; then
	    #__git_clean ;

	    if [ -f "pom.xml" ] ; then
        	echo "+++ Force pom conflict: +++"
            git status --short | grep "^UU "

        	git checkout --ours pom.xml &&  git checkout --ours */pom.xml
        	git add --force pom.xml &&  git add --force */pom.xml
        	git commit --no-edit \
        		&& git push	\
        		&& __writeresult
        fi
    else 
	    __error "Unknown step '${STEP}'. Allowed values are: init, version, ..."
    fi

    cd ..
done

echo "Done my best."
exit


