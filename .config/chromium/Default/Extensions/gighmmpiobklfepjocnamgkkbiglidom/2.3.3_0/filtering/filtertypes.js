// A single filter rule.
var Filter = function() {}

// Maps filter text to Filter instances.  This is important, as it allows
// us to throw away and rebuild the FilterSet at will.
// TODO(gundlach): is the extra memory worth it if we only rebuild the
// FilterSet upon subscribe/unsubscribe/refresh?
Filter._cache = {};

// Return a Filter instance for the given filter text.
Filter.fromText = function(text) {
  var cache = Filter._cache;
  if (!(text in cache)) {

    if (Filter.isSelectorFilter(text))
      cache[text] = new SelectorFilter(text);
    else if (Filter.isWhitelistFilter(text))
      cache[text] = new WhitelistFilter(text);
    else
      cache[text] = new PatternFilter(text);

  }
  return cache[text];
}

Filter.isSelectorFilter = function(text) {
  return /\#\#/.test(text);
}

Filter.isWhitelistFilter = function(text) {
  return /^\@\@/.test(text);
}

Filter.isComment = function(text) {
  return text.length == 0 ||
         (text[0] == '!') ||
         (text[0] == '[' && text.indexOf('[Adblock') == 0) ||
         (text[0] == '(' && text.indexOf('(Adblock') == 0);
}

// Given a comma-separated list of domain includes and excludes, return
// { applied_on:array, not_applied_on:array }.  An empty applied_on array
// means "on all domains except those in the not_applied_on array."  An
// empty not_applied_on array means "defer to the applied_on array."
//
// If a rule runs on *all* domains:
//   { applied_on: [], not_applied_on: [] }
// If a rule runs on *some* domains:
//   { applied_on: [d1, d2,...], not_applied_on: [] }
// If a rule is not run on *some* domains:
//   { applied_on: [], not_applied_on: [ d1, d2, d3... ] }
// If a rule runs on *some* domains but not on *other* domains:
//   { applied_on: [ d1, d2,...], not_applied_on: [ d1, d2,...] }
Filter._domainInfo = function(domainText, divider) {
  var domains = domainText.split(divider);

  var result = {
    applied_on: [],
    not_applied_on: []
  };

  if (domains == '')
    return result;

  for (var i = 0; i < domains.length; i++) {
    var domain = domains[i];
    if (domain[0] == '~') {
      result.not_applied_on.push(domain.substring(1));
    } else {
      result.applied_on.push(domain);
    }
  }

  return result;
}

// Return true if any of the domains in list are a complete component of the
// given domain.  So list [ "a.com" ] matches domain "sub.a.com", but not vice
// versa.
Filter._domainIsInList = function(domain, list) {
  // TODO speed: background's get_content_script_data calls limitedToDomain
  // and this function is the bottleneck.  Figure out some way to shortcut
  // so that we don't have to call this as frequently.  Perhaps each rule
  // keeps a list of the first letter of each TLD in its domains, and we first
  // check whether the TLD of domain is in that list, before checking fully.
  for (var i = 0; i < list.length; i++) {
    if (list[i] == domain)
      return true;
    if (domain.match("\\." + list[i] + "$")) // ends w/ a period + list[i]?
      return true;
  }
  return false;
}

Filter.prototype = {
  __type: "Filter",

  // Returns true if this filter applies on all domains.
  isGlobal: function() {
    var posEmpty = this._domains.applied_on.length == 0;
    var negEmpty = this._domains.not_applied_on.length == 0;
    return (posEmpty && negEmpty);
  },

  // Returns true if this filter should be run on an element from the given
  // domain.
  appliesToDomain: function(domain) {
    if (this.isGlobal())
      return true;

    var posMatch = Filter._domainIsInList(domain, this._domains.applied_on);
    var negMatch = Filter._domainIsInList(domain, this._domains.not_applied_on);

    if (posMatch) {
      if (negMatch) return false;
      else return true;
    }
    else if (this._domains.applied_on.length != 0) {
      // some domains applied, but we didn't match
      return false;
    }
    else if (negMatch) { // no domains applied, we are excluded
      return false;
    }
    else { // no domains applied, we are not excluded
      return true;
    }
  }
}

// Filters that block by CSS selector.
var SelectorFilter = function(text) {
  Filter.call(this); // call base constructor

  var parts = text.split('##');
  this._domains = Filter._domainInfo(parts[0], ',');
  this.selector = parts[1];
};
SelectorFilter.prototype = {
  // Inherit from Filter.
  __proto__: Filter.prototype,

  __type: "SelectorFilter"
}

// Filters that block by URL regex or substring.
var PatternFilter = function(text) {
  Filter.call(this); // call base constructor

  var data = PatternFilter._parseRule(text);

  this._domains = Filter._domainInfo(data.domainText, '|');
  this._allowedElementTypes = data.allowedElementTypes;
  this._options = data.options;
  this._rule = data.rule;
  // Preserve _text for later in Chrome's background page.  Don't do so in
  // safari or in content scripts, where it's not needed.
  // TODO once Chrome has a real blocking API, we can get rid of _text.
  if (document.location.protocol == 'chrome-extension:')
    this._text = text;
}

