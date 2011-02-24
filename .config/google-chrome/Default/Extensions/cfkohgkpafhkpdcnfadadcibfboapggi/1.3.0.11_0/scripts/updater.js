function Updater(allservices) {
  this.allservices = allservices;
  this.popup = null;
  
  for (var i = 0; i < this.allservices.length; i++) {
    this.allservices[i].uid = i;
    this.allservices[i].updater = this;
  }
}
 
Updater.prototype.getEnabledServices = function() {
  var services = new Array();
    
  for (var i = 0; i < this.allservices.length; i++) {
    if (this.allservices[i].getEnabled()) {
      services.push(this.allservices[i]);
    }
  }
  return services;
}
         
Updater.prototype.getBadgeServices = function() {
  var services = new Array();
  var enabled = this.getEnabledServices();
    
  for (var i = 0; i < enabled.length; i++) {
    if (enabled[i].getShowOnBadge()) {
      services.push(enabled[i]);
    }
  }
  return services;
}
  
Updater.prototype.start = function() {
  log("Updater: Starting update.");
    
  var services = this.getEnabledServices();
  for (var i = 0; i < services.length; i++) {
    services[i].update();
  }
}
  
Updater.prototype.isAllErrorOrLoggedOff = function(services) {
  for (var i = 0; i < services.length; i++) {
    if (services[i].error == errortypes.ok && services[i].loggedin) {
      return false;
    }
  }
  return true;
}
  
Updater.prototype.isSomeError = function(services) {
  for (var i = 0; i < services.length; i++) {
    if (services[i].error != errortypes.ok) {
      return true;
    }
  }
  return false;
}
                 
Updater.prototype.isSomeLoggedIn = function(services) {
  for (var i = 0; i < services.length; i++) {
    if (services[i].loggedin) {
      return true;
    }
  }
  return false;
}
  
Updater.prototype.isSomeLoggedOut = function(services) {
  for (var i = 0; i < services.length; i++) {
    if (!(services[i].loggedin)) {
      return true;
    }
  }
  return false;
}
  
Updater.prototype.buildTooltip = function(services) {
  var tooltip = "";
  for (var i = 0; i < services.length; i++) {
    if (tooltip != "") {
      tooltip += chrome.i18n.getMessage("tooltip_service_separator");
    }
    
    if (services[i].error != errortypes.ok) {
      tooltip += chrome.i18n.getMessage("tooltip_service_error",
				services[i].displayname);
    } else if (!(services[i].loggedin)) {
      tooltip += chrome.i18n.getMessage("tooltip_service_login",
				services[i].displayname);
    } else {
      tooltip += chrome.i18n.getMessage("tooltip_service", [
				services[i].displayname,
				services[i].getUnreadCount()
			]);
    }
  }
  return tooltip;
}
  
Updater.prototype.update = function() {
  log("Updater: Updating UI.");

  var services = this.getBadgeServices();
    
  var color = null;
  if (this.getShowError() && this.isSomeError(services)) {
    color = this.getErrorColor();
  } else if (this.getShowLoggedOut() && this.isSomeLoggedOut(services)) {
    color = this.getLoggedOutColor();
  } else {
    for (var i = 0; i < services.length; i++) {
      if (services[i].getUnreadCount() > 0) {
        if (color == null) {
          color = services[i].getColor();
        } else {
          color = this.getMultiColor();
          break;
        }
      }
    }
  }
  
  if (color != null) {
    chrome.browserAction.setBadgeBackgroundColor({color: color});
  }
  
  var total = 0;
  for (var i = 0; i < services.length; i++) {
    total += services[i].getUnreadCount();
  }
  if (total <= 0) {
    if (this.getShowError() && this.isSomeError(services)) {
      chrome.browserAction.setBadgeText({
				text: chrome.i18n.getMessage("badge_error")
			});
    } else if (this.getShowLoggedOut() && this.isSomeLoggedOut(services)) {
      chrome.browserAction.setBadgeText({
				text: chrome.i18n.getMessage("badge_login")
			});
    } else {
      chrome.browserAction.setBadgeText({
				text: chrome.i18n.getMessage("badge_no_unread")
			});
    }
    chrome.browserAction.setIcon({path: "images/browser_action/none.png"});
  } else {         
    chrome.browserAction.setBadgeText({text: total.toString()});
    
    var path = "";
    for (var i = 0; i < services.length; i++) {
      if (services[i].getUnreadCount() > 0) {
        if (path != "") {
          path += "-";
        }
        path += services[i].name;
      }
    }
    chrome.browserAction.setIcon({path: "images/browser_action/" + path +
      ".png"});
  }
  
  chrome.browserAction.setTitle({title: this.buildTooltip(services)});
  
  this.updatePopup();
}
  
Updater.prototype.popupOpened = function(p) {
  log("Updater: Popup opened.");
  
  this.popup = p;
  
  if (this.getOneClickOpenUnread() && this.getUnreadServices(false).length >
    0) {
    
    this.popup.window.close();
    this.popupOpenUnread(false);
    return;
  }
    
  this.updatePopup();
}
  
