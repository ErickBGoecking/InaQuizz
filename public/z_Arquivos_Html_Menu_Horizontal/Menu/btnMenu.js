const $menu = document.querySelector('.menu')
const $btnMenuOpen = document.querySelector('.btnMenu_open')
const $btnMenuClose = document.querySelector('.btnMenu_close')

$btnMenuOpen.addEventListener('click',function(){
    /*console.log('testes')*/
    $menu.classList.add('menu_open')
})

$btnMenuClose.addEventListener('click',function(){
    $menu.classList.remove('menu_open')
})