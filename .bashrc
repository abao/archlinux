
 
# Check for an interactive session
[ -z "$PS1" ] && return

alias ls='ls --color=auto'
PS1='\[\e[36m\][\u@\u]\e[31m\]\W\$ '

export XMODIFIERS="@im=fcitx" 
#export XIM=fcitx 
#export XIM_PROGRAM=fcitx
export QT_IM_MODULE=xim
export GTK_IM_MODULE=xim


alias pcup='sudo yaourt -Syu --aur'		# 同步并升级
alias pcin='sudo pacman -S'		# 安装指定的软件包
alias pcout='sudo pacman -Rns'		# 移除指定的软件包
alias pcfind='pacman -Ss'			# 查找软件包
alias lf='leafpad'
alias mix='alsamixer'
alias mt1='sudo mount /dev/sdb1 /mnt/usb '
alias mt2='sudo mount /dev/sdb2 /mnt/usb1'
alias mt3='sudo mount /dev/sdb3 /mnt/usb2'
alias mt4='sudo mount /dev/sdb4 /mnt/usb3'

alias umt1='sudo umount /dev/sdb1 /mnt/usb'
alias umt2='sudo umount /dev/sdb2 /mnt/usb1'
alias umt3='sudo umount /dev/sdb3 /mnt/usb2'
alias umt4='sudo umount /dev/sdb4 /mnt/usb3'

alias mydisk='sudo fdisk -l'
alias reboot='sudo reboot'
alias halt='sudo halt'
