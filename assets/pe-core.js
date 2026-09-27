/* =========================================================================
   Prime Era — ядро экосистемы v2.
   Один файл на все страницы. Подключается в <head> КАЖДОЙ страницы:
     <link rel="stylesheet" href="assets/pe-core.css">
     <script src="assets/pe-core.js" data-module="tasks"></script>
   data-module — id модуля из списка MODULES ниже ('home' для главной,
   'admin' для админки). Ядро само:
     • показывает экран входа / регистрации / гостевого режима;
     • проверяет, одобрен ли пользователь владельцем и есть ли у него доступ
       к этому модулю — и закрывает страницу, если нет;
     • рисует общую верхнюю навигацию (только доступные модули);
     • привязывает localStorage страницы к вошедшему пользователю и
       синхронизирует его через Firebase (как remote-sync.js в v1);
     • даёт страницам API window.PE (пользователи, аватарки, права, Firebase).
   Данные v2 лежат в Firebase под отдельным корнем /ecosystem-v2 — v1 не
   трогается и продолжает работать как раньше.
   ========================================================================= */
(function(){
"use strict";

var SCRIPT = document.currentScript;
var MODULE = (SCRIPT && SCRIPT.getAttribute('data-module')) || 'home';
var NO_NAV = SCRIPT && SCRIPT.getAttribute('data-nav') === 'none';

/* ---------- нативный localStorage (до подмены) ---------- */
var SP = Storage.prototype;
var NATIVE = { get:SP.getItem, set:SP.setItem, remove:SP.removeItem };
function nget(k){ try{ return NATIVE.get.call(localStorage, k); }catch(e){ return null; } }
function nset(k, v){ try{ NATIVE.set.call(localStorage, k, v); return true; }catch(e){ return false; } }
function ndel(k){ try{ NATIVE.remove.call(localStorage, k); }catch(e){} }
function njson(k, def){ try{ var v=nget(k); return v ? JSON.parse(v) : def; }catch(e){ return def; } }

/* ---------- конфигурация ---------- */
var CFG = {
  FB: 'https://prime-era-glossary-default-rtdb.firebaseio.com',
  ROOT: 'ecosystem-v2',
  LEGACY_ROOT: 'ecosystem-state',
  /* Web API key проекта Firebase (Настройки проекта → Общие). Пока пусто — вход
     работает по-старому (хеш пароля в базе). С ключом — через Firebase Authentication,
     и база закрывается правилами безопасности (firebase-rules.json). */
  API_KEY: 'AIzaSyBMYJ5Tqbh7Eh5892XFqSjwQPb7cAftEzs',
  AUTH_SUFFIX: '@pe2.prime-era.app',
  MOCK: false,
  MODE: 'live'
};
/* тестовый режим: ?pe2=mock — всё хранится только в этом браузере (без
   Firebase), ?pe2=<имя> — отдельный корень ecosystem-v2-<имя> в Firebase,
   ?pe2=live — вернуться к рабочей базе. Режим запоминается в браузере. */
(function(){
  var q = location.search.match(/[?&]pe2=([a-z0-9_-]+)/i);
  if(q){ if(q[1]==='live') ndel('pe2_backend'); else nset('pe2_backend', q[1]); }
  var b = nget('pe2_backend');
  if(b==='mock'){ CFG.MOCK=true; CFG.MODE='mock'; }
  else if(b){ CFG.ROOT='ecosystem-v2-'+b; CFG.MODE=b; }
})();
var NS = CFG.MOCK ? 'mock' : CFG.ROOT;
CFG.AUTH = !!CFG.API_KEY && !CFG.MOCK;
/* Все запросы к базе (и ядра, и старых модулей — глоссария, оргсхемы) идут через
   эту обёртку:
   • с входом через Firebase к ним добавляется токен вошедшего (?auth=…) — поэтому
     старые модули продолжают работать и после закрытия базы правилами;
   • в тестовом режиме записи в рабочую базу тихо «успешны», но никуда не уходят. */
var realFetch=window.fetch.bind(window);
function withAuth(u, t){ return t ? u+(u.indexOf('?')<0?'?':'&')+'auth='+encodeURIComponent(t) : u; }
window.fetch=function(url, opts){
  if(typeof url!=='string') return realFetch(url, opts);
  var u=url, m=String(opts&&opts.method||'GET').toUpperCase();
  if(u.indexOf(CFG.FB)!==0) return realFetch(url, opts);
  if(CFG.MODE!=='live' && m!=='GET' && (CFG.MOCK || u.indexOf(CFG.FB+'/'+CFG.ROOT+'/')!==0 && u.indexOf(CFG.FB+'/'+CFG.ROOT+'.json')!==0)){
    if(window.console) console.info('[pe2 тест] запись в рабочую базу заблокирована:', m, u);
    return Promise.resolve(new Response('null', { status:200, headers:{ 'Content-Type':'application/json' } }));
  }
  if(CFG.AUTH && !/[?&]auth=/.test(u)) return ensureToken().then(function(t){ return realFetch(withAuth(u, t), opts); });
  return realFetch(url, opts);
};   // пространство имён локальных ключей

var MODULES = [
  { id:'tasks', name:'Задачи', href:'tasks.html',
    desc:'Общая доска команды: канбан, календарь, повторы, учёт времени по этапам и отчёты. Заменяет Планировщик и Хронометраж.',
    icon:'<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>' },
  { id:'glossary', name:'Глоссарий', href:'glossary.html',
    desc:'Тренажёр терминов по дизайну, Tilda, Figma, копирайтингу и продажам — изучение, экзамен, разбор слабых мест.',
    icon:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20"/>' },
  { id:'objections', name:'Возражения', href:'objections.html',
    desc:'Что отвечать клиенту, когда он возражает — по категориям, с поиском и готовыми фразами.',
    icon:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>' },
  { id:'objections-raw', name:'Возражения Prime Era', href:'objections-raw.html',
    desc:'Полная база формулировок и тактик по возражениям студии — единый список с фильтрами.',
    icon:'<path d="M12 2l2.9 6.6 7.1.7-5.4 4.9 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.9 7.1-.7z"/>' },
  { id:'org-board', name:'Оргсхема', href:'org-board.html',
    desc:'Организационная структура студии — отделы, сотрудники, зоны ответственности. Редактирует администратор.',
    icon:'<circle cx="12" cy="4.5" r="2.3"/><path d="M12 6.8v4"/><circle cx="5.5" cy="17.5" r="2.3"/><circle cx="12" cy="17.5" r="2.3"/><circle cx="18.5" cy="17.5" r="2.3"/><path d="M5.5 15.2v-2a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2"/><path d="M12 11.2v2"/>' },
  { id:'prime-sales', name:'База знаний', href:'prime-sales.html',
    desc:'Система продаж Prime Era — методология, техники и разбор возражений.',
    icon:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17z"/><path d="M8 7h8M8 11h6"/>' }
];
var LEGACY_NAMES = ['Саша','Андрей','Лина','Лиана'];
var COLORS = ['#2563EB','#059669','#D97706','#DB2777','#7C3AED','#0891B2','#DC2626','#65A30D','#EA580C','#475569','#0D9488','#9333EA'];
var ROLE_NAMES = { owner:'Владелец', admin:'Администратор', member:'Сотрудник' };
var STATUS_NAMES = { pending:'Ждёт одобрения', active:'Активен', blocked:'Заблокирован', rejected:'Отклонён' };

function moduleById(id){ for(var i=0;i<MODULES.length;i++) if(MODULES[i].id===id) return MODULES[i]; return null; }

/* ---------- утилиты ---------- */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function uid(p){ return (p||'u')+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function clone(o){ return o==null ? o : JSON.parse(JSON.stringify(o)); }
function $(sel, root){ return (root||document).querySelector(sel); }
function $$(sel, root){ return Array.prototype.slice.call((root||document).querySelectorAll(sel)); }
function onBody(fn){ if(document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
function fmtDate(ts){ if(!ts) return '—'; var d=new Date(ts); return d.toLocaleDateString('ru-RU',{ day:'numeric', month:'short', year:(d.getFullYear()!==new Date().getFullYear()?'numeric':undefined) })+', '+d.toLocaleTimeString('ru-RU',{ hour:'2-digit', minute:'2-digit' }); }
function relTime(ts){
  if(!ts) return 'никогда';
  var s=Math.round((Date.now()-ts)/1000);
  if(s<60) return 'только что';
  var m=Math.round(s/60); if(m<60) return m+' мин назад';
  var h=Math.round(m/60); if(h<24) return h+' ч назад';
  var d=Math.round(h/24); if(d<30) return d+' дн назад';
  return fmtDate(ts);
}

/* ---------- SHA-256 (чистый JS, одинаково работает и на file://, и на https) ---------- */
var sha256 = (function(){
  var maxWord=Math.pow(2,32), H0=[], K=[], isComp={}, n=0;
  for(var c=2; n<64; c++){
    if(!isComp[c]){
      for(var i=0;i<313;i+=c) isComp[i]=c;
      H0[n]=(Math.pow(c,.5)*maxWord)|0;
      K[n++]=(Math.pow(c,1/3)*maxWord)|0;
    }
  }
  H0=H0.slice(0,8);
  function rr(v,a){ return (v>>>a)|(v<<(32-a)); }
  return function(str){
    var msg=unescape(encodeURIComponent(str)), l=msg.length, words=[], i, j;
    for(i=0;i<l;i++) words[i>>2] |= (msg.charCodeAt(i)&0xff) << ((3-i%4)*8);
    words[l>>2] |= 0x80 << ((3-l%4)*8);
    var nb=((l+8)>>6)+1;
    words[nb*16-1]=l*8;
    for(i=0;i<nb*16;i++) words[i]=words[i]|0;
    var H=H0.slice(), W=new Array(64);
    for(j=0;j<nb*16;j+=16){
      var a=H[0],b=H[1],cc=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for(i=0;i<64;i++){
        if(i<16) W[i]=words[j+i];
        else { var w15=W[i-15], w2=W[i-2];
          W[i]=(W[i-16]+(rr(w15,7)^rr(w15,18)^(w15>>>3))+W[i-7]+(rr(w2,17)^rr(w2,19)^(w2>>>10)))|0; }
        var t1=(h+(rr(e,6)^rr(e,11)^rr(e,25))+((e&f)^(~e&g))+K[i]+W[i])|0;
        var t2=((rr(a,2)^rr(a,13)^rr(a,22))+((a&b)^(a&cc)^(b&cc)))|0;
        h=g; g=f; f=e; e=(d+t1)|0; d=cc; cc=b; b=a; a=(t1+t2)|0;
      }
      H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+cc)|0; H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
    }
    return H.map(function(x){ var s=(x>>>0).toString(16); return ('00000000'+s).slice(-8); }).join('');
  };
})();
function makeSalt(){ var a=''; for(var i=0;i<16;i++) a+=Math.floor(Math.random()*16).toString(16); return a+Date.now().toString(16); }
function hashPass(pass, salt){ var h=salt+':'+pass; for(var i=0;i<1000;i++) h=sha256(salt+h); return h; }
function genPassword(){ var ch='abcdefghjkmnpqrstuvwxyz23456789', s=''; for(var i=0;i<8;i++) s+=ch.charAt(Math.floor(Math.random()*ch.length)); return s; }
function normLogin(s){ return String(s||'').trim().toLowerCase(); }
function validLogin(s){ return /^[a-zа-яё0-9_-]{3,32}$/.test(s); }

/* ---------- ключи Firebase: запрещены . # $ / [ ] ---------- */
function encKey(k){ return String(k).replace(/[%.#$\/\[\]\x00-\x1F\x7F]/g, function(c){ return '%'+('0'+c.charCodeAt(0).toString(16)).slice(-2).toUpperCase(); }); }
function decKey(k){ return String(k).replace(/%([0-9A-F]{2})/g, function(_,h){ return String.fromCharCode(parseInt(h,16)); }); }

/* =========================================================================
   Хранилище: Firebase REST (+ локальная «песочница» для теста)
   ========================================================================= */
var MOCK_KEY='pe2_mockdb';
var mockBus = (CFG.MOCK && window.BroadcastChannel) ? new BroadcastChannel('pe2mock') : null;
var mockListeners=[];
function segs(path){ return String(path||'').split('/').filter(Boolean); }
function mockRoot(){ return njson(MOCK_KEY, {}) || {}; }
function getAt(tree, path){ var s=segs(path), cur=tree; for(var i=0;i<s.length;i++){ if(cur==null || typeof cur!=='object') return null; cur=cur[s[i]]; } return cur===undefined ? null : cur; }
function prune(v){
  if(v===null || typeof v!=='object') return v;
  if(Array.isArray(v)){ var a=v.map(prune).filter(function(x){ return x!==null && x!==undefined; }); return a.length ? a : null; }
  var keys=Object.keys(v), out={}, any=false;
  keys.forEach(function(k){ var x=prune(v[k]); if(x!==null && x!==undefined){ out[k]=x; any=true; } });
  return any ? out : null;
}
function setAt(tree, path, data){
  var s=segs(path);
  if(!s.length) return prune(clone(data));
  tree=(tree && typeof tree==='object') ? tree : {};
  var cur=tree;
  for(var i=0;i<s.length-1;i++){ if(!cur[s[i]] || typeof cur[s[i]]!=='object') cur[s[i]]={}; cur=cur[s[i]]; }
  var last=s[s.length-1];
  if(data===null || data===undefined) delete cur[last]; else cur[last]=clone(data);
  return prune(tree);
}
function mockWrite(path, data, merge){
  var root=mockRoot();
  if(merge && data){ Object.keys(data).forEach(function(k){ root=setAt(root, path+'/'+k, data[k]); }); }
  else root=setAt(root, path, data);
  nset(MOCK_KEY, JSON.stringify(root||{}));
  var ev={ path:path, data:clone(data), merge:!!merge };
  mockListeners.forEach(function(l){ try{ l(ev); }catch(e){} });
  if(mockBus) mockBus.postMessage(ev);
}
if(mockBus) mockBus.onmessage=function(m){ mockListeners.forEach(function(l){ try{ l(m.data); }catch(e){} }); };

function fbUrl(path){ return CFG.FB+'/'+CFG.ROOT+(path?'/'+path:'')+'.json'; }
function fb(method, path, body){
  if(CFG.MOCK){
    return new Promise(function(res){
      setTimeout(function(){
        if(method==='GET') return res(clone(getAt(mockRoot(), path)));
        if(method==='PUT'){ mockWrite(path, body); return res(clone(body)); }
        if(method==='PATCH'){ mockWrite(path, body, true); return res(clone(body)); }
        if(method==='DELETE'){ mockWrite(path, null); return res(null); }
        if(method==='POST'){ var id='-'+uid('m'); mockWrite(path+'/'+id, body); return res({ name:id }); }
      }, 30);
    });
  }
  var opts={ method:method, headers:{} };
  if(body!==undefined && method!=='GET'){ opts.body=JSON.stringify(body); opts.headers['Content-Type']='application/json'; }
  return fetch(fbUrl(path), opts).then(function(r){
    if(!r.ok) throw new Error('Firebase '+r.status);
    return r.json();
  });
}
/* транзакция через ETag: fn(current) → новое значение или undefined (отмена) */
function tx(path, fn, tries){
  tries=tries||0;
  if(CFG.MOCK){
    return fb('GET', path).then(function(cur){
      var nv=fn(cur); if(nv===undefined) return { committed:false, value:cur };
      return fb('PUT', path, nv).then(function(){ return { committed:true, value:nv }; });
    });
  }
  return fetch(fbUrl(path), { headers:{ 'X-Firebase-ETag':'true' } }).then(function(r){
    if(!r.ok) throw new Error('Firebase '+r.status);
    var etag=r.headers.get('ETag');
    return r.json().then(function(cur){
      var nv=fn(cur); if(nv===undefined) return { committed:false, value:cur };
      var h={ 'Content-Type':'application/json' }; if(etag) h['if-match']=etag;
      return fetch(fbUrl(path), { method:'PUT', headers:h, body:JSON.stringify(nv) }).then(function(r2){
        if(r2.status===412){ if(tries>8) throw new Error('Слишком много одновременных изменений'); return tx(path, fn, tries+1); }
        if(!r2.ok) throw new Error('Firebase '+r2.status);
        return { committed:true, value:nv };
      });
    });
  });
}
/* подписка в реальном времени (EventSource). С токеном: при истечении — обновляем
   и переподключаемся; если доступа нет (правила базы) — вызываем onCancel. */
var STREAMS=[];
function stream(path, onChange, onCancel){
  var tree=null, es=null, closed=false, pollT=null, gotFirst=false, fails=0;
  function emit(ev){ try{ onChange(tree, ev); }catch(e){ if(window.console) console.error(e); } }
  if(CFG.MOCK){
    var root='/'+segs(path).join('/');
    var l=function(ev){
      var p='/'+segs(ev.path).join('/');
      if(p===root || p.indexOf(root+'/')===0 || root.indexOf(p+'/')===0){ fb('GET', path).then(function(d){ tree=d; emit({ path:'/', full:true }); }); }
    };
    mockListeners.push(l);
    fb('GET', path).then(function(d){ tree=d; emit({ path:'/', full:true, first:true }); });
    return { close:function(){ closed=true; mockListeners=mockListeners.filter(function(x){ return x!==l; }); }, get:function(){ return tree; }, reopen:function(){} };
  }
  function cancel(){ if(es){ es.close(); es=null; } closed=true; clearTimeout(pollT); if(onCancel) onCancel(); }
  function poll(){
    if(closed) return;
    fb('GET', path).then(function(d){ tree=d; gotFirst=true; emit({ path:'/', full:true }); })
      .catch(function(e){ if(!gotFirst && onCancel && /40[13]/.test(e.message)) cancel(); });
    pollT=setTimeout(poll, 20000);
  }
  function open(){
    if(closed) return;
    if(!window.EventSource) return poll();
    ensureToken().then(function(t){
      if(closed) return;
      try{ es=new EventSource(withAuth(fbUrl(path), t)); }catch(e){ return poll(); }
      es.addEventListener('put', function(e){
        var m=JSON.parse(e.data); tree=setAt(tree, m.path, m.data);
        var first=!gotFirst; gotFirst=true; fails=0; emit({ path:m.path, full:m.path==='/', first:first });
      });
      es.addEventListener('patch', function(e){
        var m=JSON.parse(e.data), base=m.path==='/'?'':m.path;
        Object.keys(m.data||{}).forEach(function(k){ tree=setAt(tree, base+'/'+k, m.data[k]); });
        emit({ path:m.path, keys:Object.keys(m.data||{}) });
      });
      es.addEventListener('cancel', function(){ cancel(); });
      es.addEventListener('auth_revoked', function(){ if(es) es.close(); es=null; ensureToken(true).then(open); });
      es.onerror=function(){
        if(!es || es.readyState!==2 || closed) return;
        es=null; fails++;
        if(fails>3){ if(!gotFirst && onCancel) return cancel(); return poll(); }
        setTimeout(function(){ ensureToken(fails>1).then(open); }, 800*fails);
      };
    });
  }
  var api={ close:function(){ closed=true; if(es) es.close(); clearTimeout(pollT); }, get:function(){ return tree; },
            reopen:function(){ if(closed) return; if(es){ es.close(); es=null; } clearTimeout(pollT); open(); } };
  STREAMS.push(api);
  open();
  return api;
}

/* =========================================================================
   Firebase Authentication (REST): вход, регистрация, смена пароля, токены
   ========================================================================= */
/* логин → служебный email для Firebase (логины бывают кириллицей) */
function authEmail(login, suffix){
  var b=unescape(encodeURIComponent(String(login))), h='';
  for(var i=0;i<b.length;i++) h+=('0'+b.charCodeAt(i).toString(16)).slice(-2);
  return 'u'+h+(suffix?'.'+suffix:'')+CFG.AUTH_SUFFIX;
}
function idt(method, body){
  return realFetch('https://identitytoolkit.googleapis.com/v1/accounts:'+method+'?key='+CFG.API_KEY, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(body) })
    .then(function(r){ return r.json().then(function(j){ if(!r.ok){ var e=new Error((j.error&&j.error.message)||'AUTH'); e.code=e.message; throw e; } return j; }); });
}
function tokFrom(j){ return { id:j.idToken, refresh:j.refreshToken, exp:Date.now()+(+j.expiresIn||3600)*1000, fbUid:j.localId }; }
function fbSignIn(email, pass){ return idt('signInWithPassword', { email:email, password:pass, returnSecureToken:true }).then(tokFrom); }
function fbSignUp(email, pass){ return idt('signUp', { email:email, password:pass, returnSecureToken:true }).then(tokFrom); }
function fbUpdatePass(idToken, pass){ return idt('update', { idToken:idToken, password:pass, returnSecureToken:true }).then(tokFrom); }
var tokP=null;
function ensureToken(force){
  if(!CFG.AUTH || !session || !session.tok) return Promise.resolve(null);
  var t=session.tok;
  if(!force && t.exp-Date.now()>120000) return Promise.resolve(t.id);
  if(tokP) return tokP;
  tokP=realFetch('https://securetoken.googleapis.com/v1/token?key='+CFG.API_KEY, { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(t.refresh) })
    .then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error((j.error&&j.error.message)||'refresh'); return j; }); })
    .then(function(j){
      session.tok={ id:j.id_token, refresh:j.refresh_token, exp:Date.now()+(+j.expires_in||3600)*1000, fbUid:j.user_id };
      saveSession(session); tokP=null; return session.tok.id;
    }, function(e){
      tokP=null;
      if(/TOKEN_EXPIRED|USER_DISABLED|USER_NOT_FOUND|INVALID_REFRESH_TOKEN/.test(e.message)){ saveSession(null); location.reload(); }
      return t.id;
    });
  return tokP;
}
/* токен живёт час: обновляем заранее и переподключаем подписки */
setInterval(function(){ if(CFG.AUTH && session && session.tok) ensureToken(true).then(function(){ STREAMS.forEach(function(s){ s.reopen(); }); }); }, 45*60000);
/* создать учётку Firebase для логина (регистрация, админ, сброс пароля) */
function createAccount(login, pass, fresh){
  var email=authEmail(login, fresh ? Date.now().toString(36) : '');
  return fbSignUp(email, pass).then(function(tok){ return { email:email, fbUid:tok.fbUid, tok:tok }; });
}
/* ---------- учётные данные (для админки): работают и со старым входом, и с Firebase ---------- */
function loginTaken(login, exceptUid){
  return CFG.AUTH ? fb('GET','logins/'+encKey(login)).then(function(e){ return !!e; })
                  : fb('GET','auth/'+encKey(login)).then(function(a){ return !!(a && a.uid!==exceptUid); });
}
/* задать пароль пользователю u ({id, login, authUid}). С Firebase — новая учётка
   (пароль чужой учётки без сервера сменить нельзя), старая отвязывается. */
function setCredentials(u, pass){
  if(!CFG.AUTH){ var salt=makeSalt(); return fb('PUT','auth/'+encKey(u.login), { uid:u.id, salt:salt, hash:hashPass(pass, salt) }); }
  return createAccount(u.login, pass, true).then(function(a){
    return fb('PATCH','users/'+u.id, { authEmail:a.email, authUid:a.fbUid })
      .then(function(){ return fb('PUT','uidmap/'+a.fbUid, u.id); })
      .then(function(){ return u.authUid && u.authUid!==a.fbUid ? fb('DELETE','uidmap/'+u.authUid) : null; })
      .then(function(){ return fb('PUT','logins/'+encKey(u.login), a.email); });
  });
}
function removeCredentials(u){
  if(!CFG.AUTH) return fb('DELETE','auth/'+encKey(u.login));
  return Promise.all([fb('DELETE','logins/'+encKey(u.login)), u.authUid ? fb('DELETE','uidmap/'+u.authUid) : null]);
}
function audit(action, target, details){
  var u=R.me();
  return fb('POST', 'audit', { at:Date.now(), by:u?u.id:(session&&session.guest?'guest':''), byName:u?fullName(u):'Гость', action:action, target:target||'', details:details||'' }).catch(function(){});
}

/* =========================================================================
   Сессия и привязка localStorage к пользователю
   ========================================================================= */
var SESSION_KEY='pe2_session_'+NS;
var session=njson(SESSION_KEY, null);
function saveSession(s){ session=s; if(s) nset(SESSION_KEY, JSON.stringify(s)); else ndel(SESSION_KEY); }

var SCOPE = session && session.uid ? 'pe2u_'+session.uid+'__'
          : session && session.guest ? 'pe2g_'+NS+'__'
          : 'pe2anon__';
/* локальные кэши модулей (…-cache) привязаны к пользователю, но в облако не уходят */
function noSync(k){ return /(^|[-_])cache$/.test(k); }
function unscoped(k){ return k.indexOf('pe2_')===0 || k==='pe_logged_user' || k==='pe_manager_gender' || k.indexOf('__pe')===0; }
if(CFG.MOCK) SCOPE='mock_'+SCOPE;

/* ---- синхронизация данных пользователя (аналог remote-sync.js v1, но без потерь) ---- */
var SYNC_ON = !!(session && session.uid);
var PENDING_KEY = 'pe2_pending_'+NS+'_'+(session&&session.uid||'');
var pending = SYNC_ON ? njson(PENDING_KEY, {}) : {};
var pushT=null;
function queuePush(k){
  if(!SYNC_ON) return;
  pending[k]=Date.now(); nset(PENDING_KEY, JSON.stringify(pending));
  clearTimeout(pushT); pushT=setTimeout(flushPush, 800);
}
function flushPush(keepalive){
  if(!SYNC_ON) return;
  var keys=Object.keys(pending); if(!keys.length) return;
  var patch={}, stamp={};
  keys.forEach(function(k){ patch[encKey(k)]=nget(SCOPE+k); stamp[k]=pending[k]; });
  var path='state/'+session.uid;
  var done=function(){ keys.forEach(function(k){ if(pending[k]===stamp[k]) delete pending[k]; }); nset(PENDING_KEY, JSON.stringify(pending)); };
  if(CFG.MOCK){ fb('PATCH', path, patch).then(done); return; }
  try{
    fetch(fbUrl(path), { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(patch), keepalive:!!keepalive })
      .then(function(r){ if(r.ok) done(); }).catch(function(){});
  }catch(e){}
}
window.addEventListener('pagehide', function(){ flushPush(true); });
window.addEventListener('online', function(){ flushPush(); });

SP.getItem=function(key){
  if(this!==window.localStorage || unscoped(String(key))) return NATIVE.get.call(this, key);
  return NATIVE.get.call(this, SCOPE+key);
};
SP.setItem=function(key, val){
  if(this!==window.localStorage || unscoped(String(key))) return NATIVE.set.call(this, key, val);
  NATIVE.set.call(this, SCOPE+key, String(val)); if(!noSync(String(key))) queuePush(String(key));
};
SP.removeItem=function(key){
  if(this!==window.localStorage || unscoped(String(key))) return NATIVE.remove.call(this, key);
  NATIVE.remove.call(this, SCOPE+key); queuePush(String(key));
};

/* облачная копия → в этот браузер. Если есть неотправленные локальные правки,
   локальная версия этого ключа выигрывает и уходит в облако. */
function pullState(){
  if(!SYNC_ON) return Promise.resolve(false);
  return fb('GET', 'state/'+session.uid).then(function(data){
    if(!data || typeof data!=='object') return false;
    var changed=false;
    Object.keys(data).forEach(function(ek){
      var k=decKey(ek), rv=data[ek];
      if(pending[k]) return;
      var lv=nget(SCOPE+k);
      if(rv===null){ if(lv!==null){ ndel(SCOPE+k); changed=true; } }
      else if(typeof rv==='string' && rv!==lv){ nset(SCOPE+k, rv); changed=true; }
    });
    if(Object.keys(pending).length) flushPush();
    return changed;
  }).catch(function(){ return false; });
}
/* перенос личных данных из v1 (ecosystem-state/<имя>) — один раз */
function migrateLegacy(u){
  if(!u || !u.legacyName || u.migratedAt || CFG.MOCK) return Promise.resolve(false);
  var url=CFG.FB+'/'+CFG.LEGACY_ROOT+'/'+encodeURIComponent(u.legacyName)+'.json';
  return fetch(url).then(function(r){ return r.ok ? r.json() : null; }).then(function(old){
    var prefix='pe_u_'+u.legacyName+'__', patch={}, n=0;
    Object.keys(old||{}).forEach(function(k){
      if(typeof old[k]!=='string' || k.indexOf(prefix)!==0) return;
      var key=k.slice(prefix.length);
      if(nget(SCOPE+key)!==null) return;          // уже есть данные v2 — не затираем
      nset(SCOPE+key, old[k]); patch[encKey(key)]=old[k]; n++;
    });
    var jobs=[fb('PATCH', 'users/'+u.id, { migratedAt:Date.now(), migratedKeys:n })];
    if(n) jobs.push(fb('PATCH', 'state/'+u.id, patch));
    return Promise.all(jobs).then(function(){ return n>0; });
  }).catch(function(){ return false; });
}

/* ---- совместимость со старыми модулями (глоссарий, возражения, база знаний) ---- */
function compatName(u){ return u.legacyName || (u.first+(u.last?' '+u.last:'')); }
function writeCompat(){
  var c=session && session.cache;
  if(session && session.uid && c){
    nset('pe_logged_user', c.compat || c.first || '');
    nset('pe_manager_gender', c.gender==='f' ? 'female' : 'male');
  } else if(session && session.guest){
    nset('pe_logged_user', 'Гость'+(session.guestName?' · '+session.guestName:''));
    ndel('pe_manager_gender');
  } else { ndel('pe_logged_user'); ndel('pe_manager_gender'); }
}
writeCompat();
window.peCurrentUser=function(){ return nget('pe_logged_user')||''; };
window.PE_TEAM_USERS=LEGACY_NAMES.slice();
var GENDER_MAP={ 'понял':'поняла','назвал':'назвала','отметил':'отметила','подготовил':'подготовила','сталкивался':'сталкивалась','позвонил':'позвонила','сделал':'сделала','хотел':'хотела','слышал':'слышала','подготовился':'подготовилась','связался':'связалась','рассчитал':'рассчитала','посчитал':'посчитала','думал':'думала','отправлял':'отправляла','написал':'написала','пометил':'пометила','согласен':'согласна','рад':'рада' };
window.peGenderTransform=function(text){
  if(nget('pe_manager_gender')!=='female') return text;
  var result=text;
  Object.keys(GENDER_MAP).forEach(function(k){
    var re=new RegExp('(^|[^а-яёА-ЯЁa-zA-Z0-9_])('+k+')(?![а-яёА-ЯЁa-zA-Z0-9_])','gi');
    result=result.replace(re, function(all, pre, match){
      var repl=GENDER_MAP[k];
      if(match.charAt(0)===match.charAt(0).toUpperCase()) repl=repl.charAt(0).toUpperCase()+repl.slice(1);
      return pre+repl;
    });
  });
  return result;
};

/* =========================================================================
   Реестр: пользователи, настройки модулей, заявки
   ========================================================================= */
var CACHE_KEY='pe2_cache_'+NS;
var R = {
  users:{}, modules:{}, meta:null, requests:{}, loaded:false, requestsLoaded:false,
  me:function(){ return session && session.uid ? (R.users[session.uid]||null) : null; }
};
(function(){ var c=njson(CACHE_KEY, null); if(c){ R.users=c.users||{}; R.modules=c.modules||{}; R.meta=c.meta||null; R.requests=c.requests||{}; } })();
function saveCache(){ nset(CACHE_KEY, JSON.stringify({ users:R.users, modules:R.modules, meta:R.meta, requests:isAdmin()?R.requests:{} })); }

function fullName(u){ if(!u) return 'Неизвестный'; return ((u.first||'')+' '+(u.last||'')).trim() || u.login || 'Без имени'; }
function shortName(u){ if(!u) return '?'; return u.first || u.login || '?'; }
function initials(u){ if(!u) return '?'; return ((u.first||'').charAt(0)+(u.last||'').charAt(0)).toUpperCase() || (u.login||'?').charAt(0).toUpperCase(); }
function userById(id){ return R.users[id] || null; }
function isOwner(u){ u=u||R.me(); return !!(u && u.role==='owner'); }
function isAdmin(u){ u=u||R.me(); return !!(u && (u.role==='owner' || u.role==='admin') && u.status==='active'); }
function modConf(id){ var c=R.modules[id]||{}; return { enabled:c.enabled!==false, guest:!!c.guest, byDefault:c.byDefault!=null ? !!c.byDefault : (id==='tasks' || id==='glossary' || id==='org-board') }; }
function can(moduleId, u){
  if(moduleId==='home') return true;
  if(moduleId==='admin') return isAdmin(u);
  var m=moduleById(moduleId); if(!m) return true;   // неизвестный модуль — не блокируем
  if(session && session.guest && !u) return modConf(moduleId).enabled && modConf(moduleId).guest;
  u=u||R.me(); if(!u || u.status!=='active') return false;
  if(isAdmin(u)) return true;
  if(!modConf(moduleId).enabled) return false;
  return !!(u.access && u.access[moduleId]);
}
function team(moduleId){
  return Object.keys(R.users).map(function(k){ return R.users[k]; })
    .filter(function(u){ return u.status==='active' && (!moduleId || can(moduleId, u)); })
    .sort(function(a,b){ return fullName(a).localeCompare(fullName(b),'ru'); });
}
function avatar(uOrId, size, cls){
  var u = typeof uOrId==='string' ? userById(uOrId) : uOrId;
  size=size||28;
  var st='width:'+size+'px;height:'+size+'px;font-size:'+Math.max(9, Math.round(size*0.4))+'px;';
  if(u && u.avatar) return '<span class="pe2-av'+(cls?' '+cls:'')+'" style="'+st+'" title="'+esc(fullName(u))+'"><img src="'+esc(u.avatar)+'" alt=""></span>';
  return '<span class="pe2-av'+(cls?' '+cls:'')+'" style="'+st+'background:'+esc((u&&u.color)||'#6B7280')+'" title="'+esc(u?fullName(u):'Гость')+'">'+esc(u?initials(u):'Г')+'</span>';
}

/* ---------- обработка аватарки: квадрат 256×256, JPEG ---------- */
/* ---------- фото профиля: чтение файла + редактор кадра (как в оргсхеме) ---------- */
function readImageFile(file){
  return new Promise(function(res, rej){
    if(!file || !/^image\//.test(file.type)) return rej(new Error('Нужна картинка (JPG, PNG, WEBP)'));
    if(file.size>15*1024*1024) return rej(new Error('Файл больше 15 МБ'));
    var fr=new FileReader();
    fr.onerror=function(){ rej(new Error('Не удалось прочитать файл')); };
    fr.onload=function(){ res(fr.result); };
    fr.readAsDataURL(file);
  });
}
/* Редактор: перетаскивание мышью/пальцем, масштаб ползунком, колесом и щипком,
   поворот на 90°. Круг показывает, что попадёт в аватарку. Результат — 256×256 JPEG. */
function openAvatarCropper(src){
  return new Promise(function(resolve){
    var img=new Image();
    img.onerror=function(){ toast('Не удалось открыть картинку','err'); resolve(null); };
    img.onload=function(){
      var S=Math.max(200, Math.min(280, (window.innerWidth||320)-90)), OUT=256, dpr=Math.min(2, window.devicePixelRatio||1);
      var m=modal('<h2>Фото профиля</h2><p class="pe2-muted">Перетащите фото, чтобы лицо оказалось в круге. Масштаб — ползунком, колесом мыши или двумя пальцами.</p>'+
        '<div class="pe2-crop" data-stage style="width:'+S+'px;height:'+S+'px"><canvas width="'+S*dpr+'" height="'+S*dpr+'" style="width:'+S+'px;height:'+S+'px"></canvas><div class="pe2-crop-ring"></div></div>'+
        '<div class="pe2-crop-ctl"><button type="button" class="pe2-crop-b" data-z="-" title="Уменьшить">−</button><input type="range" data-zoom aria-label="Масштаб"><button type="button" class="pe2-crop-b" data-z="+" title="Увеличить">+</button><button type="button" class="pe2-crop-b" data-rot title="Повернуть на 90°">⟳</button></div>'+
        '<div class="pe2-actions"><button type="button" class="pe2-btn" data-pe2-close>Отмена</button><button type="button" class="pe2-btn primary" data-ok>Готово</button></div>',
        { sticky:true, onClose:function(){ if(!done) resolve(null); } });
      var done=false, el=m.el, stage=el.querySelector('[data-stage]'), cv=stage.querySelector('canvas'), ctx=cv.getContext('2d'), zoom=el.querySelector('[data-zoom]');
      var srcCv, w, h, minS, scale, x, y, ptrs={}, pinch=null;
      function prepare(rot){
        srcCv=document.createElement('canvas');
        var r=((rot||0)%4+4)%4, iw=img.naturalWidth, ih=img.naturalHeight;
        srcCv.width = r%2 ? ih : iw; srcCv.height = r%2 ? iw : ih;
        var sc=srcCv.getContext('2d'); sc.translate(srcCv.width/2, srcCv.height/2); sc.rotate(r*Math.PI/2); sc.drawImage(img, -iw/2, -ih/2);
        w=srcCv.width; h=srcCv.height; minS=Math.max(S/w, S/h); scale=minS; x=(S-w*scale)/2; y=(S-h*scale)/2;
        zoom.min=minS; zoom.max=minS*5; zoom.step=minS/100; zoom.value=scale; draw();
      }
      var rot=0;
      function clamp(){ x=Math.min(0, Math.max(S-w*scale, x)); y=Math.min(0, Math.max(S-h*scale, y)); }
      function draw(){ ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#1c1f25'; ctx.fillRect(0,0,S,S); ctx.imageSmoothingQuality='high'; ctx.drawImage(srcCv, x, y, w*scale, h*scale); }
      function zoomTo(ns, cx, cy){
        ns=Math.max(minS, Math.min(minS*5, ns)); if(cx==null){ cx=S/2; cy=S/2; }
        x=cx-(cx-x)*(ns/scale); y=cy-(cy-y)*(ns/scale); scale=ns; clamp(); zoom.value=scale; draw();
      }
      function local(e){ var r=cv.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; }
      stage.addEventListener('pointerdown', function(e){ stage.setPointerCapture(e.pointerId); ptrs[e.pointerId]=local(e); if(Object.keys(ptrs).length===2){ var p=Object.values(ptrs); pinch={ d:Math.hypot(p[0].x-p[1].x, p[0].y-p[1].y), s:scale }; } });
      stage.addEventListener('pointermove', function(e){
        if(!ptrs[e.pointerId]) return;
        var prev=ptrs[e.pointerId], cur=local(e); ptrs[e.pointerId]=cur;
        var ids=Object.keys(ptrs);
        if(ids.length===2 && pinch){ var p=Object.values(ptrs), d=Math.hypot(p[0].x-p[1].x, p[0].y-p[1].y); zoomTo(pinch.s*d/pinch.d, (p[0].x+p[1].x)/2, (p[0].y+p[1].y)/2); return; }
        x+=cur.x-prev.x; y+=cur.y-prev.y; clamp(); draw();
      });
      function up(e){ delete ptrs[e.pointerId]; if(Object.keys(ptrs).length<2) pinch=null; }
      stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
      stage.addEventListener('wheel', function(e){ e.preventDefault(); var p=local(e); zoomTo(scale*(e.deltaY<0?1.08:1/1.08), p.x, p.y); }, { passive:false });
      zoom.addEventListener('input', function(){ zoomTo(parseFloat(zoom.value)); });
      el.querySelector('[data-z="-"]').onclick=function(){ zoomTo(scale/1.15); };
      el.querySelector('[data-z="+"]').onclick=function(){ zoomTo(scale*1.15); };
      el.querySelector('[data-rot]').onclick=function(){ rot++; prepare(rot); };
      el.querySelector('[data-ok]').onclick=function(){
        var out=document.createElement('canvas'); out.width=OUT; out.height=OUT;
        var o=out.getContext('2d'), k=OUT/S; o.fillStyle='#fff'; o.fillRect(0,0,OUT,OUT); o.imageSmoothingQuality='high';
        o.drawImage(srcCv, x*k, y*k, w*scale*k, h*scale*k);
        done=true; m.close(); resolve(out.toDataURL('image/jpeg', 0.86));
      };
      prepare(0);
    };
    img.src=src;
  });
}
/* совместимость: файл → редактор кадра → dataURL (или null, если отменили) */
function processAvatar(file){ return readImageFile(file).then(openAvatarCropper); }

/* =========================================================================
   Решение: пускать ли на страницу
   ========================================================================= */
function decide(){
  if(!R.meta || !R.meta.ownerUid) return R.loaded ? 'setup' : 'wait';
  if(!session || (!session.uid && !session.guest)) return 'gate';
  if(session.guest){
    if(MODULE==='home') return 'ok';
    if(MODULE==='admin') return 'denied';
    return can(MODULE) ? 'ok' : 'denied';
  }
  var u=R.me();
  if(!u) return R.loaded ? 'gone' : 'wait';
  if(u.status==='pending') return 'pending';
  if(u.status==='rejected') return 'rejected';
  if(u.status==='blocked') return 'blocked';
  if(u.status==='deleted') return 'gone';
  if(u.mustChangePass) return 'changepass';
  return can(MODULE) ? 'ok' : 'denied';
}

var readyFns=[], usersFns=[], fired=false, revealed=false, lastDecision=null, gateView=null, gateMsg='';
function fireReady(){
  if(fired) return; fired=true;
  readyFns.splice(0).forEach(function(fn){ try{ fn(PE); }catch(e){ if(window.console) console.error(e); } });
}
function evaluate(){
  var d=decide();
  if(d==='wait') return;
  if(d===lastDecision && d!=='ok'){ return; }
  lastDecision=d;
  if(session && session.uid && R.me()){
    var u=R.me(), c={ first:u.first, last:u.last, gender:u.gender, compat:compatName(u), role:u.role };
    if(JSON.stringify(c)!==JSON.stringify(session.cache||{})){ session.cache=c; saveSession(session); writeCompat(); }
  }
  onBody(function(){
    document.documentElement.classList.toggle('pe2-admin', isAdmin());
    if(d==='ok'){
      closeGate();
      document.documentElement.classList.remove('pe2-wait');
      revealed=true;
      renderNav();
      fireReady();
    } else {
      showGate(d);
    }
  });
}

/* =========================================================================
   UI: общий слой, тосты, модалки
   ========================================================================= */
var layer=null;
function ensureLayer(){
  if(layer && document.body.contains(layer)) return layer;
  layer=document.createElement('div'); layer.id='pe2-layer'; document.body.appendChild(layer);
  return layer;
}
function toast(msg, kind){
  onBody(function(){
    var box=$('#pe2-toasts'); if(!box){ box=document.createElement('div'); box.id='pe2-toasts'; document.body.appendChild(box); }
    var t=document.createElement('div'); t.className='pe2-toast'+(kind?' '+kind:''); t.textContent=msg; box.appendChild(t);
    setTimeout(function(){ t.classList.add('out'); setTimeout(function(){ t.remove(); }, 300); }, 4200);
  });
}
function modal(html, opts){
  opts=opts||{};
  var back=document.createElement('div'); back.className='pe2-modal-back';
  back.innerHTML='<div class="pe2-modal'+(opts.wide?' wide':'')+'" role="dialog" aria-modal="true">'+html+'</div>';
  document.body.appendChild(back);
  function close(){ back.remove(); document.removeEventListener('keydown', key, true); if(opts.onClose) opts.onClose(); }
  function key(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); } }
  document.addEventListener('keydown', key, true);
  back.addEventListener('mousedown', function(e){ if(e.target===back && !opts.sticky) close(); });
  back.addEventListener('click', function(e){ if(e.target.closest('[data-pe2-close]')) close(); });
  var f=back.querySelector('[autofocus]'); if(f) setTimeout(function(){ f.focus(); }, 30);
  return { el:back, close:close };
}
function confirmBox(title, text, okLabel, danger){
  return new Promise(function(res){
    var m=modal('<h2>'+esc(title)+'</h2><p class="pe2-muted">'+esc(text)+'</p><div class="pe2-actions"><button class="pe2-btn" data-pe2-close>Отмена</button><button class="pe2-btn '+(danger?'danger':'primary')+'" data-ok>'+esc(okLabel||'Да')+'</button></div>', { onClose:function(){ res(false); } });
    m.el.querySelector('[data-ok]').onclick=function(){ m.el.remove(); res(true); };
  });
}
var ICON={
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6"/>',
  camera:'<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  shield:'<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  out:'<path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  home:'<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>'
};
function I(name, size){ size=size||16; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(ICON[name]||'')+'</svg>'; }

/* =========================================================================
   Экран входа / регистрации / гостя / ожидания
   ========================================================================= */
var gateEl=null;
function closeGate(){ if(gateEl){ gateEl.remove(); gateEl=null; } document.documentElement.classList.remove('pe2-gated'); }
function gateShell(inner, wide){
  return '<div class="pe2-gate-box'+(wide?' wide':'')+'">'+
    '<img class="pe2-gate-logo" src="assets/logo-full-ondark.png" alt="Prime Era">'+
    '<div class="pe2-gate-sub">ecosystem'+(CFG.MODE!=='live'?' · <b style="color:#FFB020">тест: '+esc(CFG.MODE)+'</b>':'')+'</div>'+inner+'</div>';
}
function showGate(kind, view){
  document.documentElement.classList.add('pe2-gated');
  document.documentElement.classList.remove('pe2-wait');
  if(!gateEl){ gateEl=document.createElement('div'); gateEl.className='pe2-gate'; document.body.appendChild(gateEl); }
  if(!view && !gateView && /^#(register|guest|login)$/.test(location.hash)){ view=location.hash.slice(1); try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
  gateView = view || (kind==='gate' ? (gateView && /^(login|register|guest)$/.test(gateView) ? gateView : 'login') : kind);
  var h='';
  if(kind==='setup') h=setupHtml();
  else if(kind==='gate' && gateView==='register') h=registerHtml(false);
  else if(kind==='gate' && gateView==='guest') h=guestHtml();
  else if(kind==='gate') h=loginHtml();
  else if(kind==='pending') h=statusHtml('pending');
  else if(kind==='rejected') h=statusHtml('rejected');
  else if(kind==='blocked') h=statusHtml('blocked');
  else if(kind==='gone') h=statusHtml('gone');
  else if(kind==='changepass') h=changePassHtml();
  else if(kind==='denied') h=deniedHtml();
  else if(kind==='offline') h=gateShell('<h1 class="pe2-gate-h">Нет связи с сервером</h1><p class="pe2-gate-p">Не удалось загрузить список пользователей. Проверьте интернет и попробуйте ещё раз.</p><button class="pe2-btn primary block" data-retry>Повторить</button>');
  gateEl.innerHTML=h;
  gateEl.scrollTop=0;
  bindGate(kind);
  var f=gateEl.querySelector('[autofocus]'); if(f) setTimeout(function(){ f.focus(); }, 40);
}
function tabsHtml(active){
  return '<div class="pe2-gate-tabs"><button data-view="login" class="'+(active==='login'?'on':'')+'">Вход</button><button data-view="register" class="'+(active==='register'?'on':'')+'">Регистрация</button><button data-view="guest" class="'+(active==='guest'?'on':'')+'">Гость</button></div>';
}
function loginHtml(){
  return gateShell(tabsHtml('login')+
    (gateMsg?'<div class="pe2-note">'+esc(gateMsg)+'</div>':'')+
    '<form data-form="login" autocomplete="on">'+
    field('Логин','<input name="login" autocomplete="username" autocapitalize="off" spellcheck="false" required autofocus>')+
    field('Пароль','<input name="pass" type="password" autocomplete="current-password" required>')+
    '<div class="pe2-err" data-err></div>'+
    '<button class="pe2-btn primary block" type="submit">Войти</button></form>'+
    '<div class="pe2-gate-foot">Нет аккаунта? <a data-view="register">Зарегистрируйтесь</a> — владелец одобрит заявку. Или <a data-view="guest">зайдите гостем</a>.</div>');
}
function field(label, input, hint, cls){
  return '<label class="pe2-field'+(cls?' '+cls:'')+'"><span>'+label+'</span>'+input+(hint?'<small>'+hint+'</small>':'')+'</label>';
}
function profileFields(u, opts){
  opts=opts||{};
  u=u||{};
  return '<div class="pe2-av-pick">'+
      '<label class="pe2-av-drop" title="Загрузить фото">'+(u.avatar?'<img src="'+esc(u.avatar)+'" alt="">':'<span class="ph">'+I('camera',26)+'</span>')+'<input type="file" accept="image/*" data-avatar-input hidden></label>'+
      '<div class="pe2-av-side"><b>Фото профиля</b><span>Будет видно в задачах, комментариях и у коллег. После загрузки можно подвинуть и увеличить фото в круге.</span>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="pe2-btn sm" data-avatar-pick>Загрузить</button>'+
        '<button type="button" class="pe2-btn sm ghost" data-avatar-crop'+(u.avatar?'':' style="display:none"')+'>Кадрировать</button>'+
        '<button type="button" class="pe2-btn sm ghost" data-avatar-clear'+(u.avatar?'':' style="display:none"')+'>Убрать</button></div></div>'+
      '<input type="hidden" name="avatar" value="'+esc(u.avatar||'')+'"></div>'+
    '<div class="pe2-grid2">'+
      field('Имя *','<input name="first" required maxlength="40" value="'+esc(u.first||'')+'"'+(opts.focusFirst?' autofocus':'')+'>')+
      field('Фамилия *','<input name="last" required maxlength="60" value="'+esc(u.last||'')+'">')+
    '</div>'+
    '<div class="pe2-grid2">'+
      field('Должность','<input name="position" maxlength="60" list="pe2-positions" placeholder="Например, дизайнер" value="'+esc(u.position||'')+'"><datalist id="pe2-positions"><option>Руководитель</option><option>Менеджер проектов</option><option>Дизайнер</option><option>Верстальщик</option><option>Менеджер по продажам</option><option>Бухгалтерия</option></datalist>')+
      field('Пол','<select name="gender"><option value="m"'+(u.gender!=='f'?' selected':'')+'>Мужской</option><option value="f"'+(u.gender==='f'?' selected':'')+'>Женский</option></select>', 'Для формулировок в скриптах: «понял / поняла»')+
    '</div>'+
    '<div class="pe2-grid2">'+
      field('Телефон или Telegram'+(opts.contactRequired?' *':''),'<input name="contact" maxlength="80" placeholder="+7… или @ник" value="'+esc(u.contact||'')+'"'+(opts.contactRequired?' required':'')+'>')+
      field('Email','<input name="email" type="email" maxlength="80" value="'+esc(u.email||'')+'">')+
    '</div>'+
    field('Дата рождения','<input name="birthday" type="date" value="'+esc(u.birthday||'')+'">', null, 'pe2-half');
}
function readProfile(form){
  function v(n){ var el=form.querySelector('[name="'+n+'"]'); return el ? String(el.value||'').trim() : ''; }
  return { first:v('first'), last:v('last'), position:v('position'), gender:v('gender')||'m', contact:v('contact'), email:v('email'), birthday:v('birthday'), avatar:v('avatar') };
}
function modulesChecklist(name, selected, onlyIds){
  var list=MODULES.filter(function(m){ return modConf(m.id).enabled && (!onlyIds || onlyIds.indexOf(m.id)>=0); });
  if(!list.length) return '<div class="pe2-muted">Все модули уже доступны.</div>';
  return '<div class="pe2-mod-checks">'+list.map(function(m){
    return '<label class="pe2-check"><input type="checkbox" name="'+name+'" value="'+m.id+'"'+(selected&&selected[m.id]?' checked':'')+'><span class="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+m.icon+'</svg></span><span><b>'+esc(m.name)+'</b><small>'+esc(m.desc)+'</small></span></label>';
  }).join('')+'</div>';
}
function registerHtml(){
  var def={}; MODULES.forEach(function(m){ if(modConf(m.id).byDefault) def[m.id]=true; });
  return gateShell(tabsHtml('register')+
    '<p class="pe2-gate-p">После регистрации заявка уйдёт владельцу. Как только он её одобрит и откроет нужные модули — вы сразу попадёте внутрь.</p>'+
    '<form data-form="register" autocomplete="off">'+profileFields({}, { focusFirst:true, contactRequired:true })+
    '<div class="pe2-sep"></div>'+
    '<div class="pe2-grid2">'+
      field('Логин *','<input name="login" required autocapitalize="off" spellcheck="false" maxlength="32" autocomplete="username">','3–32 символа: буквы, цифры, _ и -')+
      field('Пароль *','<input name="pass" type="password" required minlength="6" autocomplete="new-password">','Не меньше 6 символов')+
    '</div>'+
    field('Повторите пароль *','<input name="pass2" type="password" required autocomplete="new-password">', null, 'pe2-half')+
    '<div class="pe2-sep"></div><div class="pe2-label">К чему нужен доступ</div>'+modulesChecklist('mods', def)+
    field('Комментарий для владельца','<textarea name="comment" rows="2" maxlength="400" placeholder="Например: новый дизайнер, выхожу с понедельника"></textarea>')+
    '<div class="pe2-err" data-err></div>'+
    '<button class="pe2-btn primary block" type="submit">Отправить заявку</button></form>', true);
}
function setupHtml(){
  return gateShell('<h1 class="pe2-gate-h">Первый запуск</h1><p class="pe2-gate-p">Экосистема v2 ещё пустая. Создайте аккаунт <b>владельца</b> — у него будут все права: одобрять заявки, выдавать доступ к модулям, добавлять людей.</p>'+
    '<form data-form="setup" autocomplete="off">'+profileFields({}, { focusFirst:true })+
    '<div class="pe2-sep"></div>'+
    '<div class="pe2-grid2">'+
      field('Логин *','<input name="login" required autocapitalize="off" spellcheck="false" maxlength="32">','3–32 символа: буквы, цифры, _ и -')+
      field('Пароль *','<input name="pass" type="password" required minlength="6" autocomplete="new-password">','Не меньше 6 символов')+
    '</div>'+
    field('Повторите пароль *','<input name="pass2" type="password" required autocomplete="new-password">', null, 'pe2-half')+
    field('Кем вы были в экосистеме v1','<select name="legacy"><option value="">— никем / не переносить —</option>'+LEGACY_NAMES.map(function(n){ return '<option'+(n==='Саша'?' selected':'')+'>'+n+'</option>'; }).join('')+'</select>','Ваши личные данные из v1 (прогресс, настройки) подтянутся при первом входе', 'pe2-half')+
    '<div class="pe2-err" data-err></div>'+
    '<button class="pe2-btn primary block" type="submit">Создать аккаунт владельца</button></form>', true);
}
function guestHtml(){
  var open=MODULES.filter(function(m){ return modConf(m.id).enabled && modConf(m.id).guest; });
  return gateShell(tabsHtml('guest')+
    '<p class="pe2-gate-p">Гость видит каталог инструментов'+(open.length?' и открытые для гостей модули ('+open.map(function(m){ return '«'+esc(m.name)+'»'; }).join(', ')+')':'')+'. К остальному можно запросить доступ — владелец рассмотрит заявку.</p>'+
    '<form data-form="guest">'+field('Как к вам обращаться','<input name="name" maxlength="40" placeholder="Необязательно" autofocus>')+
    '<button class="pe2-btn primary block" type="submit">Войти как гость</button></form>'+
    '<div class="pe2-gate-foot">Работаете в студии? <a data-view="register">Зарегистрируйтесь</a> — появятся аватарка, задачи и личный прогресс.</div>');
}
function statusHtml(kind){
  var u=R.me();
  var h='';
  if(kind==='pending'){
    var req=u&&u.requested ? Object.keys(u.requested).filter(function(k){ return u.requested[k]; }).map(function(k){ var m=moduleById(k); return m?m.name:k; }) : [];
    h='<div class="pe2-status-av">'+avatar(u,72)+'<span class="pe2-status-dot wait">'+I('clock',14)+'</span></div>'+
      '<h1 class="pe2-gate-h">Заявка на рассмотрении</h1>'+
      '<p class="pe2-gate-p">'+esc(u?fullName(u):'')+', владелец получил вашу заявку'+(req.length?' на доступ к: <b>'+esc(req.join(', '))+'</b>':'')+'. Эта страница обновится сама, как только её одобрят.</p>'+
      '<div class="pe2-actions col"><button class="pe2-btn primary block" data-as-guest>Пока посмотреть как гость</button><button class="pe2-btn ghost block" data-logout>Выйти</button></div>';
  } else if(kind==='rejected'){
    h='<h1 class="pe2-gate-h">Заявка отклонена</h1><p class="pe2-gate-p">'+(u&&u.rejectReason?'Причина: '+esc(u.rejectReason)+'. ':'')+'Если это ошибка — свяжитесь с владельцем студии.</p>'+
      '<div class="pe2-actions col"><button class="pe2-btn block" data-as-guest>Войти как гость</button><button class="pe2-btn ghost block" data-logout>Выйти</button></div>';
  } else if(kind==='blocked'){
    h='<h1 class="pe2-gate-h">Доступ приостановлен</h1><p class="pe2-gate-p">Владелец заблокировал этот аккаунт'+(u&&u.blockReason?': '+esc(u.blockReason):'')+'. Данные сохранены — после разблокировки всё вернётся.</p>'+
      '<button class="pe2-btn ghost block" data-logout>Выйти</button>';
  } else {
    h='<h1 class="pe2-gate-h">Аккаунт не найден</h1><p class="pe2-gate-p">Похоже, аккаунт удалён. Войдите заново или зарегистрируйтесь.</p><button class="pe2-btn primary block" data-logout>К экрану входа</button>';
  }
  return gateShell(h);
}
function changePassHtml(){
  return gateShell('<h1 class="pe2-gate-h">Придумайте свой пароль</h1><p class="pe2-gate-p">Вам выдали временный пароль. Задайте постоянный — его будете знать только вы.</p>'+
    '<form data-form="changepass">'+field('Новый пароль','<input name="pass" type="password" required minlength="6" autocomplete="new-password" autofocus>','Не меньше 6 символов')+
    field('Повторите','<input name="pass2" type="password" required autocomplete="new-password">')+
    '<div class="pe2-err" data-err></div><button class="pe2-btn primary block" type="submit">Сохранить и войти</button></form>'+
    '<div class="pe2-gate-foot"><a data-logout>Выйти</a></div>');
}
function myOpenRequest(moduleId){
  var u=R.me();
  if(u && u.requests) return Object.keys(u.requests).some(function(k){ var r=u.requests[k]; return r && r.status==='new' && r.modules && r.modules.indexOf(moduleId)>=0; });
  if(session && session.guest){ var g=njson('pe2_guestreqs_'+NS, []); return g.some(function(r){ return r.status==='new' && r.modules.indexOf(moduleId)>=0; }); }
  return false;
}
function deniedHtml(){
  var m=moduleById(MODULE), name=m?m.name:(MODULE==='admin'?'Админ-панель':MODULE);
  var disabled=m && !modConf(m.id).enabled;
  var sent=myOpenRequest(MODULE);
  return gateShell('<div class="pe2-lock">'+I('lock',30)+'</div><h1 class="pe2-gate-h">Нет доступа к «'+esc(name)+'»</h1>'+
    '<p class="pe2-gate-p">'+(disabled?'Модуль временно выключен владельцем.':MODULE==='admin'?'Эта страница только для владельца и администраторов.':sent?'Запрос уже отправлен — владелец его рассмотрит. Страница откроется сама, когда доступ выдадут.':'Попросите владельца открыть этот модуль — запрос уйдёт в админ-панель.')+'</p>'+
    '<div class="pe2-actions col">'+(!disabled && MODULE!=='admin' && !sent?'<button class="pe2-btn primary block" data-request="'+esc(MODULE)+'">Запросить доступ</button>':'')+
    '<a class="pe2-btn block" href="index.html">'+I('home',15)+' На главную</a></div>');
}

function formErr(form, msg){ var e=form.querySelector('[data-err]'); if(e){ e.textContent=msg; e.style.display=msg?'block':'none'; } }
function busy(form, on){ var b=form.querySelector('button[type="submit"]'); if(b){ b.disabled=on; b.classList.toggle('busy', on); } }

function bindAvatarPicker(root){
  var inp=root.querySelector('[data-avatar-input]'), hidden=root.querySelector('input[name="avatar"]');
  if(!inp) return;
  var drop=root.querySelector('.pe2-av-drop'), clr=root.querySelector('[data-avatar-clear]'), crop=root.querySelector('[data-avatar-crop]');
  var original=null;   /* исходник последней загрузки — чтобы перекадрировать без потери качества */
  function set(v){ hidden.value=v||''; drop.innerHTML=(v?'<img src="'+v+'" alt="">':'<span class="ph">'+I('camera',26)+'</span>'); drop.appendChild(inp); if(clr) clr.style.display=v?'':'none'; if(crop) crop.style.display=v?'':'none'; }
  function fromFile(f){
    readImageFile(f).then(function(src){ original=src; return openAvatarCropper(src); })
      .then(function(v){ if(v) set(v); }, function(e){ toast(e.message, 'err'); });
  }
  inp.addEventListener('change', function(){ var f=inp.files[0]; if(f) fromFile(f); inp.value=''; });
  var pick=root.querySelector('[data-avatar-pick]'); if(pick) pick.onclick=function(){ inp.click(); };
  if(clr) clr.onclick=function(){ original=null; set(''); };
  if(crop) crop.onclick=function(){ var src=original||hidden.value; if(src) openAvatarCropper(src).then(function(v){ if(v) set(v); }); };
  drop.addEventListener('dragover', function(e){ e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', function(){ drop.classList.remove('over'); });
  drop.addEventListener('drop', function(e){ e.preventDefault(); drop.classList.remove('over'); var f=e.dataTransfer.files[0]; if(f) fromFile(f); });
}

function bindGate(kind){
  var g=gateEl;
  bindAvatarPicker(g);
  g.onclick=function(e){
    var b;
    if((b=e.target.closest('[data-view]'))){ e.preventDefault(); gateMsg=''; showGate('gate', b.dataset.view); return; }
    if(e.target.closest('[data-logout]')){ e.preventDefault(); logout(); return; }
    if(e.target.closest('[data-as-guest]')){ enterGuest(''); return; }
    if(e.target.closest('[data-retry]')){ location.reload(); return; }
    if((b=e.target.closest('[data-request]'))){ requestAccess([b.dataset.request]); return; }
  };
  var form=g.querySelector('form'); if(!form) return;
  form.addEventListener('input', function(){ formErr(form, ''); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var t=form.dataset.form;
    if(t==='login') doLogin(form);
    else if(t==='register') doRegister(form, false);
    else if(t==='setup') doRegister(form, true);
    else if(t==='guest') enterGuest(form.querySelector('[name="name"]').value.trim());
    else if(t==='changepass') doChangePass(form);
  });
}

function finishLogin(uidv, user, tok){
  saveSession({ uid:uidv, tok:tok||null, at:Date.now(), cache:{ first:user.first, last:user.last, gender:user.gender, compat:compatName(user), role:user.role } });
  var jobs=[fb('PATCH', 'users/'+uidv, { lastLogin:Date.now(), lastSeen:Date.now() })];
  if(user.status==='active') jobs.push(fb('POST','audit',{ at:Date.now(), by:uidv, byName:fullName(user), action:'login', target:uidv, details:'' }));
  return Promise.all(jobs).catch(function(){}).then(function(){ location.reload(); });
}
/* вход через Firebase Authentication. Если учётки в Firebase ещё нет, но есть
   старый хеш пароля (аккаунты до перехода) — проверяем его, создаём учётку
   с тем же паролем и удаляем хеш из базы. */
function doLoginAuth(form, login, pass){
  var email;
  fb('GET', 'logins/'+encKey(login)).then(function(e){
    email=e || authEmail(login);
    return fbSignIn(email, pass).catch(function(err){
      if(!/EMAIL_NOT_FOUND|INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD/.test(err.code||'')) throw err;
      return fb('GET', 'auth/'+encKey(login)).then(function(a){
        if(!a || !a.hash || hashPass(pass, a.salt)!==a.hash) throw new Error('BAD');
        return fbSignUp(email, pass).catch(function(e2){ if(/EMAIL_EXISTS/.test(e2.code||'')) throw new Error('BAD'); throw e2; }).then(function(tok){
          saveSession({ tok:tok, at:Date.now() });
          return fb('PUT', 'uidmap/'+tok.fbUid, a.uid)
            .then(function(){ return e ? null : fb('PUT', 'logins/'+encKey(login), email); })
            .then(function(){ return fb('PATCH', 'users/'+a.uid, { authUid:tok.fbUid }); })
            .then(function(){ return fb('DELETE', 'auth/'+encKey(login)); })
            .then(function(){ return tok; });
        });
      });
    });
  }).then(function(tok){
    saveSession({ tok:tok, at:Date.now() });
    return fb('GET', 'uidmap/'+tok.fbUid).then(function(id){
      if(!id) throw new Error('NOUSER');
      return fb('GET', 'users/'+id).then(function(user){ if(!user) throw new Error('NOUSER'); return finishLogin(id, user, tok); });
    });
  }).catch(function(err){
    saveSession(null); busy(form, false);
    var m=err && (err.code||err.message) || '';
    formErr(form, /BAD|INVALID|EMAIL_NOT_FOUND/.test(m) ? 'Неверный логин или пароль'
      : /NOUSER/.test(m) ? 'Аккаунт не найден — возможно, он удалён'
      : /TOO_MANY_ATTEMPTS/.test(m) ? 'Слишком много попыток. Подождите пару минут.'
      : /USER_DISABLED/.test(m) ? 'Аккаунт отключён' : 'Нет связи с сервером. Попробуйте ещё раз.');
  });
}
function doLogin(form){
  var login=normLogin(form.login.value), pass=form.pass.value;
  if(!login || !pass) return formErr(form, 'Введите логин и пароль');
  busy(form, true);
  if(CFG.AUTH) return doLoginAuth(form, login, pass);
  fb('GET', 'auth/'+encKey(login)).then(function(a){
    if(!a || !a.hash || hashPass(pass, a.salt)!==a.hash){ busy(form, false); return formErr(form, 'Неверный логин или пароль'); }
    var u=R.users[a.uid];
    var p = u ? Promise.resolve(u) : fb('GET', 'users/'+a.uid);
    return p.then(function(user){
      if(!user){ busy(form,false); return formErr(form, 'Аккаунт не найден — возможно, он удалён'); }
      return finishLogin(a.uid, user, null);
    });
  }).catch(function(){ busy(form, false); formErr(form, 'Нет связи с сервером. Попробуйте ещё раз.'); });
}

function doRegister(form, isSetup){
  var p=readProfile(form), login=normLogin(form.login.value), pass=form.pass.value, pass2=form.pass2.value;
  if(!p.first || !p.last) return formErr(form, 'Укажите имя и фамилию');
  if(!isSetup && !p.contact) return formErr(form, 'Оставьте телефон или Telegram — владелец свяжется при необходимости');
  if(!validLogin(login)) return formErr(form, 'Логин: 3–32 символа, только буквы, цифры, _ и -');
  if(pass.length<6) return formErr(form, 'Пароль — минимум 6 символов');
  if(pass!==pass2) return formErr(form, 'Пароли не совпадают');
  var id=uid('u'), salt=makeSalt();
  var requested={};
  $$('input[name="mods"]:checked', form).forEach(function(c){ requested[c.value]=true; });
  var comment=form.comment ? form.comment.value.trim() : '';
  var n=Object.keys(R.users).length;
  var user=Object.assign(p, {
    id:id, login:login, color:COLORS[n % COLORS.length], role:isSetup?'owner':'member', status:isSetup?'active':'pending',
    access:{}, requested:requested, comment:comment, createdAt:Date.now(), lastSeen:Date.now(), lastLogin:Date.now()
  });
  if(isSetup){ user.approvedAt=Date.now(); user.approvedBy=id; user.legacyName=form.legacy.value||''; }
  busy(form, true);
  if(CFG.AUTH) return doRegisterAuth(form, isSetup, id, login, pass, user);
  var chain = isSetup
    ? tx('meta', function(cur){ if(cur && cur.ownerUid) return undefined; return { ownerUid:id, createdAt:Date.now(), version:2 }; }).then(function(r){ if(!r.committed) throw new Error('Владелец уже создан — обновите страницу и войдите.'); })
    : Promise.resolve();
  chain.then(function(){
    return tx('auth/'+encKey(login), function(cur){ if(cur) return undefined; return { uid:id, salt:salt, hash:hashPass(pass, salt) }; });
  }).then(function(r){
    if(!r.committed) throw new Error('Такой логин уже занят — выберите другой');
    return fb('PUT', 'users/'+id, user);
  }).then(function(){
    return fb('POST', 'audit', { at:Date.now(), by:id, byName:fullName(user), action:isSetup?'setup':'register', target:id, details:isSetup?'Создан аккаунт владельца':'Заявка на регистрацию' }).catch(function(){});
  }).then(function(){
    saveSession({ uid:id, at:Date.now(), cache:{ first:user.first, last:user.last, gender:user.gender, compat:compatName(user), role:user.role } });
    location.reload();
  }).catch(function(err){ busy(form, false); formErr(form, err && err.message && !/^Firebase/.test(err.message) ? err.message : 'Нет связи с сервером. Попробуйте ещё раз.'); });
}

function doRegisterAuth(form, isSetup, id, login, pass, user){
  var acc;
  fb('GET', 'logins/'+encKey(login)).then(function(e){
    if(e) throw new Error('Такой логин уже занят — выберите другой');
    return createAccount(login, pass).catch(function(err){ if(/EMAIL_EXISTS/.test(err.code||'')) throw new Error('Такой логин уже занят — выберите другой'); throw err; });
  }).then(function(a){
    acc=a; user.authEmail=a.email; user.authUid=a.fbUid;
    saveSession({ tok:a.tok, at:Date.now() });
    if(!isSetup) return;
    return tx('meta', function(cur){ if(cur && cur.ownerUid) return undefined; return { ownerUid:id, createdAt:Date.now(), version:2 }; })
      .then(function(r){ if(!r.committed) throw new Error('Владелец уже создан — обновите страницу и войдите.'); });
  }).then(function(){ return fb('PUT', 'users/'+id, user); })
    .then(function(){ return fb('PUT', 'uidmap/'+acc.fbUid, id); })
    .then(function(){ return fb('PUT', 'logins/'+encKey(login), acc.email); })
    .then(function(){ return fb('POST', 'audit', { at:Date.now(), by:id, byName:fullName(user), action:isSetup?'setup':'register', target:id, details:isSetup?'Создан аккаунт владельца':'Заявка на регистрацию' }).catch(function(){}); })
    .then(function(){
      saveSession({ uid:id, tok:session.tok, at:Date.now(), cache:{ first:user.first, last:user.last, gender:user.gender, compat:compatName(user), role:user.role } });
      location.reload();
    }).catch(function(err){
      if(!acc) saveSession(null);
      busy(form, false);
      var m=err && err.message || '';
      formErr(form, m && !/^Firebase|AUTH/.test(m) && !/^[A-Z_]+/.test(m) ? m : /WEAK_PASSWORD/.test(m) ? 'Слишком простой пароль — минимум 6 символов' : 'Нет связи с сервером. Попробуйте ещё раз.');
    });
}

function doChangePass(form){
  var pass=form.pass.value, pass2=form.pass2.value, u=R.me();
  if(pass.length<6) return formErr(form, 'Пароль — минимум 6 символов');
  if(pass!==pass2) return formErr(form, 'Пароли не совпадают');
  busy(form, true);
  var salt=makeSalt();
  var first = CFG.AUTH
    ? ensureToken().then(function(t){ return fbUpdatePass(t, pass); }).then(function(tok){ session.tok=tok; saveSession(session); })
    : fb('PUT', 'auth/'+encKey(u.login), { uid:u.id, salt:salt, hash:hashPass(pass, salt) });
  first
    .then(function(){ return fb('PATCH', 'users/'+u.id, { mustChangePass:null }); })
    .then(function(){ u.mustChangePass=null; lastDecision=null; evaluate(); toast('Пароль сохранён'); })
    .catch(function(){ busy(form,false); formErr(form, 'Нет связи с сервером'); });
}

function enterGuest(name){
  saveSession({ guest:true, guestName:name||'', at:Date.now() });
  if(MODULE!=='home' && MODULE!=='admin' && !can(MODULE)) location.href='index.html';
  else location.reload();
}
function logout(){
  flushPush(true);
  saveSession(null); writeCompat();
  if(MODULE==='home') location.reload(); else location.href='index.html';
}

/* ---------- запрос доступа ---------- */
function requestAccess(preselect){
  var u=R.me(), isGuest=!!(session && session.guest);
  var locked=MODULES.filter(function(m){ return modConf(m.id).enabled && !can(m.id); }).map(function(m){ return m.id; });
  var sel={}; (preselect||[]).forEach(function(id){ sel[id]=true; });
  var mm=modal('<h2>Запрос доступа</h2><p class="pe2-muted">Заявка уйдёт владельцу в админ-панель. '+(isGuest?'Оставьте контакт, чтобы вам прислали логин и пароль.':'Когда её одобрят, модули откроются автоматически.')+'</p>'+
    '<form data-form="req">'+
    (isGuest?'<div class="pe2-grid2">'+field('Имя *','<input name="name" required maxlength="60" value="'+esc(session.guestName||'')+'" autofocus>')+field('Телефон или Telegram *','<input name="contact" required maxlength="80">')+'</div>':'')+
    '<div class="pe2-label">Модули</div>'+modulesChecklist('mods', sel, locked)+
    field('Зачем нужен доступ','<textarea name="comment" rows="2" maxlength="400" placeholder="Коротко, чтобы владельцу было проще решить"'+(isGuest?'':' autofocus')+'></textarea>')+
    '<div class="pe2-err" data-err></div>'+
    '<div class="pe2-actions"><button type="button" class="pe2-btn" data-pe2-close>Отмена</button><button type="submit" class="pe2-btn primary">Отправить запрос</button></div></form>', { wide:true });
  var form=mm.el.querySelector('form');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var mods=$$('input[name="mods"]:checked', form).map(function(c){ return c.value; });
    if(!mods.length) return formErr(form, 'Отметьте хотя бы один модуль');
    var req={ type:isGuest?'guest':'access', modules:mods, comment:form.comment.value.trim(), status:'new', at:Date.now() };
    if(isGuest){
      req.name=form.name.value.trim(); req.contact=form.contact.value.trim();
      if(!req.name || !req.contact) return formErr(form, 'Укажите имя и контакт');
    } else { req.uid=u.id; req.name=fullName(u); }
    busy(form, true);
    fb('POST', 'requests', req).then(function(r){
      var id=r && r.name;
      if(isGuest){
        var g=njson('pe2_guestreqs_'+NS, []); g.push({ id:id, modules:mods, status:'new', at:req.at }); nset('pe2_guestreqs_'+NS, JSON.stringify(g));
        return null;
      }
      u.requests=u.requests||{}; u.requests[id]={ modules:mods, status:'new', at:req.at };
      return fb('PATCH', 'users/'+u.id+'/requests', (function(){ var o={}; o[id]={ modules:mods, status:'new', at:req.at }; return o; })());
    }).then(function(){
      mm.close(); toast('Запрос отправлен владельцу');
      if(gateEl){ lastDecision=null; showGate(decide()); }
      if(typeof PE.onRequestSent==='function') PE.onRequestSent();
    }).catch(function(){ busy(form,false); formErr(form, 'Нет связи с сервером'); });
  });
}
/* статусы гостевых заявок — проверяем по одной (без чтения чужих) */
function refreshGuestRequests(){
  var g=njson('pe2_guestreqs_'+NS, []); if(!g.length) return Promise.resolve(g);
  return Promise.all(g.map(function(r){ return fb('GET', 'requests/'+r.id+'/status').then(function(s){ r.status=s||'gone'; }).catch(function(){}); }))
    .then(function(){ nset('pe2_guestreqs_'+NS, JSON.stringify(g)); return g; });
}

/* ---------- профиль ---------- */
function openProfile(){
  var u=R.me(); if(!u) return;
  var mm=modal('<h2>Мой профиль</h2><form data-form="profile">'+profileFields(u, {})+
    '<div class="pe2-sep"></div><div class="pe2-label">Смена пароля <span class="pe2-muted" style="font-weight:400;text-transform:none;letter-spacing:0">— необязательно</span></div>'+
    '<div class="pe2-grid2">'+field('Текущий пароль','<input name="oldpass" type="password" autocomplete="current-password">')+field('Новый пароль','<input name="newpass" type="password" minlength="6" autocomplete="new-password">')+'</div>'+
    '<div class="pe2-kv"><span>Логин</span><b>'+esc(u.login)+'</b><span>Роль</span><b>'+esc(ROLE_NAMES[u.role]||u.role)+'</b><span>В экосистеме с</span><b>'+esc(fmtDate(u.createdAt))+'</b></div>'+
    '<div class="pe2-err" data-err></div>'+
    '<div class="pe2-actions"><button type="button" class="pe2-btn ghost" data-logout-btn style="margin-right:auto">'+I('out',14)+' Выйти</button><button type="button" class="pe2-btn" data-pe2-close>Отмена</button><button type="submit" class="pe2-btn primary">Сохранить</button></div></form>', { wide:true });
  var form=mm.el.querySelector('form');
  bindAvatarPicker(mm.el);
  mm.el.querySelector('[data-logout-btn]').onclick=logout;
  form.addEventListener('input', function(){ formErr(form,''); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var p=readProfile(form);
    if(!p.first || !p.last) return formErr(form, 'Имя и фамилия обязательны');
    var oldp=form.oldpass.value, newp=form.newpass.value;
    if(newp && newp.length<6) return formErr(form, 'Новый пароль — минимум 6 символов');
    if(newp && !oldp) return formErr(form, 'Введите текущий пароль');
    busy(form, true);
    var chain=Promise.resolve();
    if(newp && CFG.AUTH){
      chain=fbSignIn(u.authEmail||authEmail(u.login), oldp).catch(function(){ throw new Error('Текущий пароль неверный'); })
        .then(function(tok){ return fbUpdatePass(tok.id, newp); }).then(function(tok){ session.tok=tok; saveSession(session); });
    } else if(newp){
      chain=fb('GET', 'auth/'+encKey(u.login)).then(function(a){
        if(!a || hashPass(oldp, a.salt)!==a.hash) throw new Error('Текущий пароль неверный');
        var salt=makeSalt(); return fb('PUT', 'auth/'+encKey(u.login), { uid:u.id, salt:salt, hash:hashPass(newp, salt) });
      });
    }
    chain.then(function(){ return fb('PATCH', 'users/'+u.id, p); }).then(function(){
      Object.assign(u, p); saveCache(); notifyUsers(); renderNav(); mm.close(); toast('Профиль сохранён');
    }).catch(function(err){ busy(form,false); formErr(form, err && err.message && !/^Firebase/.test(err.message) ? err.message : 'Нет связи с сервером'); });
  });
}

/* =========================================================================
   Навигация
   ========================================================================= */
var navEl=null;
function pendingCount(){
  if(!isAdmin()) return 0;
  var n=0;
  Object.keys(R.users).forEach(function(k){ if(R.users[k].status==='pending') n++; });
  Object.keys(R.requests||{}).forEach(function(k){ var r=R.requests[k]; if(r && r.status==='new') n++; });
  return n;
}
function renderNav(){
  if(NO_NAV || !revealed) return;
  onBody(function(){
    if(!navEl){
      navEl=document.createElement('header'); navEl.className='pe2-nav';
      document.body.insertBefore(navEl, document.body.firstChild);
      document.documentElement.classList.add('pe2-has-nav');
    }
    var u=R.me(), guest=session && session.guest;
    var links=MODULES.filter(function(m){ return can(m.id) && (modConf(m.id).enabled || isAdmin()); });
    var h='<a class="pe2-nav-logo" href="index.html" title="Главная экосистемы"><img src="assets/logo-full-ondark.png" alt="Prime Era"></a>'+
      '<nav class="pe2-nav-links"><a href="index.html" class="'+(MODULE==='home'?'on':'')+'">Главная</a>'+
      links.map(function(m){ return '<a href="'+m.href+'" class="'+(MODULE===m.id?'on':'')+'">'+esc(m.name)+'</a>'; }).join('')+'</nav>'+
      '<div class="pe2-nav-right">'+
      (CFG.MODE!=='live'?'<span class="pe2-testbadge" title="Данные идут не в рабочую базу">ТЕСТ · '+esc(CFG.MODE)+'</span>':'')+
      (isAdmin()?'<a class="pe2-nav-admin'+(MODULE==='admin'?' on':'')+'" href="admin.html" title="Админ-панель">'+I('shield',15)+'<span>Админка</span>'+(pendingCount()?'<b>'+pendingCount()+'</b>':'')+'</a>':'')+
      (u?'<button class="pe2-nav-user" data-pe2-user>'+avatar(u,28)+'<span>'+esc(shortName(u))+'</span></button>'
        : guest?'<button class="pe2-nav-user" data-pe2-user><span class="pe2-av" style="width:28px;height:28px;background:#3A3A3E">'+I('user',14)+'</span><span>Гость</span></button>':'')+
      '</div>';
    navEl.innerHTML=h;
    navEl.onclick=function(e){
      var b=e.target.closest('[data-pe2-user]'); if(!b) return;
      userMenu(b);
    };
  });
}
var menuEl=null;
function userMenu(anchor){
  if(menuEl){ menuEl.remove(); menuEl=null; return; }
  var u=R.me(), guest=session && session.guest;
  menuEl=document.createElement('div'); menuEl.className='pe2-menu';
  menuEl.innerHTML = u
    ? '<div class="pe2-menu-head">'+avatar(u,40)+'<div><b>'+esc(fullName(u))+'</b><span>'+esc(u.position||ROLE_NAMES[u.role]||'')+'</span></div></div>'+
      '<button data-a="profile">'+I('user',15)+'Мой профиль</button>'+
      (isAdmin()?'<a href="admin.html">'+I('shield',15)+'Админ-панель</a>':'')+
      '<button data-a="request">'+I('lock',15)+'Запросить доступ…</button>'+
      '<button data-a="logout" class="danger">'+I('out',15)+'Выйти</button>'
    : '<div class="pe2-menu-head"><span class="pe2-av" style="width:40px;height:40px;background:#3A3A3E">'+I('user',18)+'</span><div><b>Гость'+(guest&&session.guestName?' · '+esc(session.guestName):'')+'</b><span>Ограниченный просмотр</span></div></div>'+
      '<button data-a="request">'+I('lock',15)+'Запросить доступ…</button>'+
      '<button data-a="register">'+I('user',15)+'Зарегистрироваться</button>'+
      '<button data-a="login">'+I('out',15)+'Войти в аккаунт</button>';
  document.body.appendChild(menuEl);
  var r=anchor.getBoundingClientRect();
  menuEl.style.top=(r.bottom+8)+'px'; menuEl.style.right=Math.max(8, window.innerWidth-r.right)+'px';
  menuEl.onclick=function(e){
    var b=e.target.closest('[data-a]'); if(!b) return;
    var a=b.dataset.a; menuEl.remove(); menuEl=null;
    if(a==='profile') openProfile();
    else if(a==='logout') logout();
    else if(a==='request') requestAccess([]);
    else if(a==='register' || a==='login'){ saveSession(null); writeCompat(); gateView=a; lastDecision=null; showGate('gate', a); }
  };
  setTimeout(function(){
    document.addEventListener('mousedown', function h(e){ if(menuEl && !menuEl.contains(e.target) && !anchor.contains(e.target)){ menuEl.remove(); menuEl=null; } document.removeEventListener('mousedown', h); });
  }, 0);
}

/* =========================================================================
   Запуск
   ========================================================================= */
function notifyUsers(){ usersFns.forEach(function(fn){ try{ fn(R.users); }catch(e){ if(window.console) console.error(e); } }); }

document.documentElement.classList.add('pe2-wait');
(function injectFonts(){
  if(document.querySelector('link[href*="IBM+Plex+Sans"]')) return;
  var l=document.createElement('link'); l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';
  document.head.appendChild(l);
})();

var gotUsers=false, gotModules=false, gotMeta=false;
function maybeLoaded(){
  if(gotUsers && gotModules && gotMeta && !R.loaded){ R.loaded=true; }
  if(R.loaded){ saveCache(); evaluate(); }
}
function onUsersTree(tree){ R.users=tree||{}; gotUsers=true; maybeLoaded(); notifyUsers(); if(revealed) renderNav(); }
if(session && session.uid){
  /* список команды читают только активные; ожидающий или заблокированный видит свою запись */
  stream('users', onUsersTree, function(){
    stream('users/'+session.uid, function(tree){ var o={}; if(tree) o[session.uid]=tree; onUsersTree(o); }, function(){ onUsersTree({}); });
  });
} else {
  gotUsers=true;
}
/* браузер держит не больше 6 соединений на сервер, поэтому живых подписок
   минимум: пользователи (+ заявки у админа) и данные модуля. Настройки модулей
   и meta меняются редко — читаем их запросом и обновляем раз в минуту / при фокусе. */
function loadModulesMeta(){
  return Promise.all([fb('GET','modules'), fb('GET','meta')]).then(function(r){
    var changed=JSON.stringify(r[0]||{})!==JSON.stringify(R.modules);
    R.modules=r[0]||{}; R.meta=r[1]||null; gotModules=true; gotMeta=true; maybeLoaded();
    if(changed && revealed){ renderNav(); notifyUsers(); }
  }).catch(function(){});
}
loadModulesMeta();
setInterval(loadModulesMeta, 60000);
window.addEventListener('focus', loadModulesMeta);

var adminStream=null;
function watchRequests(force){
  if(adminStream || (!force && !isAdmin())) return;
  adminStream=stream('requests', function(tree){ R.requests=tree||{}; R.requestsLoaded=true; if(isAdmin()) saveCache(); renderNav(); usersFns.forEach(function(fn){ try{ fn(R.users); }catch(e){} }); });
}
/* админ по прошлому входу — заявки начинаем грузить сразу, не дожидаясь проверки */
if(session && session.cache && (session.cache.role==='owner' || session.cache.role==='admin')) watchRequests(true);

/* быстрый старт из кэша: если по кэшу всё ок — показываем страницу сразу,
   а сеть потом подтвердит (или закроет доступ, если его отозвали) */
if(R.meta && R.meta.ownerUid && decide()==='ok'){ evaluate(); }
/* нет сети и нет кэша — через 8 секунд честно говорим об этом */
setTimeout(function(){ if(!R.loaded && !revealed){ onBody(function(){ showGate('offline'); }); } }, 8000);

readyFns.push(function(){
  var u=R.me();
  if(u){
    watchRequests();
    if(!u.lastSeen || Date.now()-u.lastSeen>5*60000) fb('PATCH', 'users/'+u.id, { lastSeen:Date.now() }).catch(function(){});
    var guard='pe2_pulled_'+NS+'_'+u.id+'_'+MODULE;
    var already=false; try{ already=sessionStorage.getItem(guard)==='1'; }catch(e){}
    Promise.all([migrateLegacy(u), pullState()]).then(function(r){
      if((r[0]||r[1]) && !already){ try{ sessionStorage.setItem(guard,'1'); }catch(e){} location.reload(); }
      else { try{ sessionStorage.setItem(guard,'1'); }catch(e){} }
    });
  }
});
window.addEventListener('focus', function(){ if(session && session.guest) refreshGuestRequests(); });

/* =========================================================================
   Публичный API
   ========================================================================= */
var PE = window.PE = {
  CFG:CFG, MODULES:MODULES, MODULE:MODULE, LEGACY_NAMES:LEGACY_NAMES, COLORS:COLORS, ROLE_NAMES:ROLE_NAMES, STATUS_NAMES:STATUS_NAMES,
  fb:fb, tx:tx, stream:stream, audit:audit, encKey:encKey, decKey:decKey,
  get user(){ return R.me(); },
  get session(){ return session; },
  get isGuest(){ return !!(session && session.guest); },
  get users(){ return R.users; },
  get requests(){ return R.requests; },
  get requestsLoaded(){ return R.requestsLoaded; },
  get modules(){ return R.modules; },
  get meta(){ return R.meta; },
  userById:userById, team:team, fullName:fullName, shortName:shortName, initials:initials, avatar:avatar,
  isAdmin:isAdmin, isOwner:isOwner, can:can, modConf:modConf, moduleById:moduleById,
  onReady:function(fn){ if(fired) fn(PE); else readyFns.push(fn); },
  onUsers:function(fn){ usersFns.push(fn); },
  toast:toast, modal:modal, confirm:confirmBox, esc:esc, uid:uid, fmtDate:fmtDate, relTime:relTime, icon:I,
  requestAccess:requestAccess, refreshGuestRequests:refreshGuestRequests, openProfile:openProfile, logout:logout,
  hashPass:hashPass, makeSalt:makeSalt, genPassword:genPassword, normLogin:normLogin, validLogin:validLogin,
  loginTaken:loginTaken, setCredentials:setCredentials, removeCredentials:removeCredentials, authEmail:authEmail,
  processAvatar:processAvatar, bindAvatarPicker:bindAvatarPicker, profileFields:profileFields, readProfile:readProfile,
  field:field, modulesChecklist:modulesChecklist, compatName:compatName, sha256:sha256,
  guestRequests:function(){ return njson('pe2_guestreqs_'+NS, []); },
  myOpenRequest:myOpenRequest, pendingCount:pendingCount, renderNav:renderNav
};
})();