// Return a { rule, domainText, allowedElementTypes } object
// for the given filter text.
PatternFilter._parseRule = function(text) {

  var result = {
    domainText: '',
    allowedElementTypes: ElementTypes.NONE,
    options: FilterOptions.NONE
  };

  var optionsRegex = /\$~?[\w\-]+(?:=[^,\s]+)?(?:,~?[\w\-]+(?:=[^,\s]+)?)*$/;
  var optionsText = text.match(optionsRegex);
  if (!optionsText) {
    var rule = text;
    var options = [];
  } else {
    var options = optionsText[0].substring(1).toLowerCase().split(',');
    var rule = text.replace(optionsText[0], '');
  }

  var disallowedElementTypes = ElementTypes.NONE;

  for (var i = 0; i < options.length; i++) {
    var option = options[i];

    if (option.indexOf('domain=') == 0) {
      result.domainText = option.substring(7);
      continue;
    }

    var inverted = (option[0] == '~');
    if (inverted)
      option = option.substring(1);

    option = option.replace(/\-/, '_');
    if (option in ElementTypes) { // this option is a known element type
      if (inverted)
        disallowedElementTypes |= ElementTypes[option];
      else
        result.allowedElementTypes |= ElementTypes[option];
    }
    else if (option == 'third_party') {
      result.options |= 
          (inverted ? FilterOptions.FIRSTPARTY : FilterOptions.THIRDPARTY);
    }
    else if (option == 'match_case') {
      //doesn't have an inverted function
      result.options |= FilterOptions.MATCHCASE;
    }
    else if (option == 'collapse') {
      // We currently do not support this option. However I've never seen any
      // reports where this was causing issues. So for now, simply skip this
      // option, without returning that the filter was invalid.
    }
    else {
      // In case ABP adds a new option, and we do not support it, return an
      // error. If we don't do this and the new type is an elementtype, the
      // filter *$newtype will be parsed as '*$', e.g. match everything.
      throw new Error("Unsupported option: $" + options[i]);
    }
  }
  // No element types mentioned?  All types are allowed.
  if (result.allowedElementTypes == ElementTypes.NONE)
    result.allowedElementTypes = (ElementTypes.ALLRESOURCETYPES);

  // Extract the disallowed types from the allowed types
  result.allowedElementTypes &= ~disallowedElementTypes;

  // Since ABP 1.3 'image' can also refer to 'background'
  if (result.allowedElementTypes & ElementTypes.image)
    result.allowedElementTypes |= ElementTypes.background;

  // We parse whitelist rules too on behalf of WhitelistFilter, in which case
  // we already know it's a whitelist rule so can ignore the @@s.
  if (Filter.isWhitelistFilter(rule))
    rule = rule.substring(2);

  // Convert regexy stuff.

  // First, check if the rule itself is in regex form.  If so, we're done.
  if (/^\/.+\/$/.test(rule)) {
    result.rule = rule.substr(1, rule.length - 2); // remove slashes
    result.rule = new RegExp(result.rule);
    return result;
  }

  if (!(result.options & FilterOptions.MATCHCASE))
    rule = rule.toLowerCase();

  // If it starts or ends with *, strip that -- it's a no-op.
  rule = rule.replace(/^\*/, '');
  rule = rule.replace(/\*$/, '');
  // ^ at the end of a rule should only match a delimiter, but we ignore that
  // for efficiency's sake.
  rule = rule.replace(/\^$/, '');
  //If a rule contains *, replace that by .*
  rule = rule.replace(/\*/g, '.*');
  //^ is a separator char in ABP
  rule = rule.replace(/\^/g, '[^\-.%a-zA-Z0-9]');
  // ? at the start of a regex means something special; escape it always.
  rule = rule.replace(/\?/g, '\\?');
  // . shouldn't mean "match any character" unless it's followed by a * in
  // which case we were almost certainly the ones who put it there.
  rule = rule.replace(/\.(?!\*)/g, '\\.');
  // A + means one or more repetitions in regex. Escape it.
  rule = rule.replace(/\+/g, '\\+');
  // Starting with || means it should start at a domain or subdomain name, so
  // match ://<the rule> or ://some.domains.here.and.then.<the rule>
  rule = rule.replace(/^\|\|/, '\://([^/]+\\.)*');
  // Starting with | means it should be at the beginning of the URL.
  rule = rule.replace(/^\|/, '^');
  // Rules ending in | means the URL should end there
  rule = rule.replace(/\|$/, '$');
  // Any other '|' within a string should really be a pipe.
  rule = rule.replace(/\|/g, '\\|');
  // Using escaped characters is faster. Only replace the most common one: /
  rule = rule.replace(/\//g, '\\/');

  result.rule = new RegExp(rule);
  return result;
}

PatternFilter.prototype = {
  // Inherit from Filter.
  __proto__: Filter.prototype,

  __type: "PatternFilter",

  // Returns true if an element of the given type loaded from the given URL 
  // would be matched by this filter.
  //   url:string the url the element is loading.
  //   elementType:ElementTypes the type of DOM element.
  //   isThirdParty: true if the request for url was from a page of a
  //       different origin
  matches: function(url, elementType, isThirdParty) {
    if (!(elementType & this._allowedElementTypes))
      return false;

    // If the resource is being loaded from the same origin as the document,
    // and your rule applies to third-party loads only, we don't care what
    // regex your rule contains, even if it's for someotherserver.com.
    if ((this._options & FilterOptions.THIRDPARTY) && !isThirdParty)
      return false;

    if ((this._options & FilterOptions.FIRSTPARTY) && isThirdParty)
      return false;

    if (!(this._options & FilterOptions.MATCHCASE))
      url = url.toLowerCase();

    return this._rule.test(url);
  }
}

// Filters that specify URL regexes or substrings that should not be blocked.
var WhitelistFilter = function(text) {
  PatternFilter.call(this, text); // call base constructor.

  // TODO: Really, folks, this just ain't the way to do polymorphism.
  this.__type = "WhitelistFilter";
}
// When you call any instance methods on WhitelistFilter, do the same
// thing as in PatternFilter.
WhitelistFilter.prototype = PatternFilter.prototype;
