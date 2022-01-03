var tsData = {};
var hlClass = 'tsHighlight';
var pcol = 'https://';
var phpfile = '/c2dial.php';
var pausedOnThisPage = 0;
var currentDomain = "";
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

// on document ready
$(function() {
	// get active tab's domain
	var parser = document.createElement('a');
	parser.href = $(location).attr('href');
	currentDomain = parser.hostname;

	// get Plugin configuration from the local storage
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

		pausedOnThisPage = (tsData.tsPausedDomains.indexOf(currentDomain) >= 0) ? 1 : 0;
		initPlugin();
	});
});

// When message recieved, update tsData.
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (message.tsData) {
        tsData = message.tsData;
        recolorHighlights(tsData);
        if (tsData.tsPausedDomains === undefined) {
        	pausedOnThisPage = 0;
		} else {
            pausedOnThisPage = (tsData.tsPausedDomains.indexOf(currentDomain) >= 0) ? 1 : 0;
        }
		initPlugin();
    }
});

function initPlugin() {
    if (pausedOnThisPage) {
        return;
    }
	// Watch for dynamic page changes from JavaScript, AJAX, etc.
	var observer = new MutationObserver(function(mutationsList, observer) {
	// Stop observer while we are injecting; prevent observing our own changes.
		observer.disconnect();

		if (!pausedOnThisPage) {
            // Handle observed mutations.
			mutationsList.forEach(function (mutation) {
				for (var i = 0; i < mutation.addedNodes.length; i++) {
					$(mutation.addedNodes[i]).highlight();
				}
			});
		}

		// Reenable the observer.
		observer.observe(document.body, { attributes: true, childList: true, subtree: true });
	});
	observer.observe(document.body, {attributes: true, childList: true, subtree: true});

	$('body').append('<div class="tsStyle"></div>');
	if (tsData.behavior = 'hosted') {
        $('body').append('<div class="whitescreen tsHide">Calling...</div>');
    }

    // scan the page for the unformatted numbers, that might fit phone number pattern
    if (tsData.tsAutoDetectNumbers !== undefined && tsData.tsAutoDetectNumbers == 'on') {
        $('body').highlight();
        recolorHighlights(tsData);
    }

	// Delegate all <a> links on the page.
    // to avoid multiple delegation drop all delegated handlers before creating a new one
    $('body').undelegate('a[href^="tel:"]', 'click');
	$('body').delegate('a[href^="tel:"]', 'click', function(e) {
		var msg = '[Test Alert] Current Method is >>>' + tsData.behavior + '<<<';
		if (tsData.behavior == 'hosted') {
			showLoadingScreen();
			var t = $(this).attr('href').replace(/tel:/ig, '');
			
			// Make the ajax call.
			var url = pcol + tsData.tsDomain + phpfile;
			$.ajax({
				url: url,
				dataType: 'text',
				type: 'post',
				data: {
					'op': "chrome_c2d",
					'extension': tsData.tsExtension,
					'phone-number': t,
					'password' : tsData.tsPswd
				},
				success: function(data, textStatus, jQxhr) {
					hideLoadingScreen();
				},
				error: function(jqXhr, textStatus, errorThrown) {
					hideLoadingScreen();
					alert('Failed to make the call, please check your settings.');
				}
			});
			e.preventDefault();
			return;
		} else {
			// Do nothing and let it behave normally as it would.
		}
	});
}

// Add our own jQuery-based highlighter.
jQuery.fn.highlight = function () {
	function innerHighlight(node) {
		var skip = 0;
		if (node.nodeType == 3) {
			// Handle the text node.
			word = /(?:(?:\s|^)(\+|00|011)[-\. ]?(\d{1,3})[-\. ]?[-\. ]?\(?(\d{3})\)?[-\. ]?(\d{3})[-\. ]?(\d{4,5})(?![\w-\.])|(?:\s|^)(\+?1)?[-\. ]?\(?(\d{3})\ ?\)?[-\. ]?(\d{3})[-\. ]?(\d{4})(?![\w-\.]))/gm
			var t = word.test(node.data);
			if (t) {
				var allMatches = node.data.match(word);
				for (var x = 0; x < allMatches.length; x++) {
					z = allMatches[x];
					var pos = node.data.indexOf(z);
					if (pos >= 0) {
						var spannode = document.createElement('a');
						var x = z.replace(/[+ ()-\.]/ig, "");
						spannode.setAttribute('href', 'tel:' + x);
						spannode.setAttribute('title', 'Click to call ' + z.trim() + ' using your DLS Hosted PBX.');
						spannode.className = hlClass;
						var middlebit = node.splitText(pos);
						var endbit = middlebit.splitText(z.length);
						var middleclone = middlebit.cloneNode(true);
						spannode.appendChild(middleclone);
						if (middlebit.parentNode) {
							middlebit.parentNode.replaceChild(spannode, middlebit);
							skip = 1;
						} else {
							skip = 0;
						}
					}
				};
			}
		} else if (node.nodeType == 1 && node.childNodes && !/(select|button|canvas|code|data|head|map|meta|samp|svg|textarea|var|script|style|input|img)$/i.test(node.tagName)) {
			// Handle the HTML element.
			switch (node.tagName.toLowerCase()) {
				case 'a':
					// If href is 'tel:'
					if (node.getAttribute('href') && node.getAttribute('href').toLowerCase().startsWith('tel:')) {
						if ((" " + node.className + " ").replace(/[\n\t]/g, " ").indexOf(hlClass) > -1) {
							// Already taken care of, no need to update this.
						} else {
							// Do additional stuff.
							var x = node.getAttribute('href').toLowerCase().replace(/tel:/gi, '').replace(/[^0-9]/gi, '');
							node.setAttribute('href', 'tel:' + x); // Make sure the tel: link is cleaned up to be purely numeric.
							node.setAttribute('title', 'Click to call ' + x + ' using your DLS Hosted PBX.]');
							if (node.className !== null && node.className !== '') {
								node.className += ' ' + hlClass + ' aTelUpdated';
							} else {
								node.className = hlClass + ' aTelUpdated';
							}
						}
					} else {
						// Leave it as is.
					}
					break;
				default:
					for (var i = 0; i < node.childNodes.length; ++i) {
						i += innerHighlight(node.childNodes[i]);
					}
					break;
			}
		}
		return skip;
	}

	return this.each(function () {
		innerHighlight(this);
	});
};

function saveDataQuietly(tsData, notifyTabs = false) {
    chrome.storage.sync.set({
        'tsData': tsData
    }, function(e) {
    	console.log("Credential refreshed");
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

// Recolor the highlights.
function recolorHighlights(tsData) {
	if (tsData.tsSetHighlight === 'off') {
		$('div.tsStyle').html('<style>.tsHighlight { background-color: inherit;}</style>');
	} else {
		$('div.tsStyle').html('<style>.tsHighlight { background-color: #FAFAFA;}</style>');
	}
}

// Show the white screen while extension processes injection or the ajax calls.
function showLoadingScreen() {
	$('.whitescreen').removeClass('tsHide');
}

// Hide the white screen, since process/ajax is done.
function hideLoadingScreen() {
	$('.whitescreen').addClass('tsHide');
}