Updater.prototype.popupClosed = function() {
  log("Updater: Popup closed.");
    
  this.popup = null;
}
  
Updater.prototype.updatePopup = function() {
  log("Updater: Updating popup.");
  
	var views = chrome.extension.getViews();
	for (var i = 0; i < views.length; i++) {
		if (views[i].onupdate) {
			views[i].onupdate(this);
		}
	}
	
  if (this.popup == null) {
    return;
  }
  
  var services = this.getEnabledServices();
    
  var doc = this.popup.document;
  
  var anyunread = false;
  for (var i = 0; i < services.length; i++) {
    if (services[i].getUnreadCount() > 0) {
      anyunread = true;
      break;
    }
  }

  var noopen = doc.getElementById("noopen");
  var open = doc.getElementById("open");
  if (anyunread) {
    open.style.display = "inline";
    noopen.style.display = "none";
  } else {
    open.style.display = "none";
    noopen.style.display = "inline";
  }
  
  var login = doc.getElementById("login");
  var both = doc.getElementById("both");
  var logout = doc.getElementById("logout");

  if (this.isSomeError(services) || services.length == 0) {
    login.style.display = "inline";
    logout.style.display = "inline";
    both.style.display = "inline";
  } else {
    if (this.isSomeLoggedOut(services)) {
      login.style.display = "inline";
    } else {
      login.style.display = "none";
    }
    if (this.isSomeLoggedIn(services)) {
      logout.style.display = "inline";
    } else {
      logout.style.display = "none";
    }
    if (login.style.display != "none" && logout.style.display != "none") {
      both.style.display = "inline";
    } else {
      both.style.display = "none";
    }
  }
  
  var content = doc.getElementById("dynamiccontent");
  while (content.firstChild != null) {
    content.removeChild(content.firstChild);
  }
    
  for (var i = 0; i < services.length; i++) {
    var div = doc.createElement("div");
      
    var hr = doc.createElement("hr");
    div.appendChild(hr);
    
    if (services[i].composeurl) {
      var compose = doc.createElement("a");
      compose.href = "javascript:null;";
      compose.setAttribute("onclick", "openCompose(" + services[i].uid + ");");
      compose.className = "compose";
      compose.appendChild(doc.createTextNode(chrome.i18n.
				getMessage("gmail_compose")));
      div.appendChild(compose);
    }
      
    var a = doc.createElement("a");
    a.href = "javascript:null;";
    a.className = "name";
    a.setAttribute("onclick", "tabopen('" + services[i].uid + "');");
      
    var img = doc.createElement("img");
    img.src = services[i].getImage();
    img.alt = services[i].displayname;
      
		var preview = services[i].getPreview();
    img.title = preview.htmlstriptags();
      
    a.appendChild(img);
    a.appendChild(doc.createTextNode(" " + services[i].displayname));
    
    div.appendChild(a);
    //div.appendChild(doc.createTextNode(" - "));
     
		var unread = services[i].getUnreadCount();
		 
		if ((services[i].loggedin && services[i].error == errortypes.ok &&
			!services[i].isRefreshing()) || unread > 0) {
			
      div.appendChild(doc.createTextNode(" ("));

			var span = doc.createElement("span");
      span.className = "unread";
      span.appendChild(doc.createTextNode(unread));
      div.appendChild(span);

      div.appendChild(doc.createTextNode(")"));
		}
		
		if (services[i].isRefreshing()) {
      div.appendChild(doc.createTextNode(chrome.i18n.
				getMessage("popup_refreshing")));
		} else if (services[i].error != errortypes.ok) {
      div.appendChild(doc.createTextNode(chrome.i18n.
				getMessage("popup_error")));
    } else if (!(services[i].loggedin)) {
      div.appendChild(doc.createTextNode(chrome.i18n.
				getMessage("popup_need_login")));
    }
      
    var p = doc.createElement("p");
    p.className = "preview";
    p.innerHTML = preview;
    div.appendChild(p);
      
    var clear = doc.createElement("div");
    clear.className = "clear";
    div.appendChild(clear);

    content.appendChild(div);
  }
}

Updater.prototype.getUnreadServices = function(openedFromPopup) {
  var services = this.getEnabledServices();
  var ret = [];
  
  for (var i = 0; i < services.length; i++) {
    if (services[i].getUnreadCount() <= 0) {
      continue;
    }
    
    if (!services[i].getShowOnBadge() && !openedFromPopup && !this.
      getOpenHiddenUnread()) {
      
      continue;
    }
    
    ret.push(services[i]);
  }
  
  return ret;
}

Updater.prototype.popupOpenUnread = function(openedFromPopup) {
  log("Updater: Open Unread clicked in popup.");
  
  var services = this.getUnreadServices(openedFromPopup);
  for (var i = 0; i < services.length; i++) {
    this.openPage(services[i].getLink(), services[i], i == 0);
  }
}

