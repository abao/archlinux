"incremental and highlight search
set hlsearch incsearch

" syntax highlighting
"set bg=dark
syntax on
colorscheme desert

" set tabspace with 2 spaces
set ts=2
" set shiftwidth with 2 spaces
set sw=2
" set autointend for same position next line
set ai
set smarttab


" make tab in v mode ident code
vmap <tab> >gv
vmap <s-tab> <gv

" make tab in normal mode ident code
nmap <tab> I<tab><esc>
nmap <s-tab> ^i<bs><esc>

" cursorkeymapping
ino <Down> <C-O>gj
ino <Up> <C-O>gk
nno <Down> gj
nno <Up> gk

" shortcuts for tabbing
nmap tc :tabclose<CR>
nmap to :tabnew<CR>
nmap tn :tabnext<CR>
nmap tp :tabprev<CR>

" misc stuff on functionkeys
nno <F2> :set hls!<bar>set hls?<CR>
nno <F3> :syn clear<CR>
nno <F4> :syn on<CR>
nno <F5> :set nu!<bar>set nu?<CR>
nno <F6> :%!xxd<CR>
nno <F10> :%!xxd -r<CR>

" folding-options
set foldenable
set foldmethod=syntax
" set foldcolumn=4

" paste mode - this will avoid unexpected effects when you
" cut or copy some text from one window and paste it in Vim.
set pastetoggle=<F11>

set smartcase           " case-sensitive searching on upper-case letters
" set cursorline        " hilight the screen line of the cursor
" set cursorcolumn      " hilight the screen column of the cursor
filetype plugin on      " enable filetype detection
filetype indent on

" jump to the last position when reopeninig a file
if has("autocmd")
 au BufReadPost * if line("'\"") > 0 && line("'\"") <= line("$")
 \| exe "normal! g'\"" | endif
endif

" vim: set ft=vim :
