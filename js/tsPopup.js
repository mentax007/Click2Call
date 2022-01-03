var pcol = 'https://';
var phpfile = '/c2dial.php';
var currentDomain = "";
var tsData = {};
var tsPauseOnPageInitial = '';
var tsAutoDetectNumbersInitial = 'on';
var defaultConf = {
	behavior: -1,
	tsDomain: '',
	tsExtension: '',
	tsPswd: '',
	tsSetHighlight: 'off',
	tsAutoDetectNumbers: 'on',
	tsPauseOnPage: 'off',
	tsPausedDomains: [],
};

$(document).ready(function() {

	// Add the tooltip (using the title attr).
	$('.container').tooltip();
	// get active tab
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        var activeTab = tabs[0];
        var parser = document.createElement('a');
        parser.href = activeTab.url;
        currentDomain = parser.hostname;

        chrome.storage.sync.get(['tsData'], function (gotData) {
            tsData = gotData.tsData ? gotData.tsData : defaultConf;
            if (tsData.tsPausedDomains === undefined) {
            	tsData.tsPausedDomains = [];
			}
			if (tsData.tsAutoDetectNumbers === undefined) {
            	tsData.tsAutoDetectNumbers = 'on';
			}
			// upgrading from 2.1.3 to 2.1.4, if field is undefined try to refresh saved credentials
			if (tsData.refreshed === undefined) {
                RefreshCredentials(tsData);
            }

            tsPauseOnPageInitial = tsData.tsPauseOnPage;
            tsAutoDetectNumbersInitial = tsData.tsAutoDetectNumbers;

            $('#tsDomain').val(tsData.tsDomain);
            $('#tsExtension').val(tsData.tsExtension);
            $('#tsPswd').val(tsData.tsPswd);
            if (tsData.tsAutoDetectNumbers == 'on') {
                $('.tsToggleAutoDetectNumbers i.fas').removeClass('fa-toggle-off').addClass('fa-toggle-on')
                $('#tsAutoDetectNumbersOn').trigger('click');
            } else {
                $('.tsToggleAutoDetectNumbers i.fas').removeClass('fa-toggle-on').addClass('fa-toggle-off')
                $('#tsAutoDetectNumbersOff').trigger('click');
            }
            if (tsData.tsSetHighlight == 'on') {
                $('.tsToggleHighlight i.fas').removeClass('fa-toggle-off').addClass('fa-toggle-on')
                $('#tsHighlightOn').trigger('click');
            } else {
                $('.tsToggleHighlight i.fas').removeClass('fa-toggle-on').addClass('fa-toggle-off')
                $('#tsHighlightOff').trigger('click');
            }
			if (isDomainPaused(tsData)) {
                $('.tsTogglePauseOnPage i.fas').removeClass('fa-toggle-off').addClass('fa-toggle-on')
                $('#tsPauseOnPageOn').trigger('click');
            } else {
                $('.tsTogglePauseOnPage i.fas').removeClass('fa-toggle-on').addClass('fa-toggle-off')
                $('#tsPauseOnPageOff').trigger('click');
            }

            if (tsData.behavior == 'hosted') {
                $('.tsToggle i.fas').removeClass('fa-toggle-off').addClass('fa-toggle-on')
                $('#tsHosted').trigger('click');
            } else {
                $('.tsToggle i.fas').removeClass('fa-toggle-on').addClass('fa-toggle-off')
                $('#tsDefault').trigger('click');
            }
            $('tsDomain').val();
        });

    });

	// Handle when a radio button is clicked.
	$('input[type=radio][name=tsBehaviour]').change(function() {
		if (this.value == 'default') {
			$('.hostedSettings').addClass('hide');
		} else if (this.value == 'hosted') {
			$('.hostedSettings').removeClass('hide');
		}
	});

	// Handle when the close button is clicked.
	$('#tsClose').click(function(){
		window.close();
	});

	// Handle when the test is clicked.
	$('#tsTest').click(function() {
		$('.ui-dialog-title').text('Testing...');
		$('#dialog p').text('');
		$("#dialog").dialog("open");

		tsData = {
			behavior: $('input[name="tsBehaviour"]:checked').val(),
			tsDomain: $('#tsDomain').val().trim(),
			tsExtension: $('#tsExtension').val().trim(),
			tsPswd: $('#tsPswd').val(),
			tsSetHighlight: $('input[name="tsSetHighlight"]:checked').val(),
		};
		if (tsData.behavior == 'hosted') {
			showLoadingScreen();
			testAndSaveSettings(tsData, false);
		}
	});

	// Handle when the save is clicked.
	$('#tsSave').click(function() {
        $('.ui-dialog-title').text('Save...');
        $('#dialog p').text('');
        $("#dialog").dialog("open");
        showLoadingScreen();

        tsData.behavior = $('input[name="tsBehaviour"]:checked').val();
        tsData.tsDomain = $('#tsDomain').val().trim();
        tsData.tsExtension = $('#tsExtension').val().trim();
        tsData.tsPswd = $('#tsPswd').val();
        tsData.tsSetHighlight = $('input[name="tsSetHighlight"]:checked').val();
        tsData.tsPauseOnPage = $('input[name="tsPauseOnPage"]:checked').val();
        tsData.tsAutoDetectNumbers = $('input[name="tsAutoDetectNumbers"]:checked').val();
        tsData.refreshed = 1; // don't try to refresh credentials automatically once settings have been saved by user

        saveData(tsData);
    });

	// Handle when the toggle button is clicked (tsToggleHighlight).
	$('.tsToggleHighlight .fa-toggle-off, .tsToggleHighlight .fa-toggle-on').click(function() {
		$(this).toggleClass('fa-toggle-off');
		$(this).toggleClass('fa-toggle-on');
		if ($(this).hasClass('fa-toggle-on')) {
			$('#tsHighlightOn').trigger('click');
		} else {
			$('#tsHighlightOff').trigger('click');
		}
	});

    // Handle when the toggle button is clicked (tsToggleHighlight).
    $('.tsTogglePauseOnPage .fa-toggle-off, .tsTogglePauseOnPage .fa-toggle-on').click(function() {
        $(this).toggleClass('fa-toggle-off');
        $(this).toggleClass('fa-toggle-on');
        if ($(this).hasClass('fa-toggle-on')) {
            $('#tsPauseOnPageOn').trigger('click');
        } else {
            $('#tsPauseOnPageOff').trigger('click');
        }
    });

    // Handle when the toggle button is clicked (tsToogleAutoDetectNumbers).
    $('.tsToggleAutoDetectNumbers .fa-toggle-off, .tsToggleAutoDetectNumbers .fa-toggle-on').click(function() {
        $(this).toggleClass('fa-toggle-off');
        $(this).toggleClass('fa-toggle-on');
        if ($(this).hasClass('fa-toggle-on')) {
            $('#tsAutoDetectNumbersOn').trigger('click');
        } else {
            $('#tsAutoDetectNumbersOff').trigger('click');
        }
    });

	// Handle when the toggle button is clicked (tsToggle).
	$('.tsToggle .fa-toggle-off, .tsToggle .fa-toggle-on').click(function() {
		$(this).toggleClass('fa-toggle-off');
		$(this).toggleClass('fa-toggle-on');
		if ($(this).hasClass('fa-toggle-on')) {
			$('#tsHosted').trigger('click');
		} else {
			$('#tsDefault').trigger('click');
		}
	});

	$("#dialog").dialog({
		autoOpen: false,
		closeOnEscape: false
	});

	$('body').delegate('.ui-button', 'click', function() {
		$('.theScreen').addClass('hide');
	});

	$('body').delegate('.tsCloseIt', 'click', function() {
		window.close();
	})
});

