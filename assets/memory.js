/* Prime Era — единый вход в экосистему (кто сейчас пользуется инструментом).
   Показывает выбор менеджера, если никто не вошёл; на страницах, где такой
   экран уже есть в разметке (Возражения, Глоссарий), просто подключается к
   нему, а там где его нет — создаёт сам, ничего не меняя в самом инструменте.
   При входе/смене пользователя перезагружает страницу, чтобы инструмент
   заново прочитал уже свои, персональные данные. */
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

  function buildGate(){
    var gate = document.createElement('div');
    gate.id = 'loginGate';
    gate.innerHTML =
      '<div class="login-box">' +
        '<img class="pe-login-logo" src="assets/logo-full-ondark.png" alt="Prime Era">' +
        '<div class="login-subtitle">ecosystem</div>' +
        '<div class="login-users">' +
          '<button class="login-user-btn" data-user="Саша" type="button">Саша</button>' +
          '<button class="login-user-btn" data-user="Андрей" type="button">Андрей</button>' +
          '<button class="login-user-btn" data-user="Лина" type="button">Лина</button>' +
          '<button class="login-user-btn" data-user="Лиана" type="button">Лиана</button>' +
        '</div>' +
        '<div class="login-pass-wrap" id="loginPassWrap">' +
          '<input type="password" id="loginPassInput" placeholder="пароль" autocomplete="off">' +
          '<button id="loginSubmitBtn" type="button">Войти</button>' +
        '</div>' +
        '<div class="login-error" id="loginError" style="display:none;">Неверный пароль</div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(gate);
    return gate;
  }

  function buildFloatBar(){
    var bar = document.createElement('div');
    bar.className = 'pe-float-bar';
    bar.innerHTML =
      '<a class="pe-float-home" href="index.html" title="Экосистема Prime Era"><img src="assets/logo-icon-ondark.png" alt=""></a>' +
      '<div class="user-badge pe-float-user" id="userBadge" title="Сменить пользователя">' +
        '<span class="ub-name" id="ubName">—</span>' +
        '<span class="ub-switch">сменить</span>' +
      '</div>';
    document.body.appendChild(bar);
  }

  function init(){
    var loginGate = document.getElementById('loginGate') || buildGate();
    if (!document.getElementById('userBadge')) buildFloatBar();

    var loginUserBtns = loginGate.querySelectorAll('.login-user-btn');
    var loginPassWrap = document.getElementById('loginPassWrap');
    var loginPassInput = document.getElementById('loginPassInput');
    var loginSubmitBtn = document.getElementById('loginSubmitBtn');
    var loginError = document.getElementById('loginError');
    var userBadge = document.getElementById('userBadge');
    var ubName = document.getElementById('ubName');
    var loginSelectedUser = null;

    function openGate(){
      loginSelectedUser = null;
      loginUserBtns.forEach(function(b){ b.classList.remove('active'); });
      if(loginPassWrap) loginPassWrap.classList.remove('show');
      if(loginError) loginError.style.display = 'none';
      if(loginPassInput) loginPassInput.value = '';
      loginGate.classList.add('show');
    }
    function closeGate(){
      loginGate.classList.remove('show');
    }

    loginUserBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        loginUserBtns.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        loginSelectedUser = btn.getAttribute('data-user');
        if(loginError) loginError.style.display = 'none';
        if(loginPassInput) loginPassInput.value = '';
        if(loginPassWrap) loginPassWrap.classList.add('show');
        if(loginPassInput) loginPassInput.focus();
      });
    });

    function submitLogin(){
      if(!loginSelectedUser) return;
      var info = USERS_AUTH[loginSelectedUser];
      if(info && loginPassInput && loginPassInput.value === info.pass){
        localStorage.setItem(LOGIN_KEY, loginSelectedUser);
        localStorage.setItem(GENDER_KEY, info.gender);
        // страница перечитает уже персональные данные пользователя с нуля
        location.reload();
      } else if(loginError){
        loginError.style.display = 'block';
      }
    }
    if(loginSubmitBtn) loginSubmitBtn.addEventListener('click', submitLogin);
    if(loginPassInput){
      loginPassInput.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){ submitLogin(); }
      });
    }
    if(userBadge){
      userBadge.addEventListener('click', function(){ openGate(); });
    }

    var saved = currentUser();
    if(saved && USERS_AUTH[saved]){
      if(ubName) ubName.textContent = saved;
      closeGate();
    } else {
      openGate();
    }
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
