chrome.storage.sync.get(['tsData'], function(gotData) {
	if (!gotData.tsData) {
		window.open("popup.html", "extension_popup", "width=400,height=500,status=no,scrollbars=yes,resizable=no");
	}
});
