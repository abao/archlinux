function GoogleReader() {
  this.name = "greader";
  this.displayname = chrome.i18n.getMessage("googlereader_displayname");
  this.url = "www.google.com/reader/";
  this.json = this.url + "api/0/unread-count?all=true&output=json&" + 
    "client=OneNumber";

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

GoogleReader.prototype.onTabUpdated = function(tabId, changeInfo) {
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
  
    log("GReader: browsing  : " + changeInfo.url);
   
    if (!this.tablist.contains(tabId)) {
      this.tablist.push(tabId);
    }
   
    //this.update();
  } else if (this.tablist.contains(tabId)) {
    log("GReader: browsed away");
  
    this.tablist.remove(tabId);

    this.update();
  }
}

GoogleReader.prototype.onTabRemoved = function(tabId) {
  if (!this.tablist.contains(tabId)) {
    return;
  }

  log("GReader: closed");
  
  this.tablist.remove(tabId);

  this.update();
}

GoogleReader.prototype.getEnabled = function() {
  var x = localStorage.grEnabled;
  return x == null || x == "true";
}
GoogleReader.prototype.updateEnabled = function() {
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
        
GoogleReader.prototype.getShowOnBadge = function() {
  var x = localStorage.grShowOnBadge;
  return x == null || x == "true";
}

GoogleReader.prototype.getUnreadCount = function() {
  if (this.loggedin) {  
    return this.unread;
  }
  return 0;
}

GoogleReader.prototype.getImage = function() {
  if (this.error != errortypes.ok) {
    return "images/browser_action/popup/greader-err.png";
  }
  if (!this.loggedin) {
    return "images/browser_action/popup/greader-loggedout.png";
  }
  if (!this.unread) {
    return "images/browser_action/popup/greader.png";
  }
  return "images/browser_action/popup/greader-new.png";
}

GoogleReader.prototype.getLink = function() {
  return this.updater.getProtocol() + "://" + this.url;
}

GoogleReader.prototype.getPreview = function() {
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
 
GoogleReader.prototype.getColor = function() {
  var x = localStorage.grBadgeColor;
  if (x == null) {
    return [255, 127, 0, 255];
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
 
GoogleReader.prototype.update = function() {
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
  this.xhr.open("GET", this.updater.getProtocol() + "://" + this.json, true);
  this.xhr.send();
}
  
GoogleReader.prototype.onXHRReadyStateChange = function() {
  if (this.timeoutTimer != null) {
    this.timeoutTimer.stop();
  }
  
  log("GReader: readystate: " + this.xhr.readyState);
  if (this.xhr.readyState != 4) {
    this.timeoutTimer = new Timer(this, "timeout", undefined, this.updater.
      getTimeout());
    this.timeoutTimer.start();

    return;
  }
    
  log("GReader: status    : " + this.xhr.status);
  if (this.xhr.status == 0) {
    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }
  
  if (!this.xhr.responseText) {
    log("GReader: responseText not found.");
    
    this.error = errortypes.responsenotfound;
    this.updateComplete();
    return;
  }
    
  var titleText = this.xhr.responseText.match(/<title>([ -~]+)<\/title>/i);
  if (titleText && titleText[1] == chrome.i18n.
		getMessage("googlereader_loggedoutcue")) {              
		
    log("GReader: Logged out.");
    this.error = errortypes.ok;
    this.loggedin = false;
    this.updateComplete();
    return;
  }
    
  var greaderjson = JSON.parse(this.xhr.responseText);
  if (!greaderjson) {
    log("GReader: JSON parse error.");
    
    this.error = errortypes.responsenotparsable;
    this.updateComplete();
    return;
  }
    
  var count = 0;
  this.preview = "";
  var max = 0;
    
  for (var i in greaderjson.unreadcounts) {
    var feed = greaderjson.unreadcounts[i];
    if (!feed.id) {
      continue;
    }
      
    var rlabel = /^user\/[0-9]+\/label\/([ -~]+)$/.exec(feed.id);
    var rfeed = /^feed\/([ -~]+)$/.exec(feed.id);
      
    if (/^user\/[0-9]+\/state\/com\.google\/reading-list$/.test(feed.id)) {
      count = feed.count;
    } else if (rlabel != null) {
      if (feed.count > max) {
        this.preview = "<span class=\"title\">" + rlabel[1] + "</span> - " +
          feed.count + " ";
        max = feed.count;
      }
    } else if (rfeed != null) {
      if (feed.count > max) {
        this.preview += "<span class=\"title\">" + rfeed[1] + "</span> - " +
          feed.count + " ";
        max = feed.count;
      }
    }
    
    if (max > 0 && count > 0) {
      break;
    }
  }
    
  this.error = errortypes.ok;
  this.loggedin = true;
  this.unread = count;
  
  log("GReader: logged in : " + this.unread + " unread.");
    
  this.updateComplete();
}

GoogleReader.prototype.timeout = function() {
  log("GReader: Timeout.");

  this.xhr.stop();
  this.error = errortypes.timeout;
  this.updateComplete();
}
    
GoogleReader.prototype.updateComplete = function() {
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

GoogleReader.prototype.isURLReusable = function(url) {
  log(url);
  log(this.url);
  return url.startsWith(this.url) && (url == this.url || url == this.url +
    "view/" || url.endsWith("%2fstate%2fcom.google%2freading-list"));
}

GoogleReader.prototype.isRefreshing = function() {
  return this.refreshing;
}