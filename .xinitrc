#!/bin/sh
#
# ~/.xinitrc
#
# Executed by startx (run your window manager from here)

export LANG=zh_CN.UTF-8
killall fcitx
killall stalonetray
fcitx &
volumeicon &

setxkbmap -option terminate:ctrl_alt_bksp

#exec fvwm
exec wmfs
#exec subtle
#exec /usr/bin/awesome
#exec i3




/usr/bin/synclient TouchpadOff=1
