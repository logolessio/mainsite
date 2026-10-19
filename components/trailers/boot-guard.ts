// A page that never starts looks exactly like a blank page. This small script runs before anything else on scroll.logoless.io, listens for
// errors and blocked requests, and if the app has not got past its loading screen after nine seconds it says so on screen, with what it saw,
// so the person can reload or tell us what happened. The app marks itself ready (data-scroll-ready on <html>) once it has left the loading screen.
export const BOOT_GUARD = `(function(){
var seen=[];
function add(m){seen.push(String(m).slice(0,160))}
addEventListener('error',function(e){add((e.message||'error')+(e.filename?' ('+e.filename.split('/').pop()+':'+e.lineno+')':''))},true);
addEventListener('unhandledrejection',function(e){add('promise: '+((e.reason&&e.reason.message)||e.reason))});
addEventListener('securitypolicyviolation',function(e){add('blocked ('+e.violatedDirective+'): '+e.blockedURI)});
setTimeout(function(){
var h=document.documentElement;
if(h.getAttribute('data-scroll-ready')==='1')return;
var d=document.createElement('div');
d.setAttribute('role','alert');
d.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:20px 28px;background:#111;color:#e8e6e1;font:14px/1.55 system-ui,sans-serif;border-top:1px solid #333';
var t=document.createElement('p');
t.style.cssText='margin:0 0 6px;font-size:16px;font-weight:600';
t.textContent='scroll has not started.';
var a=document.createElement('a');
a.href=location.href;a.textContent='Reload';a.style.cssText='color:#fff;text-decoration:underline;margin-left:8px';
t.appendChild(a);
var p=document.createElement('p');
p.style.cssText='margin:0;color:#aaa;word-break:break-word';
p.textContent='If it keeps happening, send this to the team: '+(h.getAttribute('data-scroll-state')||'the page scripts never started')+' | '+(seen.join(' ; ')||'no error was reported')+' | '+navigator.userAgent.slice(0,110);
d.appendChild(t);d.appendChild(p);
document.body.appendChild(d);
},9000);
})();`