// Show the white screen while extension processes injection or the ajax calls.
function showLoadingScreen(){
	$('.theScreen').removeClass('hide');
	$('.ui-button').hide();
}

// Hide the white screen, since process/ajax is done.
function hideLoadingScreen(){
  $('.ui-button').show();
}

// Ping to check if provided tsDomain is responding, if it does, proceed to testAndSave().
function pingAndSave(tsData, tsSave = false){
	// Make the ajax call.
	var res;
	var url = pcol + tsData.tsDomain + phpfile;
	$.ajax({
		url: url,
		dataType: 'text',
		type: 'post',
		success: function(data, textStatus, jQxhr) {
			$('#dialog p').append('<strong>Connecting to the domain... Ok</strong> <i class="far fa-thumbs-up"></i>');
			testAndSave(tsData, tsSave);
		},
		error: function(jqXhr, textStatus, errorThrown) {
			$('#dialog p').append('<strong>Connecting to the domain... Failed</strong> Can\'t reach the specified domain <i class="far fa-thumbs-down"></i>');
			$('#tsDomain').focus();
			hideLoadingScreen();
		}
	});
}

// Test to check if provided tsDomain is responding with input credentials, if it does, proceed to testAndSave().
function RefreshCredentials(tsData, tsSave = false){
	if (tsData.tsPswd == '' || tsData.tsExtension == '' || tsData.domain == '') {
		tsData.refreshed = 0; // we cannot refresh credentials
	}
    // Make the ajax call.
    var res;
    var url = pcol + tsData.tsDomain + phpfile;
    $.ajax({
        url: url,
        dataType: 'text',
        type: 'post',
        data: {
            'op': 'refresh_credentials',
            'extension': tsData.tsExtension,
            'password': tsData.tsPswd,
        },
        success: function(data, textStatus, jQxhr){
            var u = data.match(/(.+)&(.+)/);

            tsData.tsExtension = u[1];
            tsData.tsPswd = u[2];
            $('#tsExtension').val(tsData.tsExtension);
            $('#tsPswd').val(tsData.tsPswd);

            tsData.refreshed = 1;
			saveDataQuietly(tsData, true);
        },
        error: function(jqXhr, textStatus, errorThrown) {
            console.log('Credentials refresh has failed');
        	tsData.refreshed = 0;
        	saveDataQuietly(tsData);
        }
    });
}

