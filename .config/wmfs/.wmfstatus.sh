# ------------------------------------------------------
# file:     $HOME/.wmfstatus.sh
# author:   Ramon Solis - http://cyb3rpunk.wordpress.com
# modified: January 2011
# vim:fenc=utf-8:nu:ai:si:et:ts=4:sw=4:ft=sh:
# ------------------------------------------------------

# -----
# Paths
# -----
ICONPATH="$HOME/.wmfsicons/status/"

# -------------
# Defining VARS
# -------------
		DATE=$(date "+%H:%M")
		SDA4=$(df -h /home | tail -1 | awk -F' ' '{print $4}')
		SDA2=$(df -h / | tail -1 | awk -F' ' '{print $3}')
		
		MEM=$(free -t -m | grep '^Total:' | awk '{print $3}')
		

# ---------
# The print 
# ---------
wmfs -s "
	      
	\s[1300;12;#DCDCDC;$DATE]\ 		
      
        "