Updater.prototype.getUpdateInterval = function() {
  var x = localStorage.updateInterval;
  if (x == null) {
    return 300000;
  } else {
    return parseInt(x);
  }
}

Updater.prototype.getTimeout = function() {
  var x = localStorage.timeout;
  if (x == null) {
    return 15000;
  } else {
    return parseInt(x);
  }
}
  
Updater.prototype.getErrorColor = function() {
  var x = localStorage.errorBadgeColor;
  if (x == null) {
    return [127, 127, 127, 255];
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
Updater.prototype.getLoggedOutColor = function() {
  var x = localStorage.loggedOutBadgeColor;
  if (x == null) {
    return [127, 127, 127, 255];
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
Updater.prototype.getMultiColor = function() {
  var x = localStorage.multiBadgeColor;
  if (x == null) {
    return [127, 0, 255, 255];
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
  
Updater.prototype.optionsChanged = function() {
  for (var i = 0; i < this.allservices.length; i++) {
    this.allservices[i].updateEnabled();
  }
  this.update();
}

Updater.prototype.getProtocol = function() {
  var x = localStorage.protocol;
  if (x == null || (typeof x == "string" && x == "true")) {
    return "https";
  } else {
    return "http";
  }
}

Updater.prototype.openPage = function(url, service, createWindow) {
  log("Updater: Opening " + url);

  var compareurl = url.toLowerCase();
  var index = url.indexOf("://");
  if (index > -1) {
    compareurl = url.substr(index + 3);
  }
  
  if (this.getReuseTabs()) {
    var me = this;
    //chrome.windows.getAll({ populate: true }, function(windows) {
    chrome.tabs.getAllInWindow(null, function(tabs) {
      //for (var i = 0; i < windows.length; i++) {
        //var tabs = window[i].tabs;
        for (var j = 0; j < tabs.length; j++) {
          var taburl = tabs[j].url.toLowerCase();
          
          index = taburl.indexOf("://");
          if (index <= -1) {
            continue;
          }
          
          var protocol = taburl.substr(0, index);
          if (protocol != "https" && protocol != "http") {
            continue;
          }
          
          taburl = taburl.substr(index + 3);
          
          if (service) {
            if (me.getBePickyAboutReuse()) {
              if (service.isURLReusable(taburl)) {
                chrome.tabs.update(tabs[j].id, {
                  url: url,
                  selected: true
                });
                return;
              }
            } else if (taburl.startsWith(compareurl)) {
              chrome.tabs.update(tabs[j].id, {
                url: url,
                selected: true
              });
              return;
            }
          } else if (compareurl == taburl) {
            chrome.tabs.update(tabs[j].id, {
              url: url,
              selected: true
            });
            return;
          }
        }
      //}
      
      if (createWindow && me.getOpenInNewWindow()) {
        chrome.windows.create({ url: url });
        return;
      }
      chrome.tabs.create({ url: url });
    });
  }
}

Updater.prototype.openByUID = function(index) {
  log("Updater: openByUID fired.");
  for (var i = 0; i < this.allservices.length; i++) {
    if (this.allservices[i].uid == index) {
      this.openPage(this.allservices[i].getLink(), this.allservices[i], true);
      return;
    }
  }
}

Updater.prototype.openLogin = function() {
  this.openPage(this.getProtocol() + "://www.google.com/accounts/Login");
}

Updater.prototype.openLogout = function() {
  this.openPage(this.getProtocol() + "://www.google.com/accounts/Logout");
}

Updater.prototype.getReuseTabs = function() {
  var x = localStorage.reuseTabs;
  return x == null || x == "true";
}

Updater.prototype.getBePickyAboutReuse = function() {
  var x = localStorage.bePickyAboutReuse;
  return x == null || x == "true";  
}

Updater.prototype.getOpenInNewWindow = function() {
  var x = localStorage.openInNewWindow;
  return x != null && x == "true";  
}

Updater.prototype.openCompose = function(index) {
  for (var i = 0; i < this.allservices.length; i++) {
    if (this.allservices[i].uid == index) {
      if (this.getOpenInNewWindow()) {
        chrome.windows.create({ url: this.getProtocol() + "://" + this.
          allservices[i].composeurl });
        return;
      }
      chrome.tabs.create({ url: this.getProtocol() + "://" + this.
        allservices[i].composeurl });
      return;
    }
  }
}

Updater.prototype.getOneClickOpenUnread = function() {
  var x = localStorage.oneClickOpenUnread;
  return x != null && x == "true";  
}

Updater.prototype.getOpenHiddenUnread = function() {
  var x = localStorage.openHiddenUnread;
  return x != null && x == "true";  
}
  
Updater.prototype.getShowError = function() {
  var x = localStorage.showError;
  return x == null || x == "true";  
}

Updater.prototype.getShowLoggedOut = function() {
  var x = localStorage.showLoggedOut;
  return x == null || x == "true";  
}
