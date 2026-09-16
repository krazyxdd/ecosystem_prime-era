/* Prime Era — разделяет localStorage инструмента по вошедшему менеджеру,
   чтобы у каждого (Саша/Андрей/Лина/Лиана) было своё отдельное состояние
   (время, задачи и т.п.), не трогая код самого инструмента: подменяет
   чтение/запись localStorage "под капотом" на ключи с именем пользователя.
   Подключать ДО скрипта самого инструмента. */
(function(){
  "use strict";
  if (!window.localStorage) return;

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

  proto.getItem = function(key){
    if (this !== window.localStorage) return nativeGetItem.call(this, key);
    return nativeGetItem.call(this, scopedKey(key));
  };
  proto.setItem = function(key, val){
    if (this !== window.localStorage) return nativeSetItem.call(this, key, val);
    return nativeSetItem.call(this, scopedKey(key), val);
  };
  proto.removeItem = function(key){
    if (this !== window.localStorage) return nativeRemoveItem.call(this, key);
    return nativeRemoveItem.call(this, scopedKey(key));
  };
})();
