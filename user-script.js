$(function() {
	

	var jobs = ["test-5_kahuna-backend_code_kah-be-jar-only_git"];
	var jobsToBuild = [jobs[0]];
	var xpath = "/maven2-moduleset/properties/hudson.model.ParametersDefinitionProperty/parameterDefinitions/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition[name= 'GIT']/defaultValue";
	var jobConfigUrl = null;
	
	let regex = /(^http.*\/jenkins\/view\/TEST\/job\/TEST-\d+\/view\/.*\/job\/).*\/api\//;//https://ap.haw.vodafone.nl/jenkins/view/TEST/job/TEST-5/view/BE Kahuna/job/
	let match = window.location.href.match(regex);
	if (!match) {
		console.log(regex, window.location.href)
		//alert("ERROR: invalud url: " + window.location.href);
		throw "ERROR: invalud url: " + window.location.href;
	} else {
		jobConfigUrl = match[1] + "{{$JOB}}/config.xml";
		console.log(jobConfigUrl)
	}
	
	var jenkinsCrumb = {};
	setJenkinsCrumb();
	
	let urlParams = new URLSearchParams(window.location.search);
	
	let step = urlParams.get('step');
	let branch = urlParams.get('branch');
	// ?step=init&branch=release-13.55
	
	
	if (step = undefined) {
		console.log("No step found, doing nothing speciall!");
	} else {		
		console.log("Step: " + step);
		
		$('h1').after( "<div id='my-content'><h2>Logger: " + step + ", " + branch + "</h2></div>" );
		
		if (branch == undefined) {
			throw "no branch found";
		}
		
		if (step == 'init') {
			initJenkins(branch);
		} else {
			alert('ERROR: invalid step: ' + step);
		}
	}
	
	function setJenkinsCrumb() {
		$.get('https://ap.haw.vodafone.nl/jenkins//crumbIssuer/api/xml?xpath=concat(//crumbRequestField,":",//crumb)', function(response){
			let parts = response.split(':');
			//let key = parts[0];
			//jenkinsCrumb = {};
			jenkinsCrumb[parts[0]] = parts[1];
			console.log('jenkinsCrumb: ', jenkinsCrumb);
		})
	}
	
	function initJenkins(branch) {
		for (job of jobs) {
			$('#my-content').append(`<li id='li-${job}'><input type='checkbox' id='check-${job}'/>${job}</li>`);
		}	
		
		
		for (job of jobs) {
			let url = jobConfigUrl.replace("{{$JOB}}", job);
			$.get(url, function(data) { callbackGet(data, url, job)});
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
	 			
	 			$(`#li-${job}`).append(`: Branch ${oldValue}  ==> ${node.nodeValue}`);
			}
		}
		
		postConfigXml(data, url)

		console.log("After: ", data)
		
		if (jobsToBuild.include(job)) {
			console.log("Running job: " + job);
			postRunJob(url);
		}
	}
	
	function postConfigXml(data, url) {
		console.log("Posting to " + url)
		$.ajax({
		  type: "POST",
		  url: url,
		  data: data,
		  success: function( result ) {console.log("Success: ", result)},
		  error: function( jqXHR, textStatus ) {console.log("Errror: ", jqXHR.status, textStatus, jqXHR.responseText)},
		  //dataType: 'xml',
		  headers: jenkinsCrumb,
		  processData: false
		});
	}
	
	function postRunJob(url) {
		url = url.replace('/config.xml', '/buildWithParameters')
		//https://ap.haw.vodafone.nl/jenkins/view/TEST/job/TEST-5/view/BE%20Kahuna/job/test-5_kahuna-backend_code_kah-be-jar-only_git/build
		$.ajax({
		  type: "POST",
		  url: url,
		  data: {},
		  success: function( result ) {console.log("Job is running!")},
		  error: function( jqXHR, textStatus ) {console.log("Errror: ", jqXHR.status, textStatus, jqXHR.responseText)},
		  headers: jenkinsCrumb,
		  //dataType: 'xml',
		});
		
	}
});
