/* Prime Era — единый вход в экосистему (кто сейчас пользуется инструментом).
   Вход один раз на устройстве: после входа пользователь внутри инструментов
   больше не переключается — просто показывается его имя в углу. Чтобы войти
   другим человеком на этом же устройстве, нужно выйти явно (ссылка "выйти"
   рядом с именем) — тогда снова откроется экран входа.
   На страницах, где такого экрана ещё нет в разметке, создаёт его сам,
   ничего не меняя в самом инструменте. При входе/выходе перезагружает
   страницу, чтобы инструмент заново прочитал уже свои, персональные данные. */
(function(){
  "use strict";

  var LOGIN_KEY = 'pe_logged_user';
  var GENDER_KEY = 'pe_manager_gender';
  var USERS_AUTH = {
    'Саша':   { pass: '1234', gender: 'male' },
    'Андрей': { pass: '1234', gender: 'male' },
    'Лина':   { pass: '1234', gender: 'female' },
    'Лиана':  { pass: '1234', gender: 'female' }
  };
  var USER_NAMES = Object.keys(USERS_AUTH);

  var GENDER_MAP = {
    'понял':'поняла','назвал':'назвала','отметил':'отметила','подготовил':'подготовила',
    'сталкивался':'сталкивалась','позвонил':'позвонила','сделал':'сделала','хотел':'хотела',
    'слышал':'слышала','подготовился':'подготовилась','связался':'связалась','рассчитал':'рассчитала',
    'посчитал':'посчитала','думал':'думала','отправлял':'отправляла','написал':'написала',
    'пометил':'пометила','согласен':'согласна','рад':'рада'
  };
  window.peGenderTransform = function(text){
    var gender;
    try{ gender = localStorage.getItem(GENDER_KEY); }catch(e){ gender = null; }
    if(gender !== 'female') return text;
    var result = text;
    Object.keys(GENDER_MAP).forEach(function(k){
      var re = new RegExp('(?<![а-яёА-ЯЁa-zA-Z0-9_])'+k+'(?![а-яёА-ЯЁa-zA-Z0-9_])','gi');
      result = result.replace(re, function(match){
        var repl = GENDER_MAP[k];
        if(match.charAt(0) === match.charAt(0).toUpperCase()){
          repl = repl.charAt(0).toUpperCase() + repl.slice(1);
        }
        return repl;
      });
    });
    return result;
  };

  function currentUser(){
    try{ return localStorage.getItem(LOGIN_KEY) || ''; }catch(e){ return ''; }
  }
  window.peCurrentUser = currentUser;

  function findUserCaseInsensitive(typed){
    var t = (typed || '').trim().toLowerCase();
    if(!t) return null;
    for(var i=0;i<USER_NAMES.length;i++){
      if(USER_NAMES[i].toLowerCase() === t) return USER_NAMES[i];
    }
    return null;
  }

  function buildGate(){
    var gate = document.createElement('div');
    gate.id = 'loginGate';
    gate.innerHTML =
      '<div class="login-box">' +
        '<img class="pe-login-logo" src="assets/logo-full-ondark.png" alt="Prime Era">' +
        '<div class="login-subtitle">ecosystem</div>' +
        '<div class="login-field-wrap">' +
          '<label for="loginNameInput">Логин</label>' +
          '<div class="login-combo">' +
            '<input type="text" id="loginNameInput" placeholder="введите имя" autocomplete="off">' +
            '<div class="login-suggest" id="loginSuggest"></div>' +
          '</div>' +
        '</div>' +
        '<div class="login-field-wrap">' +
          '<label for="loginPassInput">Пароль</label>' +
          '<input type="password" id="loginPassInput" placeholder="пароль" autocomplete="off">' +
        '</div>' +
        '<button id="loginSubmitBtn" type="button">Войти</button>' +
        '<div class="login-error" id="loginError" style="display:none;">Неверный логин или пароль</div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(gate);
    return gate;
  }

  /* Полноценная навигация (index/glossary/objections/objections-raw) уже
     содержит логотип-ссылку на главную слева — туда просто добавляем подпись
     с именем. Инструменты без общей навигации (тайм-трекер, планировщик,
     база знаний) получают маленький плавающий блок кубик+имя в левом углу. */
  function buildIdentityLabel(){
    var fullNav = document.querySelector('.pe-nav-logo');
    if(fullNav){
      var label = document.createElement('span');
      label.className = 'pe-nav-userlabel';
      label.id = 'ubName';
      fullNav.parentNode.insertBefore(label, fullNav.nextSibling);
      return label;
    }
    var bar = document.createElement('div');
    bar.className = 'pe-float-bar';
    bar.innerHTML =
      '<a class="pe-float-home" href="index.html" title="Экосистема Prime Era"><img src="assets/logo-icon-ondark.png" alt=""></a>' +
      '<div class="user-badge pe-float-user">' +
        '<span class="ub-name" id="ubName">—</span>' +
      '</div>';
    document.body.appendChild(bar);
    // резервируем место под плавающий блок, чтобы он не перекрывал
    // собственную шапку/лого инструмента в левом верхнем углу
    document.body.classList.add('pe-has-float-bar');
    return bar.querySelector('#ubName');
  }

  function init(){
    var loginGate = document.getElementById('loginGate') || buildGate();
    var ubName = document.getElementById('ubName') || buildIdentityLabel();

    var loginNameInput = document.getElementById('loginNameInput');
    var loginSuggest = document.getElementById('loginSuggest');
    var loginPassWrap = document.getElementById('loginPassWrap'); // legacy markup fallback
    var loginPassInput = document.getElementById('loginPassInput');
    var loginSubmitBtn = document.getElementById('loginSubmitBtn');
    var loginError = document.getElementById('loginError');

    function renderSuggestions(filter){
      if(!loginSuggest) return;
      var f = (filter || '').trim().toLowerCase();
      var matches = USER_NAMES.filter(function(n){ return n.toLowerCase().indexOf(f) === 0; });
      if(!matches.length){ loginSuggest.classList.remove('show'); loginSuggest.innerHTML=''; return; }
      loginSuggest.innerHTML = matches.map(function(n){
        return '<div class="login-suggest-item" data-user="'+n+'">'+n+'</div>';
      }).join('');
      loginSuggest.classList.add('show');
    }
    function hideSuggestions(){
      if(loginSuggest){ loginSuggest.classList.remove('show'); }
    }

    if(loginNameInput){
      loginNameInput.addEventListener('focus', function(){ renderSuggestions(loginNameInput.value); });
      loginNameInput.addEventListener('input', function(){
        if(loginError) loginError.style.display = 'none';
        renderSuggestions(loginNameInput.value);
      });
      loginNameInput.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          hideSuggestions();
          if(loginPassInput) loginPassInput.focus();
        } else if(e.key === 'Escape'){
          hideSuggestions();
        }
      });
      document.addEventListener('click', function(e){
        if(e.target !== loginNameInput && (!loginSuggest || !loginSuggest.contains(e.target))){
          hideSuggestions();
        }
      });
    }
    if(loginSuggest){
      loginSuggest.addEventListener('click', function(e){
        var item = e.target.closest('.login-suggest-item');
        if(!item) return;
        loginNameInput.value = item.getAttribute('data-user');
        hideSuggestions();
        if(loginPassInput) loginPassInput.focus();
      });
    }

    function showError(msg){
      if(!loginError) return;
      if(msg) loginError.textContent = msg;
      loginError.style.display = 'block';
    }

    function submitLogin(){
      var typedName = loginNameInput ? loginNameInput.value : '';
      var user = findUserCaseInsensitive(typedName);
      var info = user ? USERS_AUTH[user] : null;
      if(info && loginPassInput && loginPassInput.value === info.pass){
        localStorage.setItem(LOGIN_KEY, user);
        localStorage.setItem(GENDER_KEY, info.gender);
        // страница перечитает уже персональные данные пользователя с нуля
        location.reload();
      } else {
        showError('Неверный логин или пароль');
      }
    }
    if(loginSubmitBtn) loginSubmitBtn.addEventListener('click', submitLogin);
    if(loginPassInput){
      loginPassInput.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){ submitLogin(); }
      });
      loginPassInput.addEventListener('input', function(){
        if(loginError) loginError.style.display = 'none';
      });
    }

    function openGate(){
      if(loginNameInput) loginNameInput.value = '';
      if(loginPassInput) loginPassInput.value = '';
      if(loginError) loginError.style.display = 'none';
      hideSuggestions();
      loginGate.classList.add('show');
    }
    function closeGate(){
      loginGate.classList.remove('show');
    }
    function logout(){
      try{ localStorage.removeItem(LOGIN_KEY); localStorage.removeItem(GENDER_KEY); }catch(e){}
      location.reload();
    }
    window.peLogout = logout;

    var saved = currentUser();
    if(saved && USERS_AUTH[saved]){
      if(ubName){
        ubName.innerHTML = '';
        var nameSpan = document.createElement('span');
        nameSpan.className = 'ub-name-text';
        nameSpan.textContent = saved;
        var outLink = document.createElement('a');
        outLink.href = '#';
        outLink.className = 'ub-logout';
        outLink.textContent = 'выйти';
        outLink.title = 'Выйти из аккаунта';
        outLink.addEventListener('click', function(e){ e.preventDefault(); logout(); });
        ubName.appendChild(nameSpan);
        ubName.appendChild(outLink);
      }
      closeGate();
      if(loginNameInput) loginNameInput.value = saved;
    } else {
      openGate();
      if(loginNameInput) loginNameInput.focus();
    }
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
