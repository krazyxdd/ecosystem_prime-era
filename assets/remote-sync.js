/* Prime Era — память не только в браузере: данные каждого инструмента
   (кроме общих ключей входа) привязаны к вошедшему пользователю И
   синхронизируются через Firebase Realtime Database, а не хранятся только
   в localStorage одного устройства. Сам инструмент по-прежнему работает с
   обычным localStorage (getItem/setItem) — ничего в его коде менять не
   нужно: этот файл подменяет localStorage "под капотом" так же, как раньше
   user-scope.js, но вдобавок в фоне подтягивает и отправляет данные в облако.

   Как это работает на практике: локальная копия остаётся мгновенной (чтобы
   инструмент не тормозил), а в фоне идёт синхронизация. Если на этом
   устройстве уже открывали инструмент раньше, а на другом успели что-то
   изменить — при открытии страницы придут более свежие данные из облака и
   страница один раз сама перезагрузится, чтобы инструмент подхватил их. */
(function(){
  "use strict";
  if (!window.localStorage) return;

  var FIREBASE_URL = "https://prime-era-glossary-default-rtdb.firebaseio.com";
  var LOGIN_KEY = 'pe_logged_user';
  var GENDER_KEY = 'pe_manager_gender';
  var SHARED_KEYS = {};
  SHARED_KEYS[LOGIN_KEY] = true;
  SHARED_KEYS[GENDER_KEY] = true;

  var proto = Storage.prototype;
  var nativeGetItem = proto.getItem;
  var nativeSetItem = proto.setItem;
  var nativeRemoveItem = proto.removeItem;

  function rawUser(){
    try{ return nativeGetItem.call(localStorage, LOGIN_KEY) || ''; }catch(e){ return ''; }
  }
  function scopedKey(key){
    if (SHARED_KEYS[key]) return key;
    var u = rawUser();
    return u ? ('pe_u_' + u + '__' + key) : key;
  }

  var pending = {};
  var pushTimer = null;
  function remotePath(user){
    return FIREBASE_URL + '/ecosystem-state/' + encodeURIComponent(user) + '.json';
  }
  function queuePush(scopedK, val){
    var u = rawUser();
    if (!u) return;
    pending[scopedK] = (val === null) ? null : val;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function(){ flushPush(u); }, 700);
  }
  function flushPush(u){
    var patch = pending;
    pending = {};
    if (!Object.keys(patch).length) return;
    try{
      fetch(remotePath(u), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      }).catch(function(){});
    }catch(e){}
  }

  proto.getItem = function(key){
    if (this !== window.localStorage) return nativeGetItem.call(this, key);
    return nativeGetItem.call(this, scopedKey(key));
  };
  proto.setItem = function(key, val){
    if (this !== window.localStorage) return nativeSetItem.call(this, key, val);
    var sk = scopedKey(key);
    nativeSetItem.call(this, sk, val);
    queuePush(sk, val);
    return undefined;
  };
  proto.removeItem = function(key){
    if (this !== window.localStorage) return nativeRemoveItem.call(this, key);
    var sk = scopedKey(key);
    nativeRemoveItem.call(this, sk);
    queuePush(sk, null);
    return undefined;
  };

  /* при открытии страницы подтягиваем облачную копию данных этого
     пользователя; если она отличается от того, что лежит локально —
     обновляем localStorage и перезагружаем страницу один раз, чтобы
     инструмент прочитал уже актуальные данные */
  var user = rawUser();
  if (!user) return;

  var RELOAD_GUARD = 'pe_sync_reloaded__' + user;
  try{
    fetch(remotePath(user)).then(function(res){
      return res.ok ? res.json() : null;
    }).then(function(data){
      if (!data || typeof data !== 'object') return;
      var changed = false;
      Object.keys(data).forEach(function(k){
        var remoteVal = data[k];
        var localVal = nativeGetItem.call(localStorage, k);
        if (remoteVal === localVal) return;
        if (remoteVal === null){
          if (localVal !== null) { nativeRemoveItem.call(localStorage, k); changed = true; }
        } else if (typeof remoteVal === 'string') {
          nativeSetItem.call(localStorage, k, remoteVal);
          changed = true;
        }
      });
      if (changed) {
        var already = false;
        try{ already = sessionStorage.getItem(RELOAD_GUARD) === '1'; }catch(e){}
        if (!already) {
          try{ sessionStorage.setItem(RELOAD_GUARD, '1'); }catch(e){}
          location.reload();
        }
      }
    }).catch(function(){});
  }catch(e){}
})();
