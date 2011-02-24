function Gmail() {
  this.name = "gmail";
  this.displayname = chrome.i18n.getMessage("gmail_displayname");
  this.url = "mail.google.com/";
  this.feed = this.url + "mail/feed/atom/";
  this.composeurl = this.url + "mail/?view=cm&fs=1&tf=1"

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

Gmail.prototype.nsResolver = function (prefix) {
  if (prefix == "atom") {
    return "http://purl.org/atom/ns#";
  } else {
    return null;
  }
}

Gmail.prototype.onTabUpdated = function(tabId, changeInfo) {
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
  
    log("Gmail  : browsing  : " + changeInfo.url);
   
    if (!this.tablist.contains(tabId)) {
      this.tablist.push(tabId);
    }
   
    //this.update();
  } else if (this.tablist.contains(tabId)) {
    log("Gmail  : browsed away");
  
    this.tablist.remove(tabId);

    this.update();
  }
}

Gmail.prototype.onTabRemoved = function(tabId) {
  if (!this.tablist.contains(tabId)) {
    return;
  }

  log("Gmail  : closed");
  
  this.tablist.remove(tabId);

  this.update();
}

Gmail.prototype.getEnabled = function() {
  var x = localStorage.gmEnabled;
  return x == null || x == "true";
}
Gmail.prototype.updateEnabled = function() {
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

Gmail.prototype.getShowOnBadge = function() {
  var x = localStorage.gmShowOnBadge;
  return x == null || x == "true";
}

Gmail.prototype.getUnreadCount = function() {
  if (this.loggedin) {
    return this.unread;
  }
  return 0;
}

Gmail.prototype.getImage = function() {
  if (this.error != errortypes.ok) {
    return "images/browser_action/popup/gmail-err.png";
  }
  if (!this.loggedin) {
    return "images/browser_action/popup/gmail-loggedout.png";
  }
  if (!this.unread) {
    return "images/browser_action/popup/gmail.png";
  }
  return "images/browser_action/popup/gmail-new.png";
}

Gmail.prototype.getLink = function() {
  var x = localStorage.gmAppsDomain;
  var url = this.updater.getProtocol() + "://" + this.url;
  if (x != null && x != "") {
    url += "a/" + x + "/";
  }
  if (this.getShowAll()) {
    url += "#all";
  }
  return url;
}

Gmail.prototype.getPreview = function() {
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

Gmail.prototype.getColor = function() {
  var x = localStorage.gmBadgeColor;
  if (x == null) {
    return [255, 0, 0, 255];
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

Gmail.prototype.getShowAll = function() {
  var x = localStorage.gmShowAll;
  return x != null && x == "true";
}

Gmail.prototype.getFeedUrl = function() {
  var x = localStorage.gmAppsDomain;
  if (x == null || x == "") {
    x = this.updater.getProtocol() + "://" + this.feed;
  } else {
    x = this.updater.getProtocol() + "://" + this.url + "a/" + x +
      "/feed/atom/";
  }

  if (this.getShowAll()) {
    x += "unread/";
  }

  return x;
}

Gmail.prototype.update = function() {      
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

Gmail.prototype.onXHRReadyStateChange = function() {
  if (this.timeoutTimer != null) {
    this.timeoutTimer.stop();
  }
  
  log("Gmail  : readystate: " + this.xhr.readyState);
  if (this.xhr.readyState != 4) {
    this.timeoutTimer = new Timer(this, "timeout", undefined, this.updater.
      getTimeout());
    this.timeoutTimer.start();
    
    return;
  }
    
  log("Gmail  : status    : " + this.xhr.status);
  if (this.xhr.status == 0) {
    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }
  
  if (!this.xhr.responseXML) {
    log("Gmail  : responseXML not found.");

    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }

  var nodeIterator = this.xhr.responseXML.evaluate("/atom:feed/atom:fullcount",
    this.xhr.responseXML, this.nsResolver, XPathResult.ANY_TYPE, null);
    
  var node = nodeIterator.iterateNext();
  if (node) {
    this.error = errortypes.ok;
    this.unread = parseInt(node.textContent);
    this.loggedin = true;
    
    log("Gmail  : logged in : " + this.unread + " unread.");
    
    nodeIterator = this.xhr.responseXML.evaluate(
      "/atom:feed/atom:entry[1]/atom:author/atom:name", this.xhr.responseXML,
      this.nsResolver, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    var name = "";
    if (node) {
      log("Gmail  : Reading name.");
      
      name = node.textContent.htmlspecialchars();
    }
      
    if (name == "") {
      nodeIterator = this.xhr.responseXML.evaluate(
        "/atom:feed/atom:entry[1]/atom:author/atom:email", this.xhr.responseXML,
        this.nsResolver, XPathResult.ANY_TYPE, null);
      node = nodeIterator.iterateNext();
      if (node) {
        log("Gmail  : Reading email.");
        
        name = node.textContent.htmlspecialchars();
      }
    }
      
    nodeIterator = this.xhr.responseXML.evaluate(
      "/atom:feed/atom:entry[1]/atom:title", this.xhr.responseXML, this.
      nsResolver, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    var title = "";
    if (node) {
      log("Gmail  : Reading title.");
      
      title = node.textContent.htmlspecialchars();
    }

    nodeIterator = this.xhr.responseXML.evaluate(
      "/atom:feed/atom:entry[1]/atom:summary", this.xhr.responseXML, this.
      nsResolver, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    var summary = "";
    if (node) {
      log("Gmail  : Reading summary.");
      
      summary = node.textContent.htmlspecialchars();
    }
      
    this.preview = "";
    if (title != "" || name != "") {
      this.preview = "<span class=\"title\">";
        
      if (name != ""){
        this.preview += name;
        if (title != "") {
          this.preview += " - ";
        }
      }
      if (title != "") {
        this.preview += title;
      }
      this.preview += "</span>";
    }
    if (summary != "") {
      if (this.preview != "") {
        this.preview += " - ";
      }
      this.preview += summary;
    }
  } else {
    log("Gmail  : XML XPath error, checking for logged out state.");
    
    nodeIterator = this.xhr.responseXML.evaluate("/html/body/h2",
      this.xhr.responseXML, null, XPathResult.ANY_TYPE, null);
    node = nodeIterator.iterateNext();
    if (node && node.textContent == chrome.i18n.
			getMessage("gmail_loggedoutcue")) {
			
      this.error = errortypes.ok;
      this.loggedin = false;
      log("Gmail  : Logged out.");
    } else {
      this.error = errortypes.responsenotparsable;
      log("Gmail  : XML XPath error.");
    }
  }
    
  this.updateComplete();
}

Gmail.prototype.timeout = function() {
  log("Gmail  : Timeout.");

  this.xhr.abort();
  this.error = errortypes.timeout;
  this.updateComplete();
}

Gmail.prototype.updateComplete = function() {
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

Gmail.prototype.isURLReusable = function(url) {
  if (!url.startsWith(this.url)) {
    return false;
  }
  
	if (url.contains("?")) {
		return false;
	}
	
  if (!url.contains("#")) {
    return true;
  }
  
  var anchor = url.substr(url.indexOf("#") + 1);
  return anchor == "" || anchor == "inbox" || anchor == "all";
} 

Gmail.prototype.isRefreshing = function() {
  return this.refreshing;
}