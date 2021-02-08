'use strict';

$(function() {
	let version = 'v0.02'
	console.log("Running version: " + version);

	//init config
	var jobs = [	"test-20_kahuna-backend_code_kah-be-jar-only_git", 
					"test-20_stubs_conf-code_stubs_git", 
					"test-20_kahuna-backend_conf-code_kah-be_git",
					"test-20_kahuna-backend_tests_automated-tests_git"];
	var jobsToBuild = [jobs[0]];
	var artifactJob = 'test-20_kahuna-backend_conf-code_kah-be_create-art';
	
	var xpath = "/maven2-moduleset/properties/hudson.model.ParametersDefinitionProperty/parameterDefinitions/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition[name= 'GIT']/defaultValue";
	var jobConfigUrl = null;
	
	let regex = /(^http.*\/jenkins\/view\/TEST\/job\/TEST-\d+\/)(.*\/)?api\//;//https://ap.haw.vodafone.nl/jenkins/view/TEST/job/TEST-5/
	let match = window.location.href.match(regex);
	if (!match) {
		console.log(regex, window.location.href)
		//alert("ERROR: invalud url: " + window.location.href);
		throw "ERROR: invalid url: " + window.location.href;
	} else {
		jobConfigUrl = match[1] + "view/BE Kahuna/job/{{$JOB}}/config.xml";
		console.log(jobConfigUrl)
	}
	
	//fix the csrf-token
	var jenkinsCrumb = {};
	setJenkinsCrumb();
	
	let urlParams = new URLSearchParams(window.location.search);
	
	let step = urlParams.get('step');
	let branch = urlParams.get('branch');
	// ?step=init&branch=release-13.55
	
	
	if (step === undefined || !step) {
		console.log("No step found, doing nothing speciall!");
	} else {		
		console.log("Step: " + step);
		
		$('h1').after( "<div id='my-content'><h2>Logger: " + step + ", " + branch + "</h2></div>" );
		
		if (branch === undefined) {
			throw "no branch found";
		}
		
		if (step == 'init') {
			initJenkins(branch);
		} else if (step == 'tag') {
			tagJenkins(branch);
		} else {
			alert('ERROR: invalid step: ' + step);
		}
	}
	
	function setJenkinsCrumb() {
		$.get('https://ap.haw.vodafone.nl/jenkins//crumbIssuer/api/xml?xpath=concat(//crumbRequestField,":",//crumb)', function(response){
			let parts = response.split(':');
			jenkinsCrumb[parts[0]] = parts[1];
			console.log('jenkinsCrumb: ', jenkinsCrumb);
		})
	}
	
	function initJenkins(branch) {
		for (let job of jobs) {
			$('#my-content').append(`<li id='li-config-${job}' class='list-item'><b>Configure:</b> ${job}</li>`);
		}	
		
		for (let job of jobsToBuild) {
			let link = jobConfigUrl.replace("{{$JOB}}", job).replace('/config.xml', '');
			$('#my-content').append(`<li id='li-build-${job}' class='list-item'><b>Building:</b> <a href='${link}' target='_blank'>${job}</a></li>`);
		}	

		for (let job of jobs) {
			let url = jobConfigUrl.replace("{{$JOB}}", job);
			$.get(url, function(data) { callbackGet(data, url, job)});
			$(`#li-config-${job}`).addClass('yellow');
		}

	}
	
	function tagJenkins(branch) {
		{	let job = artifactJob;
			let link = jobConfigUrl.replace("{{$JOB}}", job).replace('/config.xml', '');
			$('#my-content').append(`<li id='li-build-${job}' class='list-item'><b>Building:</b> <a href='${link}' target='_blank'>${job}</a></li>`);
		
			let url = jobConfigUrl.replace("{{$JOB}}", job);
			postArtifactJob(url, job, branch)
		}
		
		{	let job = 'test-20_kahuna-backend_tests_automated-tests_git';

			let url = jobConfigUrl.replace("{{$JOB}}", job).replace('/config.xml', '/ws/target/surefire-reports/*zip*/surefire-reports.zip')
			window.open(url, '_self');
		}
	}
	
	function callbackGet(data, url, job) {
		console.log("Before: ", data)
	
		let xpathResult = data.evaluate(xpath, data, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
		if (xpathResult.snapshotLength != 1) {//.invalidIteratorState) {
			alert("Error: no xpath result: invalid")
			throw "Error: no xpath result: invalid"
		} else {
			let node = xpathResult.snapshotItem(0).childNodes[0];//.singleNodeValue; //iterateNext()
			if (!node) {
				alert("Error: no xpath result: null")
				throw "Error: no xpath result: null"
			} else {
	 			console.log("Node", node);
	 			let oldValue = node.nodeValue;
	 			node.nodeValue = "origin/" + branch;
	 			console.log(node.nodeValue);
	 			
	 			$(`#li-config-${job}`).append(` <i>(Branch ${oldValue}  ==> ${node.nodeValue})</i>`);
			}
		}
		
		postConfigXml(data, url, job)

		console.log("After: ", data)
		
		if (jobsToBuild.includes(job)) {
			//wait some time for the config to activate
			setTimeout(function() {
				console.log("Running job: " + job);
    			postRunJob(url, job);
			}, (5 * 1000));
		}
	}
	
	function postConfigXml(data, url, job) {
		console.log("Posting to " + url)
		$.ajax({
		  type: "POST",
		  url: url,
		  data: data,
		  success: function( result ) {
		  	$(`#li-config-${job}`).addClass('green')
		  	console.log("Success: ", result)
		  },
		  error: function( jqXHR, textStatus ) {console.log("Errror: ", jqXHR.status, textStatus, jqXHR.responseText)},
		  headers: jenkinsCrumb,
		  processData: false
		});
	}
	
	function postRunJob(url, job) {
		url = url.replace('/config.xml', '/buildWithParameters')
		$.ajax({
		  type: "POST",
		  url: url,
		  data: {},
		  success: function( result ) {
		  	$(`#li-build-${job}`).addClass('green')
		  	console.log("Job is running!")
		  },
		  error: function( jqXHR, textStatus ) {console.log("Errror: ", jqXHR.status, textStatus, jqXHR.responseText)},
		  headers: jenkinsCrumb,
		});
		$(`#li-build-${job}`).addClass('yellow');

	}

	function postArtifactJob(url, job, branch) {
		url = url.replace('/config.xml', '/buildWithParameters')
		$.ajax({
		  type: "POST",
		  url: url,
		  data: {},
		  success: function( result ) {
		  	$(`#li-build-${job}`).addClass('green')
		  	console.log("Job is running!")
		  },
		  error: function( jqXHR, textStatus ) {console.log("Errror: ", jqXHR.status, textStatus, jqXHR.responseText)},
		  headers: jenkinsCrumb,
		});
		$(`#li-build-${job}`).addClass('yellow');

	}
});

