function GoogleWave() {
  this.name = "gwave";
  this.displayname = chrome.i18n.getMessage("googlewave_displayname");
  this.url = "wave.google.com/";
  this.feed = this.url + "wave/";
 
  this.error = errortypes.ok;
	this.refreshing = false;
  this.unread = 0;
  this.loggedin = true;
  this.preview = "";
  this.timer = null;
  this.updater = null;
  this.tablist = new Array;
  this.xhr = null;
  this.timeoutTimer = null;

  var me = this;
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) { me.
    onTabUpdated(tabId, changeInfo); });
  chrome.tabs.onRemoved.addListener(function(tabId) { me.onTabRemoved(tabId); 
    });
}

GoogleWave.prototype.onTabUpdated = function(tabId, changeInfo) {
  if (!changeInfo.url) {
    var me = this;
    chrome.tabs.get(tabId, function(tab) {
      changeInfo.url = tab.url;
      me.onTabUpdated(tabId, changeInfo);
    });
    return;
  }
  if (changeInfo.url.startsWith("http://" + this.url) || changeInfo.url.
    startsWith("https://" + this.url)) {
  
    log("GWave  : browsing  : " + changeInfo.url);
   
    if (!this.tablist.contains(tabId)) {
      this.tablist.push(tabId);
    }
   
    //this.update();
  } else if (this.tablist.contains(tabId)) {
    log("GVWave  : browsed away");
  
    this.tablist.remove(tabId);

    this.update();
  }
}

GoogleWave.prototype.onTabRemoved = function(tabId) {
  if (!this.tablist.contains(tabId)) {
    return;
  }

  log("GWave  : closed");
  
  this.tablist.remove(tabId);

  this.update();
}

GoogleWave.prototype.getEnabled = function() {
  var x = localStorage.gwEnabled;
  return x == null || x == "true";
}
GoogleWave.prototype.updateEnabled = function() {
  if (!this.getEnabled()) {
    this.unread = 0;
    this.error = errortypes.ok;
    this.loggedin = true;
    
    if (this.timer) {
      this.timer.stop();
      this.timer = null;
    }
  } else {
    this.update();
  }
}        

GoogleWave.prototype.getShowOnBadge = function() {
  var x = localStorage.gwShowOnBadge;
  return x == null || x == "true";
}

GoogleWave.prototype.getUnreadCount = function() {
  if (this.loggedin) {
    return this.unread;
  }
  return 0;
}

GoogleWave.prototype.getImage = function() {
  if (this.error != errortypes.ok) {
    return "images/browser_action/popup/gwave-err.png";
  }
  if (!this.loggedin) {
    return "images/browser_action/popup/gwave-loggedout.png";
  }
  if (!this.unread) {
    return "images/browser_action/popup/gwave.png";
  }
  return "images/browser_action/popup/gwave-new.png";
}

GoogleWave.prototype.getLink = function() {
  var link = this.updater.getProtocol() + "://" + this.url;
  
  var x = localStorage.gwAppsDomain;
  if (x != null && x != "") {
    link += "a/" + x + "/";
  }

  var minimizeNav = localStorage.gwMinimizeNav;
  minimizeNav = minimizeNav != null && minimizeNav == "true";

  var minimizeContact = localStorage.gwMinimizeContact;
  minimizeContact = minimizeContact != null && minimizeContact == "true";

  var minimizeSearch = localStorage.gwMinimizeSearch;
  minimizeSearch = minimizeSearch != null && minimizeSearch == "true";
  
  if (minimizeNav || minimizeContact || minimizeSearch) {
    link += "#";
    
    if (minimizeNav) {
      link += "minimized:nav";
      if (minimizeContact || minimizeSearch) {
        link += ",";
      }
    }
    if (minimizeContact) {
      link += "minimized:contact";
      if (minimizeSearch) {
        link += ",";
      }
    }
    if (minimizeSearch) {
      link += "minimized:search";
    }
  }
  
  return link;
}

GoogleWave.prototype.getPreview = function() {
  switch (this.error) {
    case errortypes.timeout:
      return chrome.i18n.getMessage("preview_timeout");
    case errortypes.responsenotfound:
    case errortypes.responsenotparsable:
      return chrome.i18n.getMessage("preview_response");
		default:
      if (!this.loggedin) {
        return chrome.i18n.getMessage("preview_login", this.uid + "");
      }
      return this.preview;
   }
}

