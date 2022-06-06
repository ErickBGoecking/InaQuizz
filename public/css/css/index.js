var Nav = (function() {
  
    var
        nav 		= $('.css-tab'),
      section = $('.section'),
      link		= nav.find('.css-tab__link'),
      navH		= nav.innerHeight(),
      isOpen 	= true,
      hasT 		= false;
    
    var toggleNav = function() {
      nav.toggleClass('css-tab--active');
      shiftPage();
    };
    
    
    var switchPage = function(e) {
      var self = $(this);
      var i = self.parents('.css-tab__item').index();
      var s = section.eq(i);
      var a = $('section.section--active');
      var t = $(e.target);
      
      if (!hasT) {
        if (i == a.index()) {
          return false;
        }
        a
        .addClass('section--hidden')
        .removeClass('section--active');
  
        s.addClass('section--active');
  
        hasT = true;
  
        a.on('transitionend webkitTransitionend', function() {
          $(this).removeClass('section--hidden');
          hasT = false;
          a.off('transitionend webkitTransitionend');
        });
      }
  
      return false;
    };
    
    var keyNav = function(e) {
      var a = $('section.section--active');
      var aNext = a.next();
      var aPrev = a.prev();
      var i = a.index();
      
      
      if (!hasT) {
        if (e.keyCode === 37) {
        
          if (aPrev.length === 0) {
            aPrev = section.last();
          }
  
          hasT = true;
  
          aPrev.addClass('section--active');
          a
            .addClass('section--hidden')
            .removeClass('section--active');
  
          a.on('transitionend webkitTransitionend', function() {
            a.removeClass('section--hidden');
            hasT = false;
            a.off('transitionend webkitTransitionend');
          });
  
        } else if (e.keyCode === 39) {
  
          if (aNext.length === 0) {
            aNext = section.eq(0)
          } 
  
  
          aNext.addClass('section--active');
          a
            .addClass('section--hidden')
            .removeClass('section--active');
  
          hasT = true;
  
          aNext.on('transitionend webkitTransitionend', function() {
            a.removeClass('section--hidden');
            hasT = false;
            aNext.off('transitionend webkitTransitionend');
          });
  
        } else {
          return
        }
      }  
    };
      
    var bindActions = function() {
      link.on('click', switchPage);
      $(document).on('ready', function() {
         page.css({
          'transform': 'translateY(' + navH + 'px)',
           '-webkit-transform': 'translateY(' + navH + 'px)'
        });
      });
      $('body').on('keydown', keyNav);
    };
    
    var init = function() {
      bindActions();
    };
    
    return {
      init: init
    };
    
  }());
  
Nav.init();

const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
	container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
	container.classList.remove("right-panel-active");
});

//lets
let input = document.querySelectorAll(".input");
let reloadBtn = document.querySelector(".reload");
let color = document.querySelector(".stateColor");
let unlocked = false;
let pinSet = false;
let code = undefined;
let value = '';
//reload window.location.href = window.location.href;
reloadBtn.addEventListener('click', function() {
  window.location.href = window.location.href;
});
//main loop
for ( let i = 0; i < input.length; i++ ) {
  setInputFilter(input[i], function(value) {
    return /^\d*$/.test(value) && (value === "" || parseInt(value) <= 9);
  });
  input[i].addEventListener('input', function() {
    if ( unlocked ) { return }
    if ( input[i].value.length > 0 ) {
      input[i].value = input[i].value.slice(0, 1);
      if ( i < input.length - 1 ) {
        input[i + 1].focus();
      } else if ( i === input.length - 1 ) {
        if ( pinSet ) {
          computeCode();
          validateCode();
        } else {
          computeCode();
          setPin(value);
          pinSet = true;
          document.querySelector('.header').textContent = 'Try using your or other pins';
          clearInputs();
        }
      }
    }
  })
  input[i].addEventListener('keydown', function(e) {
    if ( unlocked ) { return }
    let key = e.which || e.keyCode || 0;
    if ( key === 8  ) {
      this.value = '';
      if ( (i - 1) < 0  ) { return }
      else {
        input[ i - 1 ].focus();
      }
    }
  });
}
//functions
function setPin(pin) {
  code = pin;
  value = '';
}
function computeCode() {
  for ( let i = 0; i < input.length; i++ ) {
    value += input[i].value;
  }
  value = Number(value);
}
function clearInputs() {
  for ( let i = 0; i < input.length; i++ ) {
    input[i].value = '';
  }
  input[0].focus();
}
function validateCode() {
  if ( code === value ) {
    unlocked = true;
  } else {
    animateCSS('.stateColor', 'shake');
    clearInputs();
    value = '';
  }
  if ( unlocked ) {
    color.classList.add('unlocked');
    setTimeout(showReload, 750);
  }
}
function showReload() {
  reloadBtn.classList.add('show');
}
//fast focus && reload btn listener
input[0].focus();
//filtering function *imported*
function setInputFilter(textbox, inputFilter) {
  ["input", "keydown", "keyup", "mousedown", "mouseup", "select", "contextmenu", "drop"].forEach(function(event) {
    textbox.addEventListener(event, function() {
      if (inputFilter(this.value)) {
        this.oldValue = this.value;
        this.oldSelectionStart = this.selectionStart;
        this.oldSelectionEnd = this.selectionEnd;
      } else if (this.hasOwnProperty("oldValue")) {
        this.value = this.oldValue;
        this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
      }
    });
  });
}
//some animate.css stuff
function animateCSS(element, animationName, callback) {
    const node = document.querySelector(element)
    node.classList.add('animated', animationName)

    function handleAnimationEnd() {
        node.classList.remove('animated', animationName)
        node.removeEventListener('animationend', handleAnimationEnd)

        if (typeof callback === 'function') callback()
    }

    node.addEventListener('animationend', handleAnimationEnd)
}