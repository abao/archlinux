function convertTDLink(e) {
	if (!e.altKey) return;
	
	var a, gota = false;
	for (a = e.target; a; a = a.parentNode) {
		if (a instanceof HTMLAnchorElement) {
			gota = true;
			break;
		}
	}
	
	if (!gota) return;

	var src = a.outerHTML.match(/[tT][hH][uU][nN][dD][eE][rR]:\/\/[a-zA-Z0-9\+\/=]+/) 

	if (!src) return;
	src = String(src);
	a.href = src;

	a.removeAttribute("onclick");
	a.removeAttribute("oncontextmenu");
}

document.addEventListener("mousedown", convertTDLink, true);