// Test to check if provided tsDomain is responding with input credentials, if it does, proceed to testAndSave().
function testAndSave(tsData, tsSave = false){
	// Make the ajax call.
	var res;
	var url = pcol + tsData.tsDomain + phpfile;
	$.ajax({
		url: url,
		dataType: 'text',
		type: 'post',
		data: {
			'op': 'chrome_c2d_authentication',
			'extension': tsData.tsExtension,
			'password': tsData.tsPswd,
			'auth': "pbx"
		},
		success: function(data, textStatus, jQxhr){
			$('#dialog p').append('<br/><strong>Authentication check... Ok</strong> <i class="far fa-thumbs-up"></i>');
			$('#dialog p').append('<br/><strong>Tested </strong> <i class="far fa-thumbs-up"></i>');

			if (!data.length) {
                $('#dialog p').append('<br/><strong>Authenticaton key is missing </strong> <i class="far fa-thumbs-down"></i>');
			} else {
                $('#tsPswd').val(data);
                tsData.tsPswd = data;
			}
			if (tsSave) {
				saveData(tsData);
			} else {
				hideLoadingScreen();
			}
		},
		error: function(jqXhr, textStatus, errorThrown) {
			$('#dialog p').append('<br/><strong>Authentication check... Failed</strong> <i class="far fa-thumbs-down"></i>');
			$('#tsExtension').focus();
			hideLoadingScreen();
		}
	});
}

// Validate the provided input.
function validateSettings(tsData) {
	if (tsData.tsDomain.length < 3) {
		$('#dialog p').append('<br/><strong>PBX Domain</strong> too short <i class="far fa-thumbs-down"></i>');
		$('#tsDomain').focus();
		return false;
	}
	if (tsData.tsExtension.length < 2) {
		$('#dialog p').append('<br/><strong>Extension</strong> too short <br/>(less than 2 characters) <i class="far fa-thumbs-down"></i>');
		$('#tsExtension').focus();
		return false;
	}
	if (tsData.tsPswd.length < 2) {
		$('#dialog p').append('<br/><strong>Password</strong> too short (less than 2 characters) <i class="far fa-thumbs-down"></i>');
		$('#tsPswd').focus();
		return false;
	}
	return true;
}

// Validate, ping, test, and  save provided input.
function testAndSaveSettings(tsData, tsSave){
	if (validateSettings(tsData)) {
		pingAndSave(tsData, tsSave);
	} else {
		$('#dialog p').append('<br/>Kindly recheck and try again.');
		hideLoadingScreen();
		return false;
	}
}

function isDomainPaused(tsData) {
	//currentDomain = getUrlDomain($(location).attr('href'));
	console.log(currentDomain);

	if (jQuery.inArray(currentDomain, tsData.tsPausedDomains) < 0) {
		console.log("Domain not paused");
		return false;
	}
	console.log("Domain paused");
	return true;
}

function saveDataQuietly(tsData, notifyTabs = false) {
    chrome.storage.sync.set({
        'tsData': tsData
    }, function(e) {
        // Do a few things after saving

        // Send  to all tabs.
		if (notifyTabs) {
            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(function (tab) {
                    chrome.tabs.sendMessage(tab.id, {tsData: tsData});
                });
            });
        }
    });
}

// Save the data.
function saveData(tsData) {
	if (!jQuery.isEmptyObject(tsData.tsPausedDomains)) {
		tsData.tsPausedDomains = tsData.tsPausedDomains.filter(function (elem) {
            return elem.toLowerCase() !== currentDomain.toLowerCase();
		});
	}

	if (tsData.tsPauseOnPage == 'on') {
		tsData.tsPausedDomains.push(currentDomain);
	}

	chrome.storage.sync.set({
		'tsData': tsData
	}, function(e) {
		// Do a few things after saving.
		$('#dialog p').append('<br/><strong>Settings Saved</strong> <i class="far fa-thumbs-up"></i>');
		if ((tsData.tsPauseOnPage == 'on' && tsPauseOnPageInitial == 'off') ||
			(tsData.tsAutoDetectNumbers == 'off' && tsAutoDetectNumbersInitial == 'on')) {
            	$('#dialog p').append('<br/><strong>Please reload the page</strong>');
        }

		// Send  to all tabs.
		chrome.tabs.query({}, function(tabs) {
			tabs.forEach(function(tab) {
				chrome.tabs.sendMessage(tab.id, {tsData:tsData});
			});
		});

		// Display the 'x' button in modal and add a class to it.
		$('.ui-button').show().addClass('tsCloseIt');
	});
}