GoogleWave.prototype.getColor = function() {
  var x = localStorage.gwBadgeColor;
  if (x == null) {
    return [0, 0, 255, 255];
  } else {
    var a = new Array();
    while (x.indexOf(",") > -1) {
      a.push(parseInt(x.substr(0, x.indexOf(","))));
      x = x.substr(x.indexOf(",") + 1);
    }
    a.push(parseInt(x));
    return a;
  }
}

GoogleWave.prototype.getFeed = function() {
  var x = localStorage.gwAppsDomain;
  if (x == null || x == "") {
    return this.updater.getProtocol() + "://" + this.feed;
  }

  return this.updater.getProtocol() + "://" + this.url + "a/" + x + "/";
}

GoogleWave.prototype.update = function() {      
  if (this.timer != null) {
    this.timer.stop();
    this.timer = null;
  }

  if (!this.getEnabled()) {
    return;
  }

  this.timeoutTimer = null;
	this.refreshing = true;
	this.updater.update();
  
  this.xhr = new XMLHttpRequest();
  this.xhr.me = this;
  this.xhr.onreadystatechange = function() { this.me.onXHRReadyStateChange(); }
  this.xhr.open("GET", this.getFeed(), true);
  this.xhr.send();
}

GoogleWave.prototype.onXHRReadyStateChange = function() {
  if (this.timeoutTimer != null) {
    this.timeoutTimer.stop();
  }
  
  log("GWave  : readystate: " + this.xhr.readyState);
  if (this.xhr.readyState != 4) {
    this.timeoutTimer = new Timer(this, "timeout", undefined, this.updater.
      getTimeout());
    this.timeoutTimer.start();
    
    return;
  }
    
  log("GWave  : status    : " + this.xhr.status);
  if (this.xhr.status == 0) {
    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }
  
  if (!this.xhr.responseText) {
    log("GWave  : responseText not found.");
    
    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }
    
  var titleText = this.xhr.responseText.match(/<title>([ -~]+)<\/title>/i);
  if (!titleText) {
    log("GWave  : Can't find page title.");
    
    this.error = errortypes.responsenotparsable;
    this.updateComplete();
    return;
  }
   
  if (titleText[1] == chrome.i18n.getMessage("googlewave_loggedoutcue")) {
    log("GWave  : Logged out.");
    
    this.error = errortypes.ok;
    this.loggedin = false;
    this.updateComplete();
    return;
  }
  
  var jsonText = this.xhr.responseText.match(/var json = (\{"r":"\^d1".*});/);
  if (!jsonText) {
    log("GWave  : Can't find JSON.");
  
    this.error = errortypes.responsenotparsable;
    this.updateComplete();
    return;
  }
  
  var jsonObject = JSON.parse(jsonText[1]);
  if (!jsonObject) {
    log("GWave  : JSON parse error.");
     
    this.error = errortypes.responsenotparsable;
    this.updateComplete();
    return;
  }
    
  var inboxWaves = jsonObject.p["1"];
  var count = 0;
  var wavelets = 0;
  this.preview = "";
  for (var i in inboxWaves) {
    if (!inboxWaves[i]["9"]) {
      continue;
    }
  
    if (this.preview == "" && inboxWaves[i]["9"]["1"] && inboxWaves[i]["7"] >
      0) {
      
      this.preview = "<span class=\"title\">" + inboxWaves[i]["9"]["1"].
        htmlspecialchars() + "</span> - " + chrome.i18n.
				getMessage("googlewave_unreadblips", inboxWaves[i]["7"]);
    }
    
    if (inboxWaves[i]["7"] > 0) {
      count += 1;
    }
  }
    
  this.error = errortypes.ok;
  this.loggedin = true;
  this.unread = count;
  
  log("GWave  : logged in : " + this.unread + " unread.");
  
  this.updateComplete();
}

GoogleWave.prototype.timeout = function() {
  log("GWave  : Timeout.");
  
  this.xhr.abort();
  this.error = errortypes.timeout;
  this.updateComplete();
}
    
GoogleWave.prototype.updateComplete = function() {
  this.xhr = null;
  if (this.timer != null) {
    this.timer.stop();
  }
  this.timer = new Timer(this, "update", undefined, this.updater.
    getUpdateInterval());
  this.timer.start();
	this.refreshing = false;
  this.updater.update();
}

GoogleWave.prototype.isURLReusable = function(url) {
  return url.startsWith(this.url) && !url.contains("restored:search") && !url.
    contains("restored:wave");
}

GoogleWave.prototype.isRefreshing = function() {
  return this.refreshing;
}