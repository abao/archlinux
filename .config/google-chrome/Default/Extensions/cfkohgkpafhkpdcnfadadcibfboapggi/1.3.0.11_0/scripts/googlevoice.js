function GoogleVoice() {
  this.name = "gvoice";
  this.displayname = chrome.i18n.getMessage("googlevoice_displayname");
  this.url = "www.google.com/voice/";
  this.html = this.url + "inbox/recent/";

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
  
GoogleVoice.prototype.onTabUpdated = function(tabId, changeInfo) {
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
  
    log("GVoice : browsing  : " + changeInfo.url);
   
    if (!this.tablist.contains(tabId)) {
      this.tablist.push(tabId);
    }
   
    //this.update();
  } else if (this.tablist.contains(tabId)) {
    log("GVoice : browsed away");
  
    this.tablist.remove(tabId);

    this.update();
  }
}

GoogleVoice.prototype.onTabRemoved = function(tabId) {
  if (!this.tablist.contains(tabId)) {
    return;
  }

  log("GVoice : closed");
  
  this.tablist.remove(tabId);

  this.update();
}

GoogleVoice.prototype.getEnabled = function() {
  var x = localStorage.gvEnabled;
  return x == null || x == "true";
}
GoogleVoice.prototype.updateEnabled = function() {
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

GoogleVoice.prototype.getShowOnBadge = function() {
  var x = localStorage.gvShowOnBadge;
  return x == null || x == "true";
}

GoogleVoice.prototype.getUnreadCount = function() {
  if (this.loggedin) {
    return this.unread;
  }
  return 0;
}

GoogleVoice.prototype.getImage = function() {
  if (this.error != errortypes.ok) {
    return "images/browser_action/popup/gvoice-err.png";
  }
  if (!this.loggedin) {
    return "images/browser_action/popup/gvoice-loggedout.png";
  }
  if (!this.unread) {
    return "images/browser_action/popup/gvoice.png";
  }
  return "images/browser_action/popup/gvoice-new.png";
}

GoogleVoice.prototype.getLink = function() {
  var url = this.updater.getProtocol() + "://" + this.url;
  if (this.getShowAll()) {
    url += "#history";
  }
  return url;
}

GoogleVoice.prototype.getPreview = function() {
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

GoogleVoice.prototype.getColor = function() {
  var x = localStorage.gvBadgeColor;
  if (x == null) {
    return [0, 255, 0, 255];
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

GoogleVoice.prototype.getShowAll = function() {
  var x = localStorage.gvShowAll;
  return x != null && x == "true";
}

GoogleVoice.prototype.getFeedUrl = function() {
  var x = this.updater.getProtocol() + "://" + this.html;
  if (this.getShowAll()) {
    x += "all/";
  }
  return x;
}

GoogleVoice.prototype.update = function() {
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
  this.xhr.open("GET", this.getFeedUrl(), true);
  this.xhr.send();
}

GoogleVoice.prototype.onXHRReadyStateChange = function() {
  if (this.timeoutTimer != null) {
    this.timeoutTimer.stop();
  }
  
  log("GVoice : readystate: " + this.xhr.readyState);
  if (this.xhr.readyState != 4) {
    this.timeoutTimer = new Timer(this, "timeout", undefined, this.updater.
      getTimeout());
    this.timeoutTimer.start();

    return;
  }
    
  log("GVoice : status    : " + this.xhr.status);
  if (this.xhr.status == 0) {
    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }
    
  if (!this.xhr.responseText) {
    log("GVoice : responseText not found.");
    
    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }
	
  var titleText = this.xhr.responseText.match(/<title>([ -~]+)<\/title>/i);
  if (titleText && titleText[1] == chrome.i18n.
		getMessage("googlevoice_loggedoutcue")) {
      
    log("GVoice : Logged out.");
    
    this.error = errortypes.ok;
    this.loggedin = false;
    this.updateComplete();
    return;
  }
  
  var jsonText = this.xhr.responseText.match(
    /<json>\s*<!\[CDATA\[(.*?)\]\]>\s*<\/json>/i);
      
  if (!jsonText) {
    log("GVoice : Can't find JSON.");
    
    this.error = errortypes.responsenotparsable;
    this.updateComplete();
    return;
  }
  
  var gvoicejson = JSON.parse(jsonText[1]);
  if (!gvoicejson) {
    log("GVoice : JSON parse error.");
    
    this.error = errortypes.responsenotparsable;
  } else {
    if (this.getShowAll()) {
      this.unread = gvoicejson.unreadCounts.all;
    } else {
      this.unread = gvoicejson.unreadCounts.inbox;
    }
    this.error = errortypes.ok;
    this.loggedin = true;
    
    log("GVoice : logged in : " + this.unread + " unread.");
      
    this.preview = "";
    if (gvoicejson.messages) {
      for (var i in gvoicejson.messages) {
        if (gvoicejson.messages[i].isRead) {
          continue;
        }
        
        this.preview = "<span class=\"title\">" + gvoicejson.messages[i].
          displayNumber + "</span> - " + gvoicejson.messages[i].
          relativeStartTime;
        break;
      }
    }
  }
  
  this.updateComplete();
}

GoogleVoice.prototype.timeout = function() {
  log("GVoice : Timeout.");

  this.xhr.abort();
  this.error = errortypes.timeout;
  this.updateComplete();
}

GoogleVoice.prototype.updateComplete = function() {
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

GoogleVoice.prototype.isURLReusable = function(url) {
  return url == this.url || url == this.url + "#inbox"  || url == this.url +
    "#history";
}

GoogleVoice.prototype.isRefreshing = function() {
  return this.refreshing;
}