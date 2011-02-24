// Misc functions that extend existing JavaScript classes

Array.prototype.indexOf = function(value) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == value) {
      return i;
    }
  }
  return -1;
}
Array.prototype.contains = function(value) {
  return this.indexOf(value) > -1;
}
Array.prototype.removeAt = function(index) {
  this.splice(index, 1);
}
Array.prototype.remove = function(value) {
  this.removeAt(this.indexOf(value));
}

String.prototype.startsWith = function(text) {
  return this.substr(0, text.length) == text;
}
String.prototype.htmlspecialchars = function() {
  return this.replace("&", "&amp;").replace("<", "&lt;").replace(">",
    "&gt;");
}
String.prototype.htmlstriptags = function() {
  return this.replace(/<.*?>/g, "");
}
String.prototype.contains = function(value) {
  return this.indexOf(value) > -1;
}
String.prototype.endsWith = function(text) {
  return this.substr(0 - text.length, text.length) == text;
}