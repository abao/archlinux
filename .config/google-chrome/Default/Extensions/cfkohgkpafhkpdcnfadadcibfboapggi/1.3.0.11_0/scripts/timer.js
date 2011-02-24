function Timer(object, func, params, timeout) {
  this.object = object;
  this.func = func;
  this.params = params;
  this.timeout = timeout;
  this.timer = null;
}

Timer.prototype.start = function() {
  var object = this.object;
  var func = this.func;
  var params = this.params;
  
  if (this.timer) {
    this.stop();
  }

  this.timer = window.setTimeout(function() {
    if (!params) {
      object[func].call(object);
    } else {
      object[func].apply(object, params);
    }
  }, this.timeout);
}

Timer.prototype.stop = function() {
  if (!this.timer) {
    return;
  }
  window.clearTimeout(this.timer);
  this.timer = null;
}