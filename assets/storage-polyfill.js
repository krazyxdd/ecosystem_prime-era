/* Prime Era — совместимость с window.storage.
   Оргсхема написана под хостинг, который сам предоставляет window.storage
   (async get/set с сохранением состояния). На обычном статичном хостинге
   такого объекта нет — этот файл подключается ДО скрипта самого инструмента
   и добавляет window.storage сам, ничего не меняя в коде инструмента.
   Если хост когда-нибудь сам предоставит window.storage — полифилл не
   вмешивается и уступает ему дорогу.

   Память здесь не привязана к одному браузеру: и чтение, и запись в первую
   очередь идут в Firebase Realtime Database (тот же проект, что уже
   используется в Глоссарии), а localStorage — это только мгновенный
   локальный кэш и резерв на случай, если сеть недоступна. Оргсхема — общая
   для всех сотрудников (не делится по пользователям), поэтому все, кто
   входит в экосистему, видят и редактируют одну и ту же схему. */
(function(){
  "use strict";
  if (window.storage) return;

  var FIREBASE_URL = "https://prime-era-glossary-default-rtdb.firebaseio.com";

  function localGet(key){
    try{
      var v = localStorage.getItem(key);
      return (v === null || v === undefined) ? undefined : { value: v };
    }catch(e){ return undefined; }
  }
  function localSet(key, value){
    try{ localStorage.setItem(key, value); return true; }
    catch(e){ return false; }
  }
  function remoteUrl(key){
    return FIREBASE_URL + '/orgboard/' + encodeURIComponent(key) + '.json';
  }

  window.storage = {
    get: function(key){
      return fetch(remoteUrl(key)).then(function(res){
        if (!res.ok) throw new Error('bad status');
        return res.json();
      }).then(function(data){
        if (data === null || data === undefined) return localGet(key);
        if (typeof data === 'string') localSet(key, data);
        return { value: data };
      }).catch(function(){
        return localGet(key);
      });
    },
    set: function(key, value){
      localSet(key, value); // мгновенный локальный кэш — правка не теряется, даже если сеть моргнёт
      return fetch(remoteUrl(key), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value)
      }).then(function(res){ return res.ok; }).catch(function(){ return false; });
    }
  };
})();
